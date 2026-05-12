use tauri::{Manager, State};
use crate::state::AppState;
use crate::commands::CommandError;
use crate::pdf::document::PdfFile;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<PdfInfo, CommandError> {
    println!("[open_pdf] called with path: {}", path);
    let doc = PdfFile::open(&path, pdfium_library_candidates(&app))
        .map_err(|e| CommandError::Pdf(e.to_string()))?;
    println!("[open_pdf] PdfFile opened successfully");

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

fn pdfium_library_candidates(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let library_name = pdfium_render::prelude::Pdfium::pdfium_platform_library_name();
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("pdfium").join(&library_name));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("pdfium").join(&library_name));
            candidates.push(exe_dir.join("../Resources/pdfium").join(&library_name));
            candidates.push(exe_dir.join("../lib/aipdf/pdfium").join(&library_name));
        }
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("resources/pdfium").join(&library_name));
        candidates.push(current_dir.join("src-tauri/resources/pdfium").join(&library_name));
    }

    candidates
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
    println!("[render_page] called for page {} scale {}", page_index, scale);
    let pdf = state.pdf.lock().map_err(|e| CommandError::Pdf(e.to_string()))?;
    match &pdf.document {
        Some(doc) => {
            println!("[render_page] rendering page...");
            let rendered = doc.render_page(page_index, scale)
                .map_err(|e| CommandError::Pdf(e.to_string()))?;
            println!("[render_page] done, size {}x{}", rendered.width, rendered.height);
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
