use axum::{
    extract::{Json, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;

use crate::state::AppState;

#[derive(Deserialize)]
pub struct SaveRequest {
    pub path: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct ReadQuery {
    pub path: String,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub files: Vec<crate::state::InitialFile>,
}

fn validate_path(path: &str) -> Result<(), &'static str> {
    if path.contains("..") {
        return Err("Path traversal not allowed");
    }
    if !Path::new(path).is_absolute() {
        return Err("Path must be absolute");
    }
    Ok(())
}

pub async fn handle_save(Json(req): Json<SaveRequest>) -> impl IntoResponse {
    if let Err(msg) = validate_path(&req.path) {
        return (StatusCode::BAD_REQUEST, msg.to_string()).into_response();
    }

    match tokio::fs::write(&req.path, &req.content).await {
        Ok(()) => StatusCode::OK.into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write file: {e}"),
        )
            .into_response(),
    }
}

pub async fn handle_read(Query(q): Query<ReadQuery>) -> impl IntoResponse {
    if let Err(msg) = validate_path(&q.path) {
        return (StatusCode::BAD_REQUEST, msg.to_string()).into_response();
    }

    match tokio::fs::read_to_string(&q.path).await {
        Ok(content) => content.into_response(),
        Err(e) => (
            StatusCode::NOT_FOUND,
            format!("Failed to read file: {e}"),
        )
            .into_response(),
    }
}

pub async fn handle_session(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let response = SessionResponse {
        files: state.initial_files.clone(),
    };
    Json(response).into_response()
}
