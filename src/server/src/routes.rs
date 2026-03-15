use axum::{
    Router,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use rust_embed::RustEmbed;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

use crate::state::AppState;

#[derive(RustEmbed)]
#[folder = "../../dist/"]
struct StaticAssets;

async fn handle_health() -> StatusCode {
    StatusCode::OK
}

fn serve_embedded_file(path: &str) -> impl IntoResponse {
    match <StaticAssets as RustEmbed>::get(path) {
        Some(file) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, mime.to_string())],
                file.data.to_vec(),
            )
                .into_response()
        }
        None => {
            // SPA fallback: serve index.html for non-file paths
            match <StaticAssets as RustEmbed>::get("index.html") {
                Some(file) => (
                    StatusCode::OK,
                    [(
                        axum::http::header::CONTENT_TYPE,
                        "text/html".to_string(),
                    )],
                    file.data.to_vec(),
                )
                    .into_response(),
                None => StatusCode::NOT_FOUND.into_response(),
            }
        }
    }
}

pub fn router(state: Arc<AppState>, dev_mode: bool) -> Router {
    let api = Router::new()
        .route("/api/health", get(handle_health))
        .route("/api/export", post(crate::export::handle_export))
        .route("/api/file/save", post(crate::files::handle_save))
        .route("/api/file/read", get(crate::files::handle_read))
        .route("/api/session", get(crate::files::handle_session))
        .route("/ws", get(crate::watch::ws_upgrade))
        .with_state(state)
        .layer(CorsLayer::permissive());

    if dev_mode {
        // In dev mode, Vite serves the frontend; we only serve API + WS
        api
    } else {
        // In production, serve embedded static files with SPA fallback
        api.fallback(get(|req: axum::extract::Request| async move {
            let path = req.uri().path().trim_start_matches('/');
            let path = if path.is_empty() { "index.html" } else { path };
            serve_embedded_file(path)
        }))
    }
}
