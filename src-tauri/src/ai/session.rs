use std::path::Path;
use ort::session::{Session, builder::GraphOptimizationLevel};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ModelArchitecture {
    Llama,
    Mistral,
    Phi,
    Qwen,
    Gemma,
    Generic,
}

pub struct AiSession {
    pub session: Session,
    pub architecture: ModelArchitecture,
    pub max_context: usize,
}

// ort Session is Send
unsafe impl Send for AiSession {}

impl AiSession {
    pub fn load(model_dir: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let model_path = model_dir.join("model.onnx");
        if !model_path.exists() {
            return Err(format!("model.onnx not found at {}", model_path.display()).into());
        }

        // Read config.json to determine architecture
        let config_path = model_dir.join("config.json");
        let architecture = if config_path.exists() {
            let config_str = std::fs::read_to_string(&config_path)?;
            let config: serde_json::Value = serde_json::from_str(&config_str)?;
            let model_type = config.get("model_type")
                .and_then(|v| v.as_str())
                .unwrap_or("generic");
            match model_type {
                "llama" => ModelArchitecture::Llama,
                "mistral" => ModelArchitecture::Mistral,
                "phi" | "phi3" => ModelArchitecture::Phi,
                "qwen" | "qwen2" => ModelArchitecture::Qwen,
                "gemma" => ModelArchitecture::Gemma,
                _ => ModelArchitecture::Generic,
            }
        } else {
            ModelArchitecture::Generic
        };

        // Read max position embeddings from config
        let max_context = if config_path.exists() {
            let config_str = std::fs::read_to_string(&config_path)?;
            let config: serde_json::Value = serde_json::from_str(&config_str)?;
            config.get("max_position_embeddings")
                .and_then(|v| v.as_u64())
                .unwrap_or(4096) as usize
        } else {
            4096
        };

        // Build ONNX session
        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .commit_from_file(&model_path)?;

        Ok(Self {
            session,
            architecture,
            max_context,
        })
    }
}
