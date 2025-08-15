# Dungeon Desktop

Cross‑platform desktop app built with React + TypeScript + Vite for the frontend and Tauri (Rust) for the desktop shell.

## Prerequisites

Install the following before working on the project:

- Node.js 18+ and npm 9+ (or a compatible package manager)
- Rust toolchain (stable) with cargo
  - Windows: Install Visual Studio Build Tools (Desktop development with C++)
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, pkg-config, libgtk-3-dev, webkit2gtk, libayatana-appindicator3-dev
- Tauri CLI (optional if using npx)
  - npm i -D @tauri-apps/cli

If you’re on Windows and using PowerShell, run terminals as Administrator for the first build if you hit linker toolchain errors.

## Getting started

- Install dependencies
  - npm install

## Development

Run the Tauri app in development with hot-reload:

- Preferred (script):
  - npm run tauri dev
- Alternative (without script):
  - npx tauri dev

This launches the Vite dev server and the Tauri window using the configuration in src-tauri/tauri.conf.json (beforeDevCommand runs npm run dev and devUrl points to http://localhost:5173).

## Build and packaging

Produce a release build and OS-specific installer/bundle:

- npx tauri build

Artifacts are generated under:
- src-tauri/target/release/  — compiled Rust binary
- src-tauri/target/release/bundle/ — installers (e.g., .msi, .dmg, .AppImage, .deb)

Notes:
- The frontend is built to dist via npm run build; Tauri picks this up via frontendDist in src-tauri/tauri.conf.json.
- For repeatable builds on CI, also install @tauri-apps/cli and the platform prerequisites.

## Project structure

- src/ — React + TypeScript app code
- public/ — static assets copied by Vite
- index.html — Vite entry HTML
- vite.config.ts — Vite configuration
- tsconfig*.json — TypeScript configs
- package.json — scripts and dependencies
- dist/ — built frontend (generated)
- src-tauri/
  - Cargo.toml, Cargo.lock — Rust crate metadata
  - tauri.conf.json — Tauri app configuration (windows, bundling, dev/build commands)
  - src/ — Rust Tauri commands/backend
  - icons/ — app icons used for bundling
  - capabilities/ — Tauri capability manifests
  - build.rs — Tauri build script
  - target/ — Rust build output (generated)

## Common scripts

- npm run dev — Start Vite frontend only (useful for UI development)
- npm run tauri dev — Start full Tauri app in dev
- npm run build — Build frontend bundle only

## Troubleshooting

- If npm run tauri dev isn’t recognized, use npx tauri dev or add a script:
  - In package.json: "tauri": "tauri"
- Windows linker errors: ensure Rust, Visual Studio Build Tools, and the Windows 10/11 SDK are installed.
- Linux packaging issues: verify webkit2gtk and appindicator dev libs are present.
