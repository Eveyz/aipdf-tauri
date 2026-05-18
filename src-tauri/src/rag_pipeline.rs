use crate::state::AppState;
use arrow_array::builder::{FixedSizeListBuilder, Float32Builder, Int32Builder, StringBuilder};
use arrow_array::{Array, RecordBatch};
use arrow_schema::{DataType, Field, Schema};
use futures_util::StreamExt;
use lancedb::query::{ExecutableQuery, QueryBase};
use std::sync::Arc;
use tauri::State;
use text_splitter::{ChunkConfig, TextSplitter};
use uuid::Uuid;

fn ensure_hash_id(hash_id: &str) -> Result<(), String> {
    if hash_id.len() == 64 && hash_id.chars().all(|c| c.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("RAG doc_id must be the BLAKE3 hash_id, not a file path or file name".to_string())
    }
}

#[tauri::command]
pub async fn process_pdf_page(
    hash_id: String,
    page_num: i32,
    text_content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    ensure_hash_id(&hash_id)?;
    let doc_id = hash_id;
    println!(
        "[rag_pipeline] process_pdf_page called: doc_id={}, page_num={}, text_len={}",
        doc_id,
        page_num,
        text_content.len()
    );

    // 1. Deduplication: Query LanceDB
    let table = state
        .vector_db
        .open_table("document_chunks")
        .execute()
        .await
        .map_err(|e| {
            let err = format!("Failed to open table: {}", e);
            println!("[rag_pipeline] Error: {}", err);
            err
        })?;

    let query = format!("doc_id = '{}' AND page_num = {}", doc_id, page_num);
    let mut stream = table.query().only_if(query).execute().await.map_err(|e| {
        let err = format!("Failed to query DB: {}", e);
        println!("[rag_pipeline] Error: {}", err);
        err
    })?;

    if let Some(Ok(batch)) = stream.next().await {
        if batch.num_rows() > 0 {
            println!(
                "[rag_pipeline] Page {} already indexed for doc {}. Skipping.",
                page_num, doc_id
            );
            return Ok(());
        }
    }

    println!(
        "[rag_pipeline] Indexing page {} for doc {}...",
        page_num, doc_id
    );

    // 2. Chunking & 3. Embedding
    let mut embeddings: Vec<Vec<f32>> = Vec::new();
    let mut chunk_texts: Vec<String> = Vec::new();
    let mut vector_dim = 384;

    {
        let mut ai_state = state.ai.lock().unwrap();
        if let Some(engine) = &mut ai_state.embedding_engine {
            println!("[rag_pipeline] Embedding engine found. Starting chunking...");
            let tokenizer = engine.tokenizer.clone();

            let config = ChunkConfig::new(400)
                .with_sizer(tokenizer)
                .with_overlap(50)
                .map_err(|e| format!("Failed to create chunk config: {}", e))?;

            let splitter = TextSplitter::new(config);

            let chunks: Vec<_> = splitter.chunks(&text_content).collect();
            println!("[rag_pipeline] Split into {} chunks.", chunks.len());

            for chunk in chunks {
                let chunk_str = chunk.to_string();
                let embedding = engine.generate_embedding(&chunk_str).map_err(|e| {
                    println!("[rag_pipeline] Embedding generation failed: {}", e);
                    e
                })?;
                vector_dim = embedding.len() as i32;
                embeddings.push(embedding);
                chunk_texts.push(chunk_str);
            }
        } else {
            println!("[rag_pipeline] Error: Embedding engine not initialized");
            return Err("Embedding engine not initialized".to_string());
        }
    }

    if embeddings.is_empty() {
        println!(
            "[rag_pipeline] No chunks/embeddings generated for page {}.",
            page_num
        );
        return Ok(());
    }

    println!(
        "[rag_pipeline] Generated {} embeddings with dim {}. Storing in LanceDB...",
        embeddings.len(),
        vector_dim
    );

    // 4. Storage into LanceDB
    let mut id_builder = StringBuilder::new();
    let mut doc_id_builder = StringBuilder::new();
    let mut page_num_builder = Int32Builder::new();
    let mut text_builder = StringBuilder::new();

    let values_builder = Float32Builder::new();
    let mut vector_builder = FixedSizeListBuilder::new(values_builder, vector_dim);

    for (i, embedding) in embeddings.into_iter().enumerate() {
        id_builder.append_value(Uuid::new_v4().to_string());
        doc_id_builder.append_value(&doc_id);
        page_num_builder.append_value(page_num);
        text_builder.append_value(&chunk_texts[i]);

        vector_builder.values().append_slice(&embedding);
        vector_builder.append(true);
    }

    let id_array = Arc::new(id_builder.finish()) as Arc<dyn arrow_array::Array>;
    let doc_id_array = Arc::new(doc_id_builder.finish()) as Arc<dyn arrow_array::Array>;
    let page_num_array = Arc::new(page_num_builder.finish()) as Arc<dyn arrow_array::Array>;
    let text_array = Arc::new(text_builder.finish()) as Arc<dyn arrow_array::Array>;
    let vector_array = Arc::new(vector_builder.finish()) as Arc<dyn arrow_array::Array>;

    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("doc_id", DataType::Utf8, false),
        Field::new("page_num", DataType::Int32, false),
        Field::new("text", DataType::Utf8, false),
        Field::new(
            "vector",
            DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                vector_dim,
            ),
            false,
        ),
    ]));

    let batch = RecordBatch::try_new(
        schema.clone(),
        vec![
            id_array,
            doc_id_array,
            page_num_array,
            text_array,
            vector_array,
        ],
    )
    .map_err(|e| {
        let err = format!("Failed to create record batch: {}", e);
        println!("[rag_pipeline] Error: {}", err);
        err
    })?;

    table.add(vec![batch]).execute().await.map_err(|e| {
        let err = format!("Failed to insert into LanceDB: {}", e);
        println!("[rag_pipeline] Error: {}", err);
        err
    })?;

    println!(
        "[rag_pipeline] Successfully indexed page {} for doc {}.",
        page_num, doc_id
    );

    Ok(())
}

