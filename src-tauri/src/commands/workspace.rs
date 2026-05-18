use crate::commands::CommandError;
use crate::db::{DbDocument, DbHighlight, DbWorkspace};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    metadata: Option<String>,
) -> Result<DbWorkspace, CommandError> {
    state
        .db
        .create_workspace(&name, metadata.as_deref())
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn update_workspace_metadata(
    state: State<'_, AppState>,
    id: String,
    metadata: String,
) -> Result<(), CommandError> {
    state
        .db
        .update_workspace_metadata(&id, &metadata)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn list_workspaces(
    state: State<'_, AppState>,
    limit: Option<i32>,
) -> Result<Vec<DbWorkspace>, CommandError> {
    state
        .db
        .list_workspaces(limit)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn delete_workspace(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .db
        .delete_workspace(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn find_workspace_by_path(
    state: State<'_, AppState>,
    path: String,
    workspace_type: Option<String>,
) -> Result<Option<DbWorkspace>, CommandError> {
    state
        .db
        .find_workspace_by_doc_path(&path, workspace_type.as_deref())
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn touch_workspace(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .db
        .update_workspace_time(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn add_document(
    state: State<'_, AppState>,
    workspace_id: String,
    path: String,
    name: String,
) -> Result<DbDocument, CommandError> {
    state
        .db
        .add_document(&workspace_id, &path, &name)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_documents(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<DbDocument>, CommandError> {
    state
        .db
        .get_documents(&workspace_id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn upsert_document_meta(
    hash_id: String,
    file_name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .db
        .upsert_document_meta(&hash_id, &file_name, &file_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_document_path(
    hash_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .db
        .get_document_path(&hash_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_highlight(
    state: State<'_, AppState>,
    id: String,
    workspace_id: String,
    document_path: String,
    highlight_data: String,
) -> Result<DbHighlight, CommandError> {
    state
        .db
        .add_highlight(&id, &workspace_id, &document_path, &highlight_data)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn get_highlights(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<DbHighlight>, CommandError> {
    state
        .db
        .get_highlights(&workspace_id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}

#[tauri::command]
pub async fn delete_highlight(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .db
        .delete_highlight(&id)
        .map_err(|e| CommandError::Ai(e.to_string()))
}
