use tauri::{State, AppHandle, Emitter, Manager};
use crate::state::AppState;
use crate::commands::CommandError;
use crate::models::registry::{self, ModelEntry};
use crate::db::{DbSession, DbMessage};
use serde::{Deserialize, Serialize};
use serde_json::json;
use futures_util::StreamExt;

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
    let entry = registry::get_model_info(&model_id)
        .map_err(|e| CommandError::Model(e.to_string()))?;

    let session = crate::ai::session::AiSession::load(&entry.path)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    let tokenizer = crate::ai::tokenizer::AiTokenizer::load(&entry.path)
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    let has_tokenizer = true;

    {
        let mut ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
        ai.session = Some(session);
        ai.tokenizer = Some(tokenizer);
    }

    // Save as last used model
    state.db.set_setting("last_used_model_id", &model_id)
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
pub async fn unload_model(
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    let mut ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
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
) -> Result<(), CommandError> {
    let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

    let contexts_json = contexts.as_ref().map(|c| serde_json::to_string(c).unwrap_or_default());

    // Store user message
    state.db.add_message(&session_id, "user", &prompt, contexts_json.as_deref())
        .map_err(|e| CommandError::Ai(e.to_string()))?;

    {
        let mut ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
        if ai.session.is_none() {
            return Err(CommandError::Ai("No model loaded".into()));
        }
        ai.is_generating = true;
        ai.cancel_flag = Some(cancel_flag.clone());
    }

    let _max_tokens = max_tokens.unwrap_or(512);
    let _temperature = temperature.unwrap_or(0.7);

    tokio::task::spawn_blocking(move || {
        let result = (|| -> Result<(), CommandError> {
            app.emit("ai-token", TokenPayload {
                token: "AI inference not yet implemented for local models.".into(),
                token_id: 0,
                is_final: true,
            }).map_err(|e| CommandError::Ai(e.to_string()))?;
            Ok(())
        })();

        if let Err(e) = result {
            let _ = app.emit("ai-token", TokenPayload {
                token: format!("Error: {}", e),
                token_id: -1,
                is_final: true,
            });
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

async fn request_cloud_chat(
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
        return Err(CommandError::Ai(format!("Cloud model request failed: {} {}", status, body)));
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
        .ok_or_else(|| CommandError::Ai("Cloud response did not include choices[0].message.content".into()))
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
    messages: Vec<ChatMessage>,
    contexts: Option<Vec<ChatContext>>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
) -> Result<(), CommandError> {
    if let Some(last_msg) = messages.last() {
        if last_msg.role == "user" {
            let contexts_json = contexts.as_ref().map(|c| serde_json::to_string(c).unwrap_or_default());
            let _ = state.db.add_message(&session_id, "user", &last_msg.content, contexts_json.as_deref());
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
                let _ = app.emit("ai-token", TokenPayload {
                    token: format!("Error: {}", e),
                    token_id: -1,
                    is_final: true,
                });
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
                            let _ = app.emit("ai-token", TokenPayload {
                                token: content.to_string(),
                                token_id: 0,
                                is_final: false,
                            });
                        }
                    }
                }
            }
        }

        // Persist AI response
        let app_state = app.state::<AppState>();
        let _ = app_state.db.add_message(&session_id, "assistant", &full_content, None);

        let _ = app.emit("ai-token", TokenPayload {
            token: "".into(),
            token_id: 0,
            is_final: true,
        });
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_generation(
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    let ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
    if let Some(ref flag) = ai.cancel_flag {
        flag.store(true, std::sync::atomic::Ordering::Relaxed);
    }
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
        if let Err(e) = crate::models::downloader::download_model(&app_clone, &model_id_clone, &url).await {
            let _ = app_clone.emit("download-error", format!("Download failed: {}", e));
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn delete_model(
    model_id: String,
) -> Result<(), CommandError> {
    let model_dir = registry::models_dir().join(&model_id);
    if model_dir.exists() {
        std::fs::remove_dir_all(&model_dir)
            .map_err(|e| CommandError::Io(e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_model_info(
    model_id: String,
) -> Result<ModelEntry, CommandError> {
    registry::get_model_info(&model_id)
        .map_err(|e| CommandError::Model(e.to_string()))
}

#[tauri::command]
pub async fn create_session(state: State<'_, AppState>, workspace_id: String, name: String) -> Result<DbSession, CommandError> {
    state.db.create_session(&workspace_id, &name).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn list_sessions(state: State<'_, AppState>, workspace_id: String) -> Result<Vec<DbSession>, CommandError> {
    state.db.get_sessions(&workspace_id).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn delete_session(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state.db.delete_session(&id).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn rename_session(state: State<'_, AppState>, id: String, name: String) -> Result<(), CommandError> {
    state.db.rename_session(&id, &name).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_messages(state: State<'_, AppState>, session_id: String) -> Result<Vec<DbMessage>, CommandError> {
    state.db.get_messages(&session_id).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, CommandError> {
    state.db.get_setting(&key).map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), CommandError> {
    state.db.set_setting(&key, &value).map_err(|e| CommandError::Ai(e.to_string()))
}
