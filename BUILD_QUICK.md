# 🚀 Quick Build Guide

## One-Click Build (Recommended)

### Windows Users
1. Double-click `build.bat` **OR** run in terminal:
   ```cmd
   build.bat
   ```

### Linux/macOS Users
```bash
./build.sh
```

## Alternative Methods

```bash
# Using npm (cross-platform)
npm run release          # Full production build
npm run build:all        # Standard build  
npm run build:debug      # Fast debug build

# For development
npm run tauri:dev        # Live development server
```

## Output Location
- **Windows Installer**: `src-tauri/target/release/bundle/msi/`
- **Executable**: `src-tauri/target/release/dndmapper.exe`
- **macOS**: `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/`

## Prerequisites
- Node.js (18+)
- Rust (latest)
- Platform build tools (see BUILD.md)

## Troubleshooting
- Run `npm run clean` if build fails
- Check BUILD.md for detailed instructions
- Ensure all prerequisites are installed

**That's it! 🎉**
