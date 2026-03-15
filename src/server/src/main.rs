use clap::Parser;
use mermaid_visual_editor_server::{routes, state};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

#[derive(Parser, Debug)]
#[command(name = "mermaid-visual-editor", about = "Mermaid Visual Editor server")]
struct Cli {
    /// Port to listen on (0 = OS-assigned random port)
    #[arg(short, long, default_value_t = 0)]
    port: u16,

    /// Don't open browser automatically
    #[arg(long)]
    no_open: bool,

    /// Dev mode: skip static file serving (frontend on Vite :5173)
    #[arg(long)]
    dev: bool,

    /// Mermaid files to open on startup
    files: Vec<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let cli = Cli::parse();

    let app_state = state::AppState::new(&cli.files).await;
    let state = Arc::new(app_state);

    let app = routes::router(state.clone(), cli.dev);

    let addr = SocketAddr::from(([127, 0, 0, 1], cli.port));
    let listener = TcpListener::bind(addr).await.expect("failed to bind");
    let local_addr = listener.local_addr().expect("failed to get local address");

    tracing::info!("Listening on http://{local_addr}");

    if !cli.no_open {
        let url = if cli.dev {
            format!("http://localhost:5173")
        } else {
            format!("http://{local_addr}")
        };
        if let Err(e) = open::that(&url) {
            tracing::warn!("Failed to open browser: {e}");
        }
    }

    axum::serve(listener, app)
        .await
        .expect("server error");
}