#[tauri::command]
pub async fn check_page_indexed(
    hash_id: String,
    page_num: i32,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    ensure_hash_id(&hash_id)?;
    let doc_id = hash_id;
    let table = state
        .vector_db
        .open_table("document_chunks")
        .execute()
        .await
        .map_err(|e| format!("Failed to open table: {}", e))?;

    let query = format!("doc_id = '{}' AND page_num = {}", doc_id, page_num);
    let mut stream = table
        .query()
        .only_if(query)
        .execute()
        .await
        .map_err(|e| format!("Failed to query DB: {}", e))?;

    if let Some(Ok(batch)) = stream.next().await {
        Ok(batch.num_rows() > 0)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn search_context(
    query: String,
    hash_id: String,
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    ensure_hash_id(&hash_id)?;
    let doc_id = hash_id;
    // 1. Generate embedding for query
    let query_vector = {
        let mut ai_state = state.ai.lock().unwrap();
        if let Some(engine) = &mut ai_state.embedding_engine {
            engine.generate_embedding(&query)?
        } else {
            return Err("Embedding engine not initialized".to_string());
        }
    };

    // 2. Execute ANN vector search
    let table = state
        .vector_db
        .open_table("document_chunks")
        .execute()
        .await
        .map_err(|e| format!("Failed to open table: {}", e))?;

    let filter_expr = format!("doc_id = '{}'", doc_id);

    let mut stream = table
        .query()
        .nearest_to(query_vector.as_slice())
        .map_err(|e| format!("Failed to setup vector query: {}", e))?
        .only_if(filter_expr)
        .limit(limit)
        .execute()
        .await
        .map_err(|e| format!("Failed to search DB: {}", e))?;

    let mut results = Vec::new();
    while let Some(Ok(batch)) = stream.next().await {
        if let Some(text_column) = batch.column_by_name("text") {
            let string_array = text_column
                .as_any()
                .downcast_ref::<arrow_array::StringArray>()
                .ok_or_else(|| "Failed to downcast text column".to_string())?;
            for i in 0..string_array.len() {
                if !string_array.is_null(i) {
                    results.push(string_array.value(i).to_string());
                }
            }
        }
    }

    Ok(results)
}
