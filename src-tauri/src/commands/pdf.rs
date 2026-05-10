use tauri::State;
use crate::state::AppState;
use crate::commands::CommandError;
use crate::pdf::document::PdfFile;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PdfInfo {
    pub file_name: String,
    pub page_count: u32,
    pub page_width: f32,
    pub page_height: f32,
}

#[derive(Serialize, Deserialize)]
pub struct RenderResult {
    pub width: u32,
    pub height: u32,
    pub image_base64: String,
}

#[tauri::command]
pub async fn open_pdf(
    state: State<'_, AppState>,
    path: String,
) -> Result<PdfInfo, CommandError> {
    let doc = PdfFile::open(&path)
        .map_err(|e| CommandError::Pdf(e.to_string()))?;

    let page_count = doc.page_count();
    let (page_width, page_height) = doc.page_dimensions(0)
        .unwrap_or((595.0, 842.0)); // A4 default

    let file_name = std::path::Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    pdf.document = Some(doc);
    pdf.file_path = Some(path);

    Ok(PdfInfo {
        file_name,
        page_count,
        page_width,
        page_height,
    })
}

#[tauri::command]
pub async fn get_page_count(
    state: State<'_, AppState>,
) -> Result<u32, CommandError> {
    let pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    match &pdf.document {
        Some(doc) => Ok(doc.page_count()),
        None => Err(CommandError::Pdf("No PDF loaded".into())),
    }
}

#[tauri::command]
pub async fn render_page(
    state: State<'_, AppState>,
    page_index: u32,
    scale: f32,
) -> Result<RenderResult, CommandError> {
    let pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    match &pdf.document {
        Some(doc) => {
            let rendered = doc.render_page(page_index, scale)
                .map_err(|e| CommandError::Pdf(e.to_string()))?;
            Ok(RenderResult {
                width: rendered.width,
                height: rendered.height,
                image_base64: rendered.image_base64,
            })
        }
        None => Err(CommandError::Pdf("No PDF loaded".into())),
    }
}

#[tauri::command]
pub async fn get_page_text(
    state: State<'_, AppState>,
    page_index: u32,
) -> Result<crate::pdf::text::PageText, CommandError> {
    let pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    match &pdf.document {
        Some(doc) => {
            let text = doc.extract_text(page_index)
                .map_err(|e| CommandError::Pdf(e.to_string()))?;
            Ok(text)
        }
        None => Err(CommandError::Pdf("No PDF loaded".into())),
    }
}

#[tauri::command]
pub async fn close_pdf(
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    let mut pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    pdf.document = None;
    pdf.file_path = None;
    Ok(())
}
