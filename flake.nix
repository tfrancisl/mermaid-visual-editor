{
  description = "Mermaid Visual Editor — browser-based app for visually editing Mermaid diagrams";

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
      in {
        default = pkgs.mkShell {
          packages = [
            # Rust toolchain
            pkgs.rustc
            pkgs.cargo
            pkgs.rustfmt
            pkgs.clippy
            pkgs.rust-analyzer

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
          ];

          env = {
            # Prevent openssl-sys from trying to vendor OpenSSL
            OPENSSL_NO_VENDOR = "1";
          };

          shellHook = ''
            export REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

            ${lib.optionalString pkgs.stdenv.isLinux ''
              export PKG_CONFIG_PATH="${pkgs.openssl.dev}/lib/pkgconfig:$PKG_CONFIG_PATH"
            ''}

            echo "Mermaid Visual Editor dev shell"
            echo "  bun run dev                  — Vite dev server (:5173)"
            echo "  bun run dev:server            — Rust server (:3001, proxied by Vite)"
            echo "  bun install                  — install JS dependencies"
            echo "  bun run build                — build frontend"
            echo "  bun run build:server          — build server (release)"
          '';
        };
      }
    );
  };
}
