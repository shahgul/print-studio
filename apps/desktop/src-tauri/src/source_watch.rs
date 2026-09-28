use std::{
    path::PathBuf,
    sync::Mutex,
};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

use crate::source_store::source_watch_directories;

pub(crate) const SOURCE_PATHS_CHANGED_EVENT: &str = "source-paths-changed";

#[derive(Default)]
pub(crate) struct SourceWatchState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

pub(crate) fn set_source_watch_paths(
    app: &AppHandle,
    state: &SourceWatchState,
    paths: Vec<String>,
) -> Result<(), String> {
    let source_paths = paths.into_iter().map(PathBuf::from).collect::<Vec<_>>();
    let directories = source_watch_directories(&source_paths)
        .into_iter()
        .filter(|directory| directory.is_dir())
        .collect::<Vec<_>>();

    if directories.is_empty() {
        let mut guard = state
            .watcher
            .lock()
            .map_err(|_| "source watcher state is poisoned".to_string())?;
        *guard = None;
        return Ok(());
    }

    let app_handle = app.clone();
    let mut watcher = RecommendedWatcher::new(
        move |result: notify::Result<notify::Event>| {
            if result.is_ok() {
                let _ = app_handle.emit(SOURCE_PATHS_CHANGED_EVENT, ());
            }
        },
        Config::default(),
    )
    .map_err(|error| error.to_string())?;

    for directory in directories {
        watcher
            .watch(&directory, RecursiveMode::NonRecursive)
            .map_err(|error| {
                format!(
                    "failed to watch source directory {}: {error}",
                    directory.display()
                )
            })?;
    }

    let mut guard = state
        .watcher
        .lock()
        .map_err(|_| "source watcher state is poisoned".to_string())?;
    *guard = Some(watcher);
    Ok(())
}
