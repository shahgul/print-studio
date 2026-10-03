mod pdf_store;
mod project_store;
mod source_store;
mod source_watch;

use std::path::Path;

#[tauri::command]
fn write_pdf_bytes_atomic(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let encoded = request
        .headers()
        .get("x-print-studio-path")
        .and_then(|value| value.to_str().ok())
        .ok_or("missing encoded PDF output path")?;
    let path = pdf_store::decode_export_path(encoded).map_err(|error| error.to_string())?;
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => {
            pdf_store::write_pdf_bytes_atomic(Path::new(&path), bytes)
                .map_err(|error| error.to_string())
        }
        _ => Err("PDF output requires raw binary IPC".to_string()),
    }
}

#[tauri::command]
fn set_source_watch_paths(
    app: tauri::AppHandle,
    state: tauri::State<'_, source_watch::SourceWatchState>,
    paths: Vec<String>,
) -> Result<(), String> {
    source_watch::set_source_watch_paths(&app, &state, paths)
}

#[tauri::command]
fn source_file_exists(path: String) -> Result<bool, String> {
    source_store::source_file_exists(Path::new(&path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_source_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    source_store::read_source_bytes(Path::new(&path))
        .map(tauri::ipc::Response::new)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn read_project_text(path: String) -> Result<String, String> {
    project_store::read_project_text(Path::new(&path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_project_text(path: String) -> Result<(), String> {
    project_store::remove_project_text(Path::new(&path)).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_project_text_atomic(path: String, content: String) -> Result<(), String> {
    project_store::write_project_text_atomic(Path::new(&path), &content)
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(source_watch::SourceWatchState::default())
        .invoke_handler(tauri::generate_handler![
            read_project_text,
            read_source_bytes,
            set_source_watch_paths,
            source_file_exists,
            remove_project_text,
            write_pdf_bytes_atomic,
            write_project_text_atomic
        ])
        .run(tauri::generate_context!())
        .expect("error while running Print Studio");
}
