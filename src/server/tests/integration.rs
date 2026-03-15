use axum::body::Body;
use axum::http::{Request, StatusCode};
use std::sync::Arc;
use tower::ServiceExt;

fn test_state() -> Arc<mermaid_visual_editor_server::state::AppState> {
    Arc::new(mermaid_visual_editor_server::state::AppState {
        initial_files: vec![],
        watched_paths: tokio::sync::RwLock::new(vec![]),
    })
}

fn test_app() -> axum::Router {
    mermaid_visual_editor_server::routes::router(test_state(), true)
}

#[tokio::test]
async fn health_returns_200() {
    let app = test_app();
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn export_rejects_invalid_format() {
    let app = test_app();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/export")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"source":"graph LR; A-->B","format":"gif"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn file_save_and_read_roundtrip() {
    let app = test_app();
    let tmp = std::env::temp_dir().join("mve-test-roundtrip.txt");
    let path = tmp.to_str().unwrap();
    let content = "hello from integration test";

    // Save
    let resp = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/file/save")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"path": path, "content": content}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);

    // Read back
    let resp = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/file/read?path={}", urlencoding::encode(path)))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 1024).await.unwrap();
    assert_eq!(std::str::from_utf8(&body).unwrap(), content);

    let _ = std::fs::remove_file(&tmp);
}

#[tokio::test]
async fn file_save_rejects_relative_path() {
    let app = test_app();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/file/save")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"path":"relative/path.txt","content":"test"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn file_save_rejects_path_traversal() {
    let app = test_app();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/file/save")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"path":"/tmp/../etc/passwd","content":"test"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn session_returns_empty_by_default() {
    let app = test_app();
    let resp = app
        .oneshot(
            Request::builder()
                .uri("/api/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = axum::body::to_bytes(resp.into_body(), 4096).await.unwrap();
    let val: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(val["files"].as_array().unwrap().len(), 0);
}
