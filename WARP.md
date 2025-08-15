# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Frontend Development
- `npm install` - Install all dependencies
- `npm run dev` - Start Vite frontend dev server only (port 5173)
- `npm run tauri dev` - Start full Tauri app in development mode with hot-reload
- `npm run build` - Build frontend bundle only (outputs to dist/)
- `npm run lint` - Run ESLint on codebase
- `npm run preview` - Preview built frontend

### Tauri Desktop App
- `npx tauri dev` - Alternative way to start Tauri development mode
- `npx tauri build` - Build release binary and OS-specific installer/bundle
- Build artifacts: `src-tauri/target/release/` (binary) and `src-tauri/target/release/bundle/` (installers)

### Asset Generation Tools
- `cd scripts/asset-generator && npm run build` - Run external asset generation scripts

## Architecture Overview

### High-Level Structure
- **Frontend**: React 19 + TypeScript + Vite development server
- **Backend**: Tauri (Rust) desktop application shell
- **State Management**: Zustand stores with protocol-based data flow
- **Build Process**: Vite bundles frontend → Tauri embeds in desktop app

### Directory Structure
```
src/                    # React frontend code
├── components/         # UI components (AssetPanel, FileOperationsPanel, etc.)
├── pages/             # Route pages (Home, Game, AssetDesigner)
├── store/             # Zustand store modules
├── tools/             # Drawing tool implementations
├── services/          # Tauri API integration
└── generation/        # Procedural generation algorithms

src-tauri/             # Tauri Rust backend
├── src/lib.rs         # Tauri commands for file operations
├── tauri.conf.json    # App configuration
└── Cargo.toml         # Rust dependencies

public/                # Static assets
dist/                  # Built frontend (generated)
scripts/               # External development tools
```

### Key Configuration
- **Tauri Config**: `src-tauri/tauri.conf.json` - App settings, window config, build commands
- **Vite Config**: `vite.config.ts` - Frontend build configuration  
- **Dev Integration**: `beforeDevCommand: "npm run dev"` + `devUrl: "http://localhost:5173"`

## State Management Architecture

### Store Structure (Zustand)
1. **mapStore.ts** - Map data and game state
   - Protocol-based tile and asset instance management
   - File operations (save/load maps)
   - Layer settings and player position
   
2. **uiStore.ts** - UI and tool state
   - Current tool selection and temporary drawing state
   - Viewport transforms, grid settings
   - Generation parameters and brush settings
   
3. **store.ts** - Backward-compatible wrapper
   - Delegates to mapStore and uiStore
   - Maintains legacy API for existing components

### Protocol Pattern
- **protocol.ts** coordinates between frontend state and Tauri backend
- Functions like `setTile()`, `addAssetInstance()` call Tauri commands
- `subscribeToMapChanges()` updates mapStore when backend state changes

## Tool System

### Available Tools
- `select` - Asset selection and manipulation
- `draw` - Basic tile drawing  
- `erase` - Tile removal
- `rect`, `line`, `circle`, `polygon` - Shape drawing tools
- `freehand` - Free-form drawing

### Tool Architecture
- **ToolManager** singleton manages all tool instances
- Each tool implements common `Tool` interface
- **UIStore** tracks temporary tool state (polygon vertices, line endpoints, etc.)
- Tools integrate with grid snapping and viewport transforms

## File Operations & Asset Management

### Tauri Commands (src-tauri/lib.rs)
- `load_map` / `save_map` - JSON map file operations with system dialogs
- `read_imported_assets` / `write_imported_assets` - Asset persistence in app data directory
- `open_file_dialog` / `save_file_dialog` - System file picker integration

### Asset System
- Assets auto-scale to grid dimensions on import
- Supports PNG, SVG, WebP formats
- Grid snapping with configurable snap-to-grid toggle
- Multi-cell asset support with `gridWidth` and `gridHeight` properties

## Development Priorities (from DEVELOPMENT_PLAN.txt)

### Phase 1 - Core Functionality (Active)
- ✅ Grid snapping and asset placement
- ✅ Basic drawing tools and layer system
- ✅ File save/load operations
- □ UI layout fixes and tool selection feedback
- □ Drawing tool responsiveness (left-click functionality)

### Current Focus Areas
1. Fix sidebar/canvas positioning and tool button active states
2. Ensure drawing tools respond correctly to mouse events
3. Polish grid system and asset manipulation
4. Test and verify existing functionality

### Generation System
- Procedural dungeon generation with configurable parameters
- Noise-based terrain generation for world maps
- Asset placement algorithms with density controls
- Room and corridor generation for building interiors

## Testing & Verification

### Development Workflow
1. **Start Development**: `npm run tauri dev`
2. **Test Drawing Tools**: Verify left-click draw, right-click erase, middle-click pan
3. **Test Grid System**: Toggle grid visibility/snapping, verify asset alignment
4. **Test File Operations**: Save/load maps through Tauri dialogs
5. **Test Asset Import**: Import PNG/SVG assets, verify auto-scaling

### Build Verification
1. **Frontend Build**: `npm run build` → Check dist/ output
2. **Full Build**: `npx tauri build` → Test installer in target/release/bundle/
3. **Lint Check**: `npm run lint` → Ensure code quality

## Prerequisites (Windows)
- Node.js 18+ and npm 9+
- Rust toolchain (stable) with cargo
- Visual Studio Build Tools (Desktop development with C++)
- **Windows Note**: Run terminal as Administrator for first build if linker errors occur

## Route Structure
- `/` - Home page
- `/game` - Main map editor interface
- `/assets` - Asset Designer page for asset management

## External Tools
- **scripts/asset-generator/** - Standalone Node.js scripts for asset generation
- Uses OpenAI API and CSV processing for procedural asset creation
- Isolated from main React/Tauri application
