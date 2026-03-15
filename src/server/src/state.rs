use serde::Serialize;
use std::path::PathBuf;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Clone)]
pub struct InitialFile {
    pub path: String,
    pub content: String,
}

pub struct AppState {
    pub initial_files: Vec<InitialFile>,
    pub watched_paths: RwLock<Vec<PathBuf>>,
}

impl AppState {
    pub async fn new(file_args: &[String]) -> Self {
        let mut initial_files = Vec::new();

        for path_str in file_args {
            let path = PathBuf::from(path_str);
            let abs_path = if path.is_absolute() {
                path.clone()
            } else {
                std::env::current_dir()
                    .unwrap_or_default()
                    .join(&path)
            };

            match tokio::fs::read_to_string(&abs_path).await {
                Ok(content) => {
                    initial_files.push(InitialFile {
                        path: abs_path.to_string_lossy().to_string(),
                        content,
                    });
                }
                Err(e) => {
                    tracing::warn!("Failed to read {}: {e}", abs_path.display());
                }
            }
        }

        let watched_paths: Vec<PathBuf> = initial_files
            .iter()
            .map(|f| PathBuf::from(&f.path))
            .collect();

        AppState {
            initial_files,
            watched_paths: RwLock::new(watched_paths),
        }
    }
}
