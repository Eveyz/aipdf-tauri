use crate::commands::CommandError;
use crate::db::{DbMessage, DbSession};
use crate::models::registry::{self, ModelEntry};
use crate::state::AppState;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub model_type: String,
    pub has_tokenizer: bool,
    pub path: String,
}

#[derive(Serialize, Clone)]
pub struct TokenPayload {
    pub token: String,
    pub token_id: i64,
    pub is_final: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatContext {
    #[serde(rename = "type")]
    pub context_type: String,
    pub content: String,
    pub label: Option<String>,
    pub id: String,
}

#[derive(Serialize, Deserialize)]
pub struct CloudTestResult {
    pub ok: bool,
    pub message: String,
}

#[tauri::command]
pub async fn load_model(
    state: State<'_, AppState>,
    model_id: String,
) -> Result<ModelInfo, CommandError> {
    let entry =
        registry::get_model_info(&model_id).map_err(|e| CommandError::Model(e.to_string()))?;

    let session = crate::ai::session::AiSession::load(&entry.path)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    let tokenizer = crate::ai::tokenizer::AiTokenizer::load(&entry.path)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    let has_tokenizer = true;

    {
        let mut ai = state
            .ai
            .lock()
            .map_err(|e| CommandError::Ai(e.to_string()))?;
        ai.session = Some(session);
        ai.tokenizer = Some(tokenizer);
    }

    // Save as last used model in settings AND mark in models table
    state
        .db
        .set_setting("last_used_model_id", &model_id)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    // For local models, we ensure they exist in the models table first
    let config = json!({ "path": entry.path }).to_string();
    state
        .db
        .add_or_update_model(&entry.id, &entry.name, "local", &config)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    state
        .db
        .set_last_used_model(&model_id)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    Ok(ModelInfo {
        id: entry.id,
        name: entry.name,
        model_type: entry.model_type,
        has_tokenizer,
        path: entry.path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn load_embedding_model(
    state: State<'_, AppState>,
    model_id: String,
) -> Result<(), CommandError> {
    println!("[commands] Loading embedding model: {}", model_id);
    let entry = registry::get_model_info(&model_id).map_err(|e| {
        println!("[commands] Error finding model: {}", e);
        CommandError::Model(e.to_string())
    })?;

    let model_path = if entry.path.join("model.onnx").exists() {
        entry.path.join("model.onnx")
    } else {
        entry.path.join("onnx/model.onnx")
    };

    let tokenizer_path = entry.path.join("tokenizer.json");
    println!(
        "[commands] Paths: model={:?}, tokenizer={:?}",
        model_path, tokenizer_path
    );

    let engine =
        crate::embedding::EmbeddingEngine::new(&model_path, &tokenizer_path).map_err(|e| {
            println!("[commands] Error creating engine: {}", e);
            CommandError::Ai(e)
        })?;

    {
        let mut ai = state
            .ai
            .lock()
            .map_err(|e| CommandError::Ai(e.to_string()))?;
        ai.embedding_engine = Some(engine);
    }

    // Save as last used embedding model
    state
        .db
        .set_setting("last_used_embedding_model_id", &model_id)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    println!(
        "[commands] Embedding model {} loaded successfully.",
        model_id
    );

    Ok(())
}

#[tauri::command]
pub async fn get_embedding_engine_info(
    state: State<'_, AppState>,
) -> Result<Option<String>, CommandError> {
    let ai = state
        .ai
        .lock()
        .map_err(|e| CommandError::Ai(e.to_string()))?;
    if ai.embedding_engine.is_some() {
        // We don't store the ID in the engine itself yet, so we get it from settings
        let id = state
            .db
            .get_setting("last_used_embedding_model_id")
            .map_err(|e| CommandError::Ai(e.to_string()))?;
        Ok(id)
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn unload_embedding_model(state: State<'_, AppState>) -> Result<(), CommandError> {
    let mut ai = state
        .ai
        .lock()
        .map_err(|e| CommandError::Ai(e.to_string()))?;
    ai.embedding_engine = None;
    Ok(())
}

#[tauri::command]
pub async fn save_cloud_model(
    state: State<'_, AppState>,
    id: String,
    name: String,
    vendor: String,
    base_url: String,
    api_key: String,
    model_name: String,
) -> Result<(), CommandError> {
    let config = json!({
        "vendor": vendor,
        "baseUrl": base_url,
        "apiKey": api_key,
        "modelName": model_name,
    })
    .to_string();

    state
        .db
        .add_or_update_model(&id, &name, "cloud", &config)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn set_last_used_model(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), CommandError> {
    state
        .db
        .set_last_used_model(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    state
        .db
        .set_setting("last_used_model_id", &id)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn list_cloud_models(
    state: State<'_, AppState>,
) -> Result<Vec<crate::db::DbModel>, CommandError> {
    state
        .db
        .list_models(Some("cloud"))
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn delete_cloud_model_entry(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), CommandError> {
    state
        .db
        .delete_model_entry(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn unload_model(state: State<'_, AppState>) -> Result<(), CommandError> {
    let mut ai = state
        .ai
        .lock()
        .map_err(|e| CommandError::Ai(e.to_string()))?;
    ai.session = None;
    ai.tokenizer = None;
    Ok(())
}

#[tauri::command]
pub async fn generate(
    state: State<'_, AppState>,
    app: AppHandle,
    session_id: String,
    prompt: String,
    contexts: Option<Vec<ChatContext>>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
    persist: bool,
) -> Result<(), CommandError> {
    let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

    let contexts_json = contexts
        .as_ref()
        .map(|c| serde_json::to_string(c).unwrap_or_default());

    // Store user message if persist is true
    if persist {
        state
            .db
            .add_message(&session_id, "user", &prompt, contexts_json.as_deref())
            .map_err(|e| CommandError::Ai(e.to_string()))?;
    }

    {
        let mut ai = state
            .ai
            .lock()
            .map_err(|e| CommandError::Ai(e.to_string()))?;
        if ai.session.is_none() {
            return Err(CommandError::Ai("No model loaded".into()));
        }
        ai.is_generating = true;
        ai.cancel_flag = Some(cancel_flag.clone());
    }

    let _max_tokens = max_tokens.unwrap_or(512);
    let _temperature = temperature.unwrap_or(0.7);

    // Combine prompt and context for the model
    let context_text = if let Some(ref contexts) = contexts {
        contexts
            .iter()
            .map(|c| {
                if let Some(ref label) = c.label {
                    format!("{}:\n{}", label, c.content)
                } else {
                    c.content.clone()
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    } else {
        String::new()
    };

    let system_prompt = "You are a helpful AI assistant analyzing a PDF document. Always format your responses in clear, professional Markdown. Use headings, lists, and bold text where appropriate to make your answers easy to read. Output ONLY raw Markdown text.";

    let prompt_for_model = if !context_text.is_empty() {
        format!("Use this selected PDF context to answer the user's question.\n\nSelected context:\n{}\n\nUser question:\n{}\n\nRemember to format your entire response using structured Markdown.", context_text, prompt)
    } else {
        format!(
            "{}\n\nRemember to format your entire response using structured Markdown.",
            prompt
        )
    };

    let prompt_for_inference = format!("{}\n\nUser: {}", system_prompt, prompt_for_model);

    tokio::task::spawn_blocking(move || {
        let result = (|| -> Result<(), CommandError> {
            let state = app.state::<AppState>();
            let mut ai_guard = state
                .ai
                .lock()
                .map_err(|e| CommandError::Ai(e.to_string()))?;

            if ai_guard.session.is_none() || ai_guard.tokenizer.is_none() {
                return Err(CommandError::Ai("No session or tokenizer".into()));
            }

            let mut token_ids = ai_guard
                .tokenizer
                .as_ref()
                .unwrap()
                .encode(&prompt_for_inference)
                .map_err(|e| CommandError::Ai(format!("Tokenization error: {}", e)))?;

            let eos_token_id = ai_guard
                .tokenizer
                .as_ref()
                .unwrap()
                .eos_token_id()
                .unwrap_or(2);
            let mut full_response = String::new();

            for _ in 0.._max_tokens {
                if cancel_flag.load(std::sync::atomic::Ordering::Relaxed) {
                    break;
                }

                // Prepare inputs for ONNX session
                let input_ids_vec: Vec<i64> = token_ids.clone();
                let array =
                    ndarray::Array2::from_shape_vec((1, input_ids_vec.len()), input_ids_vec)
                        .map_err(|e| CommandError::Ai(format!("Array error: {}", e)))?;

                let input_ids = ort::value::Tensor::from_array(array)
                    .map_err(|e| CommandError::Ai(format!("Tensor error: {}", e)))?;

                // Run inference
                let inputs = ort::inputs!["input_ids" => input_ids];

                // Use as_mut() to satisfy borrow checker if run() needs it
                let outputs = ai_guard
                    .session
                    .as_mut()
                    .unwrap()
                    .session
                    .run(inputs)
                    .map_err(|e| CommandError::Ai(format!("Inference error: {}", e)))?;

                let (shape, data) = outputs[0]
                    .try_extract_tensor::<f32>()
                    .map_err(|e| CommandError::Ai(format!("Extract error: {}", e)))?;

                let shape_vec: Vec<usize> = shape.iter().map(|&x| x as usize).collect();
                let logits = ndarray::ArrayViewD::from_shape(shape_vec, data)
                    .map_err(|e| CommandError::Ai(format!("Reshape error: {}", e)))?
                    .to_owned();

                // Release borrow of session by dropping outputs
                drop(outputs);

                let seq_len = logits.shape()[1];
                let last_token_logits = logits.slice(ndarray::s![0, seq_len - 1, ..]);

                let mut best_token = 0;
                let mut max_logit = f32::NEG_INFINITY;
                for (i, &logit) in last_token_logits.iter().enumerate() {
                    if logit > max_logit {
                        max_logit = logit;
                        best_token = i as i64;
                    }
                }

                if best_token == eos_token_id {
                    break;
                }

                token_ids.push(best_token);

                let new_text = ai_guard
                    .tokenizer
                    .as_ref()
                    .unwrap()
                    .decode(&[best_token])
                    .map_err(|e| CommandError::Ai(format!("Decoding error: {}", e)))?;

                full_response.push_str(&new_text);

                app.emit(
                    "ai-token",
                    TokenPayload {
                        token: new_text,
                        token_id: best_token,
                        is_final: false,
                    },
                )
                .map_err(|e| CommandError::Ai(e.to_string()))?;
            }

            // Persist assistant response if persist is true
            if persist {
                state
                    .db
                    .add_message(&session_id, "assistant", &full_response, None)
                    .map_err(|e| CommandError::Ai(e.to_string()))?;
            }

            app.emit(
                "ai-token",
                TokenPayload {
                    token: "".into(),
                    token_id: 0,
                    is_final: true,
                },
            )
            .map_err(|e| CommandError::Ai(e.to_string()))?;

            ai_guard.is_generating = false;
            ai_guard.cancel_flag = None;

            Ok(())
        })();

        if let Err(e) = result {
            let _ = app.emit(
                "ai-token",
                TokenPayload {
                    token: format!("Error: {}", e),
                    token_id: -1,
                    is_final: true,
                },
            );
            if let Ok(mut ai) = app.state::<AppState>().ai.lock() {
                ai.is_generating = false;
                ai.cancel_flag = None;
            }
        }
    });

    Ok(())
}

fn normalize_openai_base_url(base_url: &str) -> String {
    let trimmed = base_url.trim().trim_end_matches('/');
    if trimmed.ends_with("/chat/completions") {
        trimmed.to_string()
    } else if trimmed.ends_with("/v1") {
        format!("{}/chat/completions", trimmed)
    } else {
        format!("{}/v1/chat/completions", trimmed)
    }
}

pub async fn request_cloud_chat(
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
) -> Result<String, CommandError> {
    let url = normalize_openai_base_url(&base_url);
    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&json!({
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens.unwrap_or(1024),
            "temperature": temperature.unwrap_or(0.7),
            "stream": false,
        }))
        .send()
        .await
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    if !status.is_success() {
        return Err(CommandError::Ai(format!(
            "Cloud model request failed: {} {}",
            status, body
        )));
    }

    let value: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| CommandError::Ai(format!("Invalid cloud response: {}", e)))?;

    value
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .map(|content| content.to_string())
        .ok_or_else(|| {
            CommandError::Ai("Cloud response did not include choices[0].message.content".into())
        })
}

#[tauri::command]
pub async fn test_cloud_model(
    base_url: String,
    api_key: String,
    model: String,
) -> Result<CloudTestResult, CommandError> {
    let messages = vec![ChatMessage {
        role: "user".into(),
        content: "Reply with exactly: ok".into(),
    }];

    match request_cloud_chat(base_url, api_key, model, messages, Some(8), Some(0.0)).await {
        Ok(_) => Ok(CloudTestResult {
            ok: true,
            message: "Connection successful".into(),
        }),
        Err(e) => Ok(CloudTestResult {
            ok: false,
            message: e.to_string(),
        }),
    }
}

#[tauri::command]
pub async fn generate_cloud(
    state: State<'_, AppState>,
    app: AppHandle,
    session_id: String,
    base_url: String,
    api_key: String,
    model: String,
    mut messages: Vec<ChatMessage>,
    contexts: Option<Vec<ChatContext>>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
    persist: bool,
) -> Result<(), CommandError> {
    let system_prompt = "You are a helpful AI assistant analyzing a PDF document. Always format your responses in clear, professional Markdown. Use headings, lists, and bold text where appropriate to make your answers easy to read. Output ONLY raw Markdown text.";

    if persist {
        if let Some(last_msg) = messages.last() {
            if last_msg.role == "user" {
                let contexts_json = contexts
                    .as_ref()
                    .map(|c| serde_json::to_string(c).unwrap_or_default());
                let _ = state.db.add_message(
                    &session_id,
                    "user",
                    &last_msg.content,
                    contexts_json.as_deref(),
                );
            }
        }
    }

    // Enrich messages for the API call
    if !messages.is_empty() && messages[0].role == "system" {
        messages[0].content = system_prompt.to_string();
    } else {
        messages.insert(
            0,
            ChatMessage {
                role: "system".into(),
                content: system_prompt.into(),
            },
        );
    }

    // Enrich the last user message with context
    let context_text = if let Some(ref contexts) = contexts {
        contexts
            .iter()
            .map(|c| {
                if let Some(ref label) = c.label {
                    format!("{}:\n{}", label, c.content)
                } else {
                    c.content.clone()
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    } else {
        String::new()
    };

    if let Some(last_user_msg) = messages.iter_mut().rev().find(|m| m.role == "user") {
        let original_prompt = last_user_msg.content.clone();
        if !context_text.is_empty() {
            last_user_msg.content = format!("Use this selected PDF context to answer the user's question.\n\nSelected context:\n{}\n\nUser question:\n{}\n\nRemember to format your entire response using structured Markdown.", context_text, original_prompt);
        } else {
            last_user_msg.content = format!(
                "{}\n\nRemember to format your entire response using structured Markdown.",
                original_prompt
            );
        }
    }

    let url = normalize_openai_base_url(&base_url);
    let client = reqwest::Client::new();

    tokio::spawn(async move {
        let res = client
            .post(url)
            .bearer_auth(api_key)
            .json(&json!({
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens.unwrap_or(1024),
                "temperature": temperature.unwrap_or(0.7),
                "stream": true,
            }))
            .send()
            .await;

        let response = match res {
            Ok(r) => r,
            Err(e) => {
                let _ = app.emit(
                    "ai-token",
                    TokenPayload {
                        token: format!("Error: {}", e),
                        token_id: -1,
                        is_final: true,
                    },
                );
                return;
            }
        };

        let mut stream = response.bytes_stream();
        let mut full_content = String::new();

        while let Some(item) = stream.next().await {
            let chunk = match item {
                Ok(c) => c,
                Err(_) => break,
            };

            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        break;
                    }

                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(content) = v["choices"][0]["delta"]["content"].as_str() {
                            full_content.push_str(content);
                            let _ = app.emit(
                                "ai-token",
                                TokenPayload {
                                    token: content.to_string(),
                                    token_id: 0,
                                    is_final: false,
                                },
                            );
                        }
                    }
                }
            }
        }

        // Persist AI response if persist is true
        if persist {
            let app_state = app.state::<AppState>();
            let _ = app_state
                .db
                .add_message(&session_id, "assistant", &full_content, None);
        }

        let _ = app.emit(
            "ai-token",
            TokenPayload {
                token: "".into(),
                token_id: 0,
                is_final: true,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_generation(state: State<'_, AppState>) -> Result<(), CommandError> {
    let ai = state
        .ai
        .lock()
        .map_err(|e| CommandError::Ai(e.to_string()))?;
    if let Some(ref flag) = ai.cancel_flag {
        flag.store(true, std::sync::atomic::Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub async fn start_agent_task(
    app: AppHandle,
    workspace_id: String,
    prompt: String,
    model_config: serde_json::Value,
) -> Result<(), CommandError> {
    tokio::spawn(async move {
        if let Err(e) =
            crate::ai::agent::run_agent_task(app.clone(), workspace_id, prompt, model_config).await
        {
            let _ = app.emit("agent-error", format!("Agent failed: {}", e));
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<ModelEntry>, CommandError> {
    registry::scan_models().map_err(|e| CommandError::Model(e.to_string()))
}

#[tauri::command]
pub async fn download_model(
    app: AppHandle,
    model_id: String,
    url: String,
) -> Result<(), CommandError> {
    let app_clone = app.clone();
    let model_id_clone = model_id.clone();

    tokio::spawn(async move {
        if let Err(e) =
            crate::models::downloader::download_model(&app_clone, &model_id_clone, &url).await
        {
            let _ = app_clone.emit("download-error", format!("Download failed: {}", e));
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn delete_model(model_id: String) -> Result<(), CommandError> {
    let model_dir = registry::models_dir().join(&model_id);
    if model_dir.exists() {
        std::fs::remove_dir_all(&model_dir).map_err(|e| CommandError::Io(e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_model_info(model_id: String) -> Result<ModelEntry, CommandError> {
    registry::get_model_info(&model_id).map_err(|e| CommandError::Model(e.to_string()))
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    workspace_id: String,
    name: String,
) -> Result<DbSession, CommandError> {
    state
        .db
        .create_session(&workspace_id, &name)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<DbSession>, CommandError> {
    state
        .db
        .get_sessions(&workspace_id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn delete_session(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .db
        .delete_session(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn rename_session(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), CommandError> {
    state
        .db
        .rename_session(&id, &name)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_messages(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<DbMessage>, CommandError> {
    state
        .db
        .get_messages(&session_id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, CommandError> {
    state
        .db
        .get_setting(&key)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), CommandError> {
    state
        .db
        .set_setting(&key, &value)
        .map_err(|e| CommandError::Ai(e.to_string()))
}
