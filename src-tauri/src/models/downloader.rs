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

    // Files to download
    let files = [
        ("config.json", format!("{}/resolve/main/config.json", url)),
        ("tokenizer.json", format!("{}/resolve/main/tokenizer.json", url)),
        ("model.onnx", format!("{}/resolve/main/model.onnx", url)),
    ];

    let client = reqwest::Client::new();

    for (file_name, file_url) in &files {
        let dest = model_dir.join(file_name);

        // Skip if already exists
        if dest.exists() {
            continue;
        }

        let response = client.get(file_url).send().await?;
        if !response.status().is_success() {
            // Skip files that don't exist (e.g., config.json might be optional)
            if *file_name == "config.json" || *file_name == "tokenizer.json" {
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

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk)?;
            bytes_downloaded += chunk.len() as u64;

            let percentage = if total_bytes > 0 {
                (bytes_downloaded as f32 / total_bytes as f32) * 100.0
            } else {
                0.0
            };

            let _ = app.emit("download-progress", DownloadProgress {
                model_id: model_id.to_string(),
                file_name: file_name.to_string(),
                bytes_downloaded,
                total_bytes,
                percentage,
            });
        }
    }

    Ok(model_dir)
}
