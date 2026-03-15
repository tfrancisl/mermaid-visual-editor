use base64::{engine::general_purpose, Engine};
use std::fs;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

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

/// Export a Mermaid diagram to PNG or PDF via the `mmdc` CLI.
/// Returns the output file as a base64-encoded string.
#[tauri::command]
fn export_diagram(source: String, format: String) -> Result<String, String> {
    validate_export_format(&format)?;

    let (input_path, output_path) = temp_paths(&format);

    fs::write(&input_path, &source).map_err(|e| format!("Failed to write temp file: {e}"))?;

    let result = Command::new("mmdc")
        .args([
            "-i",
            input_path.to_str().unwrap(),
            "-o",
            output_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to spawn mmdc: {e}. Ensure mmdc is in PATH (enter the Nix dev shell)."))?;

    let _ = fs::remove_file(&input_path);

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("mmdc exited with error:\n{stderr}"));
    }

    let bytes = fs::read(&output_path).map_err(|e| format!("Failed to read output: {e}"))?;
    let _ = fs::remove_file(&output_path);

    Ok(general_purpose::STANDARD.encode(bytes))
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
        assert!(validate_export_format("PNG").is_err()); // case-sensitive
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![export_diagram])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
