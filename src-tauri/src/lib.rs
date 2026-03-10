use base64::{engine::general_purpose, Engine};
use std::fs;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

/// Export a Mermaid diagram to PNG or PDF via the `mmdc` CLI.
/// Returns the output file as a base64-encoded string.
#[tauri::command]
fn export_diagram(source: String, format: String) -> Result<String, String> {
    if format != "png" && format != "pdf" && format != "svg" {
        return Err(format!("Unsupported export format: {format}"));
    }

    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    let tmp = std::env::temp_dir();
    let input_path = tmp.join(format!("mermaid-{id}.mmd"));
    let output_path = tmp.join(format!("mermaid-{id}.{format}"));

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
