{
  description = "Mermaid Visual Editor — desktop app for visually editing Mermaid diagrams";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = {nixpkgs, ...}: let
    inherit (nixpkgs) lib;
    forAllSystems = lib.genAttrs lib.systems.flakeExposed;
  in {
    devShells = forAllSystems (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        # Linux system libraries required by Tauri v2 / WebKit2GTK
        linuxDeps = lib.optionals pkgs.stdenv.isLinux [
          pkgs.webkitgtk_4_1
          pkgs.gtk3
          pkgs.glib
          pkgs.cairo
          pkgs.pango
          pkgs.atk
          pkgs.gdk-pixbuf
          pkgs.dbus
          pkgs.libsoup_3
          pkgs.librsvg
          pkgs.gst_all_1.gstreamer
          pkgs.gst_all_1.gst-plugins-base
          pkgs.gst_all_1.gst-plugins-good
          pkgs.libayatana-appindicator
        ];
      in {
        default = pkgs.mkShell {
          packages = [
            # Rust toolchain
            pkgs.rustc
            pkgs.cargo
            pkgs.rustfmt
            pkgs.clippy
            pkgs.rust-analyzer

            # Tauri CLI (v2)
            pkgs.cargo-tauri

            # VCS
            pkgs.jujutsu

            # JS tooling
            pkgs.nodejs_22
            pkgs.bun

            # Build tooling
            pkgs.pkg-config
            pkgs.openssl
            pkgs.openssl.dev

            # Export: PNG/PDF via mmdc subprocess
            pkgs.mermaid-cli
          ] ++ linuxDeps;

          env = {
            # Prevent openssl-sys from trying to vendor OpenSSL
            OPENSSL_NO_VENDOR = "1";
            # Workaround for some WebKit DMA-buf rendering issues on Linux
            WEBKIT_DISABLE_DMABUF_RENDERER = "1";
          };

          shellHook = ''
            export REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

            ${lib.optionalString pkgs.stdenv.isLinux ''
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:${pkgs.webkitgtk_4_1.dev}/lib/pkgconfig:${pkgs.gtk3.dev}/lib/pkgconfig:${pkgs.glib.dev}/lib/pkgconfig:${pkgs.libsoup_3.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
              export LD_LIBRARY_PATH="${pkgs.webkitgtk_4_1}/lib:${pkgs.gtk3}/lib:${pkgs.glib}/lib:${pkgs.dbus}/lib:${pkgs.libayatana-appindicator}/lib:$LD_LIBRARY_PATH"
            ''}

            echo "Mermaid Visual Editor dev shell"
            echo "  cargo tauri dev   — start Tauri dev server"
            echo "  bun install       — install JS dependencies"
            echo "  bun run build     — build frontend only"
          '';
        };
      }
    );
  };
}
