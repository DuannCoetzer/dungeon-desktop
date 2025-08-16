# 🏗️ Build Guide for Dungeon Desktop

This document provides comprehensive instructions for building the Dungeon Desktop application.

## 📋 Prerequisites

Before building the application, ensure you have the following installed:

### Required Software
1. **Node.js** (v18 or later)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Rust** (latest stable)
   - Download from: https://rustup.rs/
   - Verify installation: `cargo --version`

3. **Git** (for version control)
   - Download from: https://git-scm.com/

### Platform-Specific Requirements

#### Windows
- **Microsoft Visual Studio Build Tools** or Visual Studio with C++ support
- **WebView2** runtime (usually pre-installed on Windows 10/11)

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **macOS 10.15+** for building and running

#### Linux
- **Build essentials**: `sudo apt install build-essential`
- **WebKit2GTK**: `sudo apt install webkit2gtk-4.0-dev`
- **Additional dependencies**: `sudo apt install libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## 🚀 Quick Start (One-Click Build)

### Windows
```bash
# Double-click or run from command line:
build.bat
```

### Linux/macOS
```bash
# Make executable and run:
chmod +x build.sh
./build.sh
```

### Cross-Platform (using npm)
```bash
# Full release build:
npm run release

# Development build:
npm run build:all

# Debug build (faster):
npm run build:debug
```

## 📦 Build Scripts Overview

### Production Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `build.bat` / `build.sh` | Full production build with optimizations | Final distribution builds |
| `release.bat` | Enhanced production build with all checks | Official releases |
| `npm run release` | Cross-platform release build | CI/CD pipelines |

### Development Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `build-debug.bat` | Fast debug build | Development testing |
| `npm run build:debug` | Cross-platform debug build | Quick iterations |
| `npm run tauri:dev` | Development server | Live development |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `npm run clean` | Clean all build artifacts |
| `npm run lint` | Run code quality checks |
| `npm run build` | Build frontend only |
| `npm run tauri:build` | Build Tauri app only |

## 🔧 Build Process Details

### 1. Frontend Build (React + Vite)
- **Input**: `src/` directory
- **Output**: `dist/` directory
- **Process**: TypeScript compilation → React bundling → Vite optimization

### 2. Desktop App Build (Tauri + Rust)
- **Input**: Frontend dist + Rust code in `src-tauri/`
- **Output**: Platform-specific executables and installers
- **Process**: Rust compilation → WebView embedding → Platform packaging

## 📁 Build Output Structure

```
src-tauri/target/
├── debug/              # Debug builds (larger, faster compilation)
│   └── dndmapper.exe   # Debug executable
└── release/            # Production builds (smaller, optimized)
    ├── dndmapper.exe   # Optimized executable
    └── bundle/         # Platform installers
        ├── msi/        # Windows installer (.msi)
        ├── deb/        # Linux package (.deb)
        ├── rpm/        # Linux package (.rpm)
        ├── appimage/   # Linux AppImage
        └── macos/      # macOS app bundle (.app)
```

## ⚡ Build Optimization Tips

### Faster Development Builds
1. Use debug builds during development: `npm run build:debug`
2. Use hot reload for frontend changes: `npm run tauri:dev`
3. Avoid cleaning between builds unless necessary

### Smaller Release Builds
1. Run `npm run release` for fully optimized builds
2. Consider target-specific builds for distribution
3. Use `strip` command on Linux/macOS to reduce binary size

### Build Troubleshooting

#### Common Issues

**Node.js/npm issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Rust compilation issues:**
```bash
# Update Rust toolchain
rustup update

# Clean Rust cache
cargo clean
```

**Platform-specific issues:**
- **Windows**: Ensure Visual Studio Build Tools are installed
- **macOS**: Update Xcode Command Line Tools
- **Linux**: Install all required system dependencies

#### Build Script Debugging
Add `--verbose` flag to any npm script for detailed output:
```bash
npm run build:all --verbose
```

## 🎯 Continuous Integration

### GitHub Actions Example
```yaml
name: Build
on: [push, pull_request]
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - run: npm run release
```

## 📊 Build Performance

| Build Type | Time (approx.) | Output Size | Use Case |
|------------|---------------|-------------|----------|
| Debug | 2-3 minutes | ~200MB | Development |
| Release | 5-8 minutes | ~50MB | Distribution |
| Frontend only | 30 seconds | ~10MB | Quick testing |

## 🔄 Version Management

Update version numbers in:
1. `package.json` - Frontend version
2. `src-tauri/Cargo.toml` - Rust crate version
3. `src-tauri/tauri.conf.json` - App version

## 📝 Build Checklist

Before creating a release build:

- [ ] All tests passing
- [ ] No linting errors (`npm run lint`)
- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] Git repository clean (no uncommitted changes)
- [ ] Dependencies updated (`npm audit`)
- [ ] Cross-platform testing completed

## 🆘 Support

If you encounter build issues:

1. Check this documentation first
2. Verify all prerequisites are installed
3. Try cleaning and rebuilding
4. Check the Tauri documentation: https://tauri.app/
5. Report issues with build logs and system information

---

**Happy Building! 🎉**
