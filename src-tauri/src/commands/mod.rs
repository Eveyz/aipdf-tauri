pub mod pdf;
pub mod ai;

#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("PDF error: {0}")]
    Pdf(String),
    #[error("AI error: {0}")]
    Ai(String),
    #[error("Model error: {0}")]
    Model(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
