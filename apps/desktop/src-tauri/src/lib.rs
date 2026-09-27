mod project_store;
mod source_store;

use std::path::Path;

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
        .invoke_handler(tauri::generate_handler![
            read_project_text,
            remove_project_text,
            write_project_text_atomic
        ])
        .run(tauri::generate_context!())
        .expect("error while running Print Studio");
}
