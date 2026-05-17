use lancedb::Connection;
use arrow_schema::{DataType, Field, Schema};
use std::sync::Arc;
use dirs::data_dir;

pub async fn init_db() -> lancedb::Result<Connection> {
    let app_dir = dirs::home_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join(".aipdf")
        .join("vectordb");
    
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).expect("Failed to create vector db directory");
    }

    let uri = app_dir.to_str().unwrap().to_string();
    lancedb::connect(&uri).execute().await
}

pub async fn init_document_table(conn: &Connection, vector_dim: i32) -> lancedb::Result<()> {
    let table_name = "document_chunks";
    
    let tables = conn.table_names().execute().await?;
    if tables.contains(&table_name.to_string()) {
        return Ok(());
    }

    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("doc_id", DataType::Utf8, false),
        Field::new("page_num", DataType::Int32, false),
        Field::new("text", DataType::Utf8, false),
        Field::new("vector", DataType::FixedSizeList(Arc::new(Field::new("item", DataType::Float32, true)), vector_dim), false),
    ]));

    conn.create_empty_table(table_name, schema).execute().await?;
    
    Ok(())
}
