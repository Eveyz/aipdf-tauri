use std::path::Path;
use tokenizers::Tokenizer;

pub struct AiTokenizer {
    inner: Tokenizer,
    eos_token_id: Option<i64>,
}

unsafe impl Send for AiTokenizer {}

impl AiTokenizer {
    pub fn load(model_dir: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let tokenizer_path = model_dir.join("tokenizer.json");
        if !tokenizer_path.exists() {
            return Err(format!("tokenizer.json not found at {}", tokenizer_path.display()).into());
        }

        let inner = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| format!("Failed to load tokenizer: {}", e))?;

        // Try to read EOS token from tokenizer_config.json
        let eos_token_id = {
            let config_path = model_dir.join("tokenizer_config.json");
            if config_path.exists() {
                let config_str = std::fs::read_to_string(&config_path)?;
                let config: serde_json::Value = serde_json::from_str(&config_str)?;
                config.get("eos_token_id")
                    .and_then(|v| v.as_i64())
                    .or_else(|| {
                        // Some configs have eos_token as a string, look it up
                        config.get("eos_token")
                            .and_then(|v| v.as_str())
                            .and_then(|token| inner.token_to_id(token).map(|id| id as i64))
                    })
            } else {
                None
            }
        };

        Ok(Self { inner, eos_token_id })
    }

    pub fn encode(&self, text: &str) -> Result<Vec<i64>, Box<dyn std::error::Error>> {
        let encoding = self.inner.encode(text, false)
            .map_err(|e| format!("Encoding error: {}", e))?;
        Ok(encoding.get_ids().iter().map(|&id| id as i64).collect())
    }

    pub fn decode(&self, token_ids: &[i64]) -> Result<String, Box<dyn std::error::Error>> {
        let ids: Vec<u32> = token_ids.iter().map(|&id| id as u32).collect();
        self.inner.decode(&ids, true)
            .map_err(|e| format!("Decoding error: {}", e).into())
    }

    pub fn eos_token_id(&self) -> Option<i64> {
        self.eos_token_id
    }
}
