use std::sync::Mutex;
use crate::pdf::document::PdfFile;
use crate::ai::session::AiSession;
use crate::ai::tokenizer::AiTokenizer;

pub struct PdfState {
    pub document: Option<PdfFile>,
    pub file_path: Option<String>,
}

impl Default for PdfState {
    fn default() -> Self {
        Self {
            document: None,
            file_path: None,
        }
    }
}

pub struct AiState {
    pub session: Option<AiSession>,
    pub tokenizer: Option<AiTokenizer>,
    pub is_generating: bool,
    pub cancel_flag: Option<std::sync::Arc<std::sync::atomic::AtomicBool>>,
}

impl Default for AiState {
    fn default() -> Self {
        Self {
            session: None,
            tokenizer: None,
            is_generating: false,
            cancel_flag: None,
        }
    }
}

#[derive(Default)]
pub struct AppState {
    pub pdf: Mutex<PdfState>,
    pub ai: Mutex<AiState>,
}
