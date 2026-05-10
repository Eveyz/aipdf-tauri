use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct RenderedPage {
    pub width: u32,
    pub height: u32,
    pub image_base64: String,
}
