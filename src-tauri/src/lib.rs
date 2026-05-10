mod commands;
mod pdf;
mod ai;
mod models;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::pdf::open_pdf,
            commands::pdf::get_page_count,
            commands::pdf::render_page,
            commands::pdf::get_page_text,
            commands::pdf::close_pdf,
            commands::ai::load_model,
            commands::ai::unload_model,
            commands::ai::generate,
            commands::ai::stop_generation,
            commands::ai::list_models,
            commands::ai::download_model,
            commands::ai::delete_model,
            commands::ai::get_model_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
