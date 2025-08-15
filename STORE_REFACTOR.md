# Store Refactor: Split useDungeonStore into Protocol-Based Architecture

## Overview

This refactor successfully splits the monolithic `useDungeonStore` into a cleaner, protocol-based architecture with separated concerns:

- **`useMapStore`** - Persistent map data using protocol functions
- **`useUIStore`** - Editor state and UI interactions  
- **Protocol Layer** - Core map operations with abstraction
- **Backward Compatibility** - Original `useDungeonStore` API preserved

## Architecture

### 1. Protocol Layer (`src/protocol.ts`)

The protocol layer provides a clean interface for map data operations:

```typescript
// Core protocol functions
import { setTile, eraseTile, addAssetInstance } from './protocol'

// Direct usage
setTile('floor', 5, 5, 'floor')
eraseTile('walls', 3, 3)
addAssetInstance(newAssetInstance)

// Subscribe to changes
subscribeToMapChanges((mapData) => {
  console.log('Map updated:', mapData)
})
```

**Key Features:**
- Singleton pattern with `MapProtocol` class
- Immutable data operations
- Automatic timestamps and versioning
- Built-in validation
- Serialization support
- Event subscription system

### 2. Map Store (`src/mapStore.ts`)

Handles persistent map data and delegates to protocol functions:

```typescript
import { useMapStore, useTiles, useAssetInstances } from './mapStore'

// Usage in components
const tiles = useTiles()
const setTile = useMapStore(state => state.setTile)
const addAssetInstance = useMapStore(state => state.addAssetInstance)
```

**Responsibilities:**
- Map data (tiles, assets)
- Player position
- Layer settings
- Current editing context
- Asset selection state

### 3. UI Store (`src/uiStore.ts`)

Focused on editor state and UI interactions:

```typescript
import { useUIStore, useSelectedTool, useBrushSettings } from './uiStore'

// Usage
const selectedTool = useSelectedTool()
const brushSettings = useBrushSettings()
const setTool = useUIStore(state => state.setSelectedTool)
```

**Responsibilities:**
- Tool selection and temporary state
- Brush settings
- Viewport transforms
- Selection state
- Grid settings
- Generation parameters

## Migration Guide

### For New Code
Use the new stores directly:

```typescript
// Map operations
import { useMapStore } from './mapStore'
const { setTile, addAssetInstance } = useMapStore()

// UI operations  
import { useUIStore } from './uiStore'
const { setSelectedTool, setBrushSize } = useUIStore()
```

### For Existing Code
Continue using the old API - it delegates automatically:

```typescript
// Still works! 
import { useDungeonStore } from './store'
const { setTile, tool, setTool } = useDungeonStore()
```

### Tool Classes Updated
All tool classes now use `useMapStore`:

```typescript
// Before
import { useDungeonStore } from '../store'
const state = useDungeonStore.getState()

// After  
import { useMapStore } from '../mapStore'
const state = useMapStore.getState()
```

## Key Benefits

### 1. Separation of Concerns
- **Map data** is persistent and managed by protocol
- **UI state** is ephemeral and tool-specific
- Clear boundaries between different types of state

### 2. Protocol Abstraction
- Actions like `setTile` and `addAssetInstance` call protocol functions
- Storage and persistence logic abstracted away
- Easy to add features like undo/redo, networking, etc.

### 3. Better Performance
- Selective subscriptions with convenience hooks
- UI updates don't trigger map data re-renders
- Protocol layer can batch operations

### 4. Maintainability  
- Smaller, focused stores
- Clear data flow
- Better TypeScript support
- Easier testing

### 5. Backward Compatibility
- Existing code continues to work
- Gradual migration path
- No breaking changes

## File Structure

```
src/
├── protocol.ts           # Core map data operations
├── mapStore.ts          # Persistent map state store
├── uiStore.ts           # Editor UI state store (updated)
├── store.ts             # Backward-compatible wrapper
├── tools/               # Updated to use mapStore
│   ├── DrawTool.ts
│   ├── EraseTool.ts  
│   └── RectTool.ts
├── examples/
│   ├── storeIntegration.tsx     # Updated example
│   ├── uiStoreUsage.tsx         # Existing UI examples
│   └── newStoreArchitecture.tsx # New architecture demo
└── pages/Game.tsx       # Updated to use new stores
```

## Protocol Functions

Core functions available for direct use:

```typescript
// Tile operations
setTile(layer: Layer, x: number, y: number, type: TileType)
eraseTile(layer: Layer, x: number, y: number)
getTile(layer: Layer, x: number, y: number)

// Asset operations
addAssetInstance(assetInstance: AssetInstance)
updateAssetInstance(id: string, updates: Partial<AssetInstance>)
deleteAssetInstance(id: string)

// Data management
getMapData(): MapData
setMapData(mapData: MapData)
resetMap()
subscribeToMapChanges(callback)
```

## Store Selectors

Optimized selectors for common operations:

```typescript
// Map store selectors
import { useTiles, useAssetInstances, useCurrentLayer } from './mapStore'

// UI store selectors  
import { useSelectedTool, useBrushSettings, useGridSettings } from './uiStore'
```

## Examples

See `src/examples/newStoreArchitecture.tsx` for comprehensive examples showing:
- Direct protocol usage
- New store architecture
- Backward compatibility
- Migration patterns

## Testing

The new architecture improves testability:

```typescript
// Test protocol functions directly
import { setTile, getMapData, resetMap } from './protocol'

beforeEach(() => resetMap())

test('setTile updates map data', () => {
  setTile('floor', 0, 0, 'floor')
  const mapData = getMapData()
  expect(mapData.tiles.floor['0,0']).toBe('floor')
})
```

## Future Enhancements

The protocol layer enables:
- **Persistence**: Save/load map data to/from files
- **Networking**: Sync map data across clients
- **Undo/Redo**: Track operation history
- **Validation**: Enforce map constraints
- **Optimization**: Batch operations, compression
- **Analytics**: Track map editing patterns

## Summary

✅ **Task Completed**: Split `useDungeonStore` into two stores  
✅ **`useMapStore`**: Persistent `MapData` using protocol functions  
✅ **`useUIStore`**: Editor state (already existed, enhanced)  
✅ **Protocol Integration**: Actions like `setTile` and `addAssetInstance` call protocol functions  
✅ **Backward Compatibility**: Existing code continues to work  
✅ **Migration Path**: Clear upgrade path for new and existing code

The refactor successfully separates concerns while maintaining compatibility and improving the overall architecture of the dungeon editor.
