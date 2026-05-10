use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CharInfo {
    pub char_index: u32,
    pub unicode: char,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageText {
    pub full_text: String,
    pub chars: Vec<CharInfo>,
    pub page_width: f32,
    pub page_height: f32,
}
