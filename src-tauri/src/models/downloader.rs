use tauri::{AppHandle, Emitter};
use std::path::PathBuf;

#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub model_id: String,
    pub file_name: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
}

pub async fn download_model(
    app: &AppHandle,
    model_id: &str,
    url: &str,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let model_dir = super::registry::models_dir().join(model_id);
    std::fs::create_dir_all(&model_dir)?;

    // Core files to download
    let mut files = vec![
        ("config.json".to_string(), format!("{}/resolve/main/config.json", url)),
        ("tokenizer.json".to_string(), format!("{}/resolve/main/tokenizer.json", url)),
        ("model.onnx".to_string(), format!("{}/resolve/main/model.onnx", url)),
    ];

    let client = reqwest::Client::new();

    for i in 0..files.len() {
        let (file_name, file_url) = &files[i];
        let dest = model_dir.join(file_name);

        // Skip if already exists
        if dest.exists() {
            continue;
        }

        let mut response = client.get(file_url).send().await?;
        
        // If model.onnx fails, try the onnx/ subfolder which is common in sentence-transformers
        if !response.status().is_success() && file_name == "model.onnx" {
            let alt_url = format!("{}/resolve/main/onnx/model.onnx", url);
            response = client.get(&alt_url).send().await?;
        }

        if !response.status().is_success() {
            // Skip files that don't exist (e.g., config.json might be optional)
            if file_name == "config.json" || file_name == "tokenizer.json" {
                continue;
            }
            return Err(format!("Failed to download {}: HTTP {}", file_name, response.status()).into());
        }

        let total_bytes = response.content_length().unwrap_or(0);
        let mut bytes_downloaded: u64 = 0;

        let mut file = std::fs::File::create(&dest)?;
        let mut stream = response.bytes_stream();

        use futures::StreamExt;
        use std::io::Write;
        
        let mut last_percentage = -1.0;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk)?;
            bytes_downloaded += chunk.len() as u64;

            let percentage = if total_bytes > 0 {
                (bytes_downloaded as f32 / total_bytes as f32) * 100.0
            } else {
                0.0
            };

            // Throttle events to avoid overwhelming the frontend (only emit every 1% or on completion)
            if percentage - last_percentage >= 1.0 || bytes_downloaded == total_bytes {
                let _ = app.emit("download-progress", DownloadProgress {
                    model_id: model_id.to_string(),
                    file_name: file_name.to_string(),
                    bytes_downloaded,
                    total_bytes,
                    percentage,
                });
                last_percentage = percentage;
            }
        }
    }

    // After all files successfully downloaded, emit a final 100% progress for the model so the UI knows it's fully done
    let _ = app.emit("download-progress", DownloadProgress {
        model_id: model_id.to_string(),
        file_name: "complete".to_string(),
        bytes_downloaded: 1,
        total_bytes: 1,
        percentage: 100.0,
    });

    Ok(model_dir)
}
