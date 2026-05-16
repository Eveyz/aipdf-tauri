mod commands;
mod pdf;
mod ai;
mod models;
mod state;
mod db;

use state::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_dir = dirs::data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("aipdf");
    
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).expect("Failed to create app directory");
    }

    let db_path = app_dir.join("aipdf.db");
    let db = db::DbManager::new(db_path).expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            pdf: Mutex::new(state::PdfState::default()),
            ai: Mutex::new(state::AiState::default()),
            db,
        })
        .invoke_handler(tauri::generate_handler![
            commands::pdf::open_pdf,
            commands::pdf::get_page_count,
            commands::pdf::render_page,
            commands::pdf::get_page_text,
            commands::pdf::close_pdf,
            commands::ai::load_model,
            commands::ai::unload_model,
            commands::ai::generate,
            commands::ai::generate_cloud,
            commands::ai::stop_generation,
            commands::ai::test_cloud_model,
            commands::ai::list_models,
            commands::ai::download_model,
            commands::ai::delete_model,
            commands::ai::get_model_info,
            commands::ai::save_cloud_model,
            commands::ai::list_cloud_models,
            commands::ai::delete_cloud_model_entry,
            commands::ai::set_last_used_model,
            commands::ai::create_session,
            commands::ai::list_sessions,
            commands::ai::delete_session,
            commands::ai::rename_session,
            commands::ai::get_messages,
            commands::ai::get_setting,
            commands::ai::set_setting,
            commands::workspace::create_workspace,
            commands::workspace::update_workspace_metadata,
            commands::workspace::touch_workspace,
            commands::workspace::list_workspaces,
            commands::workspace::delete_workspace,
            commands::workspace::find_workspace_by_path,
            commands::workspace::add_document,
            commands::workspace::get_documents,
            commands::workspace::add_highlight,
            commands::workspace::get_highlights,
            commands::workspace::delete_highlight,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
