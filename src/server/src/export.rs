use axum::{
    extract::Json,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use std::fs;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Deserialize)]
pub struct ExportRequest {
    pub source: String,
    pub format: String,
}

fn validate_export_format(format: &str) -> Result<(), String> {
    match format {
        "png" | "pdf" | "svg" => Ok(()),
        _ => Err(format!("Unsupported export format: {format}")),
    }
}

fn temp_paths(format: &str) -> (std::path::PathBuf, std::path::PathBuf) {
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let tmp = std::env::temp_dir();
    (
        tmp.join(format!("mermaid-{id}.mmd")),
        tmp.join(format!("mermaid-{id}.{format}")),
    )
}

pub async fn handle_export(Json(req): Json<ExportRequest>) -> Response {
    if let Err(msg) = validate_export_format(&req.format) {
        return (StatusCode::BAD_REQUEST, msg).into_response();
    }

    let (input_path, output_path) = temp_paths(&req.format);

    if let Err(e) = fs::write(&input_path, &req.source) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to write temp file: {e}"),
        )
            .into_response();
    }

    let result = Command::new("mmdc")
        .args([
            "-i",
            input_path.to_str().unwrap(),
            "-o",
            output_path.to_str().unwrap(),
        ])
        .output();

    let _ = fs::remove_file(&input_path);

    let output = match result {
        Ok(o) => o,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to spawn mmdc: {e}. Ensure mmdc is in PATH (enter the Nix dev shell)."),
            )
                .into_response();
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("mmdc exited with error:\n{stderr}"),
        )
            .into_response();
    }

    let bytes = match fs::read(&output_path) {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to read output: {e}"),
            )
                .into_response();
        }
    };
    let _ = fs::remove_file(&output_path);

    let content_type = match req.format.as_str() {
        "png" => "image/png",
        "pdf" => "application/pdf",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    };

    ([(header::CONTENT_TYPE, content_type)], bytes).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_accepts_png_pdf_svg() {
        assert!(validate_export_format("png").is_ok());
        assert!(validate_export_format("pdf").is_ok());
        assert!(validate_export_format("svg").is_ok());
    }

    #[test]
    fn validate_rejects_invalid_formats() {
        assert!(validate_export_format("gif").is_err());
        assert!(validate_export_format("jpg").is_err());
        assert!(validate_export_format("").is_err());
        assert!(validate_export_format("PNG").is_err());
    }

    #[test]
    fn validate_error_includes_format_name() {
        let err = validate_export_format("gif").unwrap_err();
        assert!(err.contains("gif"));
    }

    #[test]
    fn temp_paths_use_format_extension() {
        let (input, output) = temp_paths("png");
        assert!(input.to_str().unwrap().ends_with(".mmd"));
        assert!(output.to_str().unwrap().ends_with(".png"));
    }

    #[test]
    fn temp_paths_are_unique() {
        let (a, _) = temp_paths("png");
        std::thread::sleep(std::time::Duration::from_millis(1));
        let (b, _) = temp_paths("png");
        assert_ne!(a, b);
    }
}
