use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub model_type: String,
    pub has_tokenizer: bool,
    pub has_model: bool,
    pub model_size_mb: u64,
}

#[derive(Deserialize)]
struct ModelConfig {
    model_type: Option<String>,
    architectures: Option<Vec<String>>,
}

pub fn models_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".aipdf")
        .join("models")
}

pub fn scan_models() -> Result<Vec<ModelEntry>, Box<dyn std::error::Error>> {
    let dir = models_dir();
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut models = Vec::new();

    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let id = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let has_model = path.join("model.onnx").exists();
        let has_tokenizer = path.join("tokenizer.json").exists();

        // Read config.json for model type and name
        let (model_type, name) = if path.join("config.json").exists() {
            let config_str = std::fs::read_to_string(path.join("config.json"))?;
            let config: ModelConfig = serde_json::from_str(&config_str).unwrap_or(ModelConfig {
                model_type: None,
                architectures: None,
            });
            let model_type = config.model_type.clone().unwrap_or_else(|| "unknown".into());
            let name = config.architectures
                .as_ref()
                .and_then(|a| a.first().cloned())
                .unwrap_or_else(|| id.clone());
            (model_type, name)
        } else {
            ("unknown".into(), id.clone())
        };

        // Calculate model file size
        let model_size_mb = if has_model {
            std::fs::metadata(path.join("model.onnx"))
                .map(|m| m.len() / (1024 * 1024))
                .unwrap_or(0)
        } else {
            0
        };

        models.push(ModelEntry {
            id,
            name,
            path,
            model_type,
            has_tokenizer,
            has_model,
            model_size_mb,
        });
    }

    Ok(models)
}

pub fn get_model_info(model_id: &str) -> Result<ModelEntry, Box<dyn std::error::Error>> {
    let models = scan_models()?;
    models.into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Model '{}' not found", model_id).into())
}
