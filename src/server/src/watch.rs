use axum::extract::ws::{Message, WebSocket};
use axum::extract::{State, WebSocketUpgrade};
use axum::response::IntoResponse;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;

use crate::state::AppState;

const MAX_FILE_SIZE: u64 = 1_048_576; // 1MB

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ClientMessage {
    #[serde(rename = "watch")]
    Watch { path: String },
    #[serde(rename = "unwatch")]
    Unwatch { path: String },
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum ServerMessage {
    #[serde(rename = "file_changed")]
    FileChanged { path: String, content: String },
    #[serde(rename = "file_deleted")]
    FileDeleted { path: String },
}

pub async fn ws_upgrade(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws(socket, state))
}

async fn handle_ws(mut socket: WebSocket, state: Arc<AppState>) {
    let (notify_tx, mut notify_rx) = mpsc::channel::<(PathBuf, bool)>(64);

    let mut watched: HashSet<PathBuf> = HashSet::new();

    // Auto-watch files from CLI args
    {
        let paths = state.watched_paths.read().await;
        for p in paths.iter() {
            watched.insert(p.clone());
        }
    }

    let notify_tx_clone = notify_tx.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(100),
        move |res: DebounceEventResult| {
            if let Ok(events) = res {
                for event in events {
                    let exists = event.path.exists();
                    let _ = notify_tx_clone.blocking_send((event.path, exists));
                }
            }
        },
    )
    .expect("failed to create file watcher");

    // Start watching initial paths
    for p in &watched {
        let _ = debouncer
            .watcher()
            .watch(p, notify::RecursiveMode::NonRecursive);
    }

    loop {
        tokio::select! {
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            match client_msg {
                                ClientMessage::Watch { path } => {
                                    let p = PathBuf::from(&path);
                                    if p.is_absolute() && !path.contains("..") {
                                        let _ = debouncer.watcher().watch(&p, notify::RecursiveMode::NonRecursive);
                                        watched.insert(p);
                                    }
                                }
                                ClientMessage::Unwatch { path } => {
                                    let p = PathBuf::from(&path);
                                    let _ = debouncer.watcher().unwatch(&p);
                                    watched.remove(&p);
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            Some((path, exists)) = notify_rx.recv() => {
                if !watched.contains(&path) {
                    continue;
                }

                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                if !matches!(ext, "mmd" | "md" | "txt") {
                    continue;
                }

                let msg = if exists {
                    // Check file size
                    let meta = match std::fs::metadata(&path) {
                        Ok(m) => m,
                        Err(_) => continue,
                    };
                    if meta.len() > MAX_FILE_SIZE {
                        continue;
                    }

                    match std::fs::read_to_string(&path) {
                        Ok(content) => ServerMessage::FileChanged {
                            path: path.to_string_lossy().to_string(),
                            content,
                        },
                        Err(_) => continue,
                    }
                } else {
                    ServerMessage::FileDeleted {
                        path: path.to_string_lossy().to_string(),
                    }
                };

                let json = serde_json::to_string(&msg).unwrap();
                if socket.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    }
}
