# UI Store Documentation

## Overview

The UI Store (`uiStore.ts`) is a Zustand-based state management solution designed to handle all transient editor UI state. It is separate from the main dungeon store to maintain a clean separation between persistent dungeon data and ephemeral UI state.

## Architecture

### Separation of Concerns

- **Dungeon Store** (`store.ts`): Handles persistent dungeon data like tiles, layers, assets, and player position
- **UI Store** (`uiStore.ts`): Handles transient UI state like selected tools, brush settings, viewport transforms, and temporary tool state

### State Categories

1. **Tool State**
   - Current selected tool
   - Brush settings (size, opacity, hardness)

2. **Generation Parameters**
   - Procedural generation settings
   - Room count, corridor width, complexity, etc.

3. **Viewport & Selection**
   - Current viewport transform (position, zoom)
   - Active selection area

4. **Tool-specific Temporary State**
   - Polygon vertices while drawing
   - Line start/end points
   - Rectangle corners
   - Circle center and radius

5. **Grid & Snapping**
   - Grid visibility and size
   - Snap-to-grid settings

## Key Features

### Performance Optimization

The store includes selector hooks for performance optimization:

```tsx
// Instead of subscribing to the entire store
const state = useUIStore()

// Use specific selectors to reduce re-renders
const selectedTool = useSelectedTool()
const brushSettings = useBrushSettings()
const viewportTransform = useViewportTransform()
```

### Tool State Management

When switching tools, all temporary state is automatically cleared:

```tsx
const setSelectedTool = useUIStore(state => state.setSelectedTool)

// This will automatically clear polygon vertices, line points, etc.
setSelectedTool('polygon')
```

### Grid Snapping

Utility functions are provided for grid snapping:

```tsx
import { snapPointToGrid, snapToGrid } from './uiStore'

const point = { x: 123, y: 456 }
const snappedPoint = snapPointToGrid(point, 32) // Snaps to 32px grid
```

## Usage Examples

### Basic Tool Selection

```tsx
import { useSelectedTool, useUIStore } from './uiStore'

const ToolPanel = () => {
  const selectedTool = useSelectedTool()
  const setSelectedTool = useUIStore(state => state.setSelectedTool)
  
  return (
    <div>
      <button 
        onClick={() => setSelectedTool('draw')}
        className={selectedTool === 'draw' ? 'active' : ''}
      >
        Draw
      </button>
      {/* ... other tools */}
    </div>
  )
}
```

### Brush Settings

```tsx
import { useBrushSettings, useUIStore } from './uiStore'

const BrushPanel = () => {
  const { size, opacity } = useBrushSettings()
  const { setBrushSize, setBrushOpacity } = useUIStore()
  
  return (
    <div>
      <input
        type="range"
        min="1"
        max="50"
        value={size}
        onChange={(e) => setBrushSize(Number(e.target.value))}
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={opacity}
        onChange={(e) => setBrushOpacity(Number(e.target.value))}
      />
    </div>
  )
}
```

### Viewport Controls

```tsx
import { useViewportTransform, useUIStore } from './uiStore'

const ViewportControls = () => {
  const viewport = useViewportTransform()
  const { setViewportTransform, resetViewport } = useUIStore()
  
  const zoomIn = () => setViewportTransform({ 
    scale: viewport.scale * 1.2 
  })
  
  const zoomOut = () => setViewportTransform({ 
    scale: viewport.scale / 1.2 
  })
  
  return (
    <div>
      <button onClick={zoomIn}>Zoom In</button>
      <button onClick={zoomOut}>Zoom Out</button>
      <button onClick={resetViewport}>Reset</button>
    </div>
  )
}
```

### Polygon Tool Example

```tsx
import { useUIStore, useSelectedTool, snapPointToGrid } from './uiStore'

const PolygonTool = () => {
  const selectedTool = useSelectedTool()
  const { toolTempState, addPolygonVertex, clearPolygon } = useUIStore()
  const gridSettings = useGridSettings()
  
  const handleCanvasClick = (event) => {
    if (selectedTool !== 'polygon') return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    
    // Snap to grid if enabled
    const finalPoint = gridSettings.isSnapToGrid 
      ? snapPointToGrid(point, gridSettings.gridSize)
      : point
    
    addPolygonVertex(finalPoint)
  }
  
  if (selectedTool !== 'polygon') return null
  
  return (
    <div onClick={handleCanvasClick}>
      {/* Render polygon vertices */}
      {toolTempState.polygon.vertices.map((vertex, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: vertex.x - 2,
            top: vertex.y - 2,
            width: 4,
            height: 4,
            background: 'red'
          }}
        />
      ))}
      <button onClick={clearPolygon}>Clear</button>
    </div>
  )
}
```

## Integration with Dungeon Store

The UI store is designed to work alongside the existing dungeon store:

```tsx
import { useDungeonStore } from './store'
import { useUIStore, useSelectedTool } from './uiStore'

const Canvas = () => {
  // Get data from dungeon store
  const { tiles, currentLayer, setTile } = useDungeonStore()
  
  // Get UI state from UI store
  const selectedTool = useSelectedTool()
  const { brushSettings } = useUIStore()
  
  const handleCanvasClick = (x, y) => {
    if (selectedTool === 'draw') {
      // Use brush settings from UI store and apply to dungeon data
      setTile(x, y, 'floor') // This goes to dungeon store
    }
  }
  
  return (
    <canvas onClick={handleCanvasClick}>
      {/* Render tiles from dungeon store */}
      {/* Apply viewport transform from UI store */}
    </canvas>
  )
}
```

## State Persistence

The UI store is designed for transient state and does not persist data. If you need certain UI preferences to persist (like grid settings), you should:

1. Export the preferences to localStorage
2. Initialize the store with saved preferences
3. Or use a separate persistence layer

## Type Safety

All types are exported for use throughout the application:

```tsx
import type { 
  Tool, 
  BrushSettings, 
  ViewportTransform, 
  GenerationParameters 
} from './uiStore'
```

## Performance Considerations

- Use selector hooks instead of subscribing to the entire store
- Tool temp state is automatically cleared when switching tools
- Grid snapping calculations are memoized
- Viewport transforms use partial updates to minimize re-renders

## Extension Points

To add new tools or UI state:

1. Add the tool to the `Tool` type union
2. Add tool-specific state to `ToolTempState` interface
3. Add actions for managing the tool state
4. Add default values to `defaultToolTempState`
5. Update `clearAllTempState` to include new tool state
