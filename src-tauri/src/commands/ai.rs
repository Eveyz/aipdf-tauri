use tauri::{State, AppHandle, Emitter};
use crate::state::AppState;
use crate::commands::CommandError;
use crate::models::registry::{self, ModelEntry};
use serde::{Deserialize, Serialize};
use serde_json::json;

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

    let mut ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
    ai.session = Some(session);
    ai.tokenizer = Some(tokenizer);

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
    _prompt: String,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
) -> Result<(), CommandError> {
    let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

    {
        let mut ai = state.ai.lock().map_err(|e| CommandError::Ai(e.to_string()))?;
        if ai.session.is_none() {
            return Err(CommandError::Ai("No model loaded".into()));
        }
        ai.is_generating = true;
        ai.cancel_flag = Some(cancel_flag.clone());
    }

    // We need to clone the session/tokenizer data for the spawned task
    // Since ort Session isn't easily clonable, we'll run inference in a blocking task
    // that holds the lock. For now, use a simplified approach.
    let _max_tokens = max_tokens.unwrap_or(512);
    let _temperature = temperature.unwrap_or(0.7);

    tokio::task::spawn_blocking(move || {
        let result = (|| -> Result<(), CommandError> {
            // Re-acquire lock for inference
            // In a real implementation, we'd move the session out of the mutex
            // or use Arc<Mutex<>> for the session itself
            // For now, this is a placeholder that demonstrates the architecture
            app.emit("ai-token", TokenPayload {
                token: "AI inference not yet implemented. Model loaded successfully.".into(),
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
    app: AppHandle,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
) -> Result<(), CommandError> {
    tokio::spawn(async move {
        let result = request_cloud_chat(
            base_url,
            api_key,
            model,
            messages,
            max_tokens,
            temperature,
        )
        .await;

        let token = match result {
            Ok(content) => content,
            Err(e) => format!("Error: {}", e),
        };

        let _ = app.emit("ai-token", TokenPayload {
            token,
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
