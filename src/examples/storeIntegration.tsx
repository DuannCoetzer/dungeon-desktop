import React from 'react'
import { useMapStore, useTiles, useCurrentLayer } from '../mapStore'
import { useUIStore, useSelectedTool, useBrushSettings, useViewportTransform, snapPointToGrid } from '../uiStore'

// Example component demonstrating integration between UI store and map store
export const IntegratedCanvas: React.FC = () => {
  // Map data from map store
  const tiles = useTiles()
  const currentLayer = useCurrentLayer()
  const setTile = useMapStore(state => state.setTile)
  const eraseTile = useMapStore(state => state.eraseTile)
  
  // UI state from UI store
  const selectedTool = useSelectedTool()
  const brushSettings = useBrushSettings()
  const viewportTransform = useViewportTransform()
  const { isSnapToGrid, gridSize } = useUIStore(state => ({
    isSnapToGrid: state.isSnapToGrid,
    gridSize: state.gridSize
  }))
  
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    
    // Convert screen coordinates to world coordinates
    let worldX = (event.clientX - rect.left - viewportTransform.x) / viewportTransform.scale
    let worldY = (event.clientY - rect.top - viewportTransform.y) / viewportTransform.scale
    
    // Snap to grid if enabled
    if (isSnapToGrid) {
      const snapped = snapPointToGrid({ x: worldX, y: worldY }, gridSize)
      worldX = snapped.x
      worldY = snapped.y
    }
    
    // Convert to tile coordinates
    const tileX = Math.floor(worldX / 32) // Assuming 32px tiles
    const tileY = Math.floor(worldY / 32)
    
    // Apply tool action based on selected tool and brush settings
    switch (selectedTool) {
      case 'draw':
        applyBrushAction(tileX, tileY, 'draw')
        break
      case 'erase':
        applyBrushAction(tileX, tileY, 'erase')
        break
      case 'select':
        // Selection would be handled by UI store
        // updateSelection(tileX, tileY)
        break
      // Other tools would have their own handlers
    }
  }
  
  const applyBrushAction = (centerX: number, centerY: number, action: 'draw' | 'erase') => {
    const brushSize = brushSettings.size
    const radius = Math.floor(brushSize / 2)
    
    // Apply brush in a circular pattern
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        
        if (distance <= radius) {
          // Calculate opacity based on brush settings and distance
          const opacity = brushSettings.opacity * (1 - (distance / radius) * (1 - brushSettings.hardness))
          
          if (opacity > 0.1) { // Only apply if opacity is significant
            if (action === 'draw') {
              setTile(x, y, 'floor') // This could be based on selected palette
            } else if (action === 'erase') {
              eraseTile(x, y)
            }
          }
        }
      }
    }
  }
  
  // Render tiles with viewport transform applied
  const renderTiles = () => {
    const tileElements: React.JSX.Element[] = []
    const currentTiles = tiles[currentLayer]
    
    Object.entries(currentTiles).forEach(([key, tileType]) => {
      const [x, y] = key.split(',').map(Number)
      
      // Apply viewport transform
      const screenX = x * 32 * viewportTransform.scale + viewportTransform.x
      const screenY = y * 32 * viewportTransform.scale + viewportTransform.y
      
      tileElements.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            left: screenX,
            top: screenY,
            width: 32 * viewportTransform.scale,
            height: 32 * viewportTransform.scale,
            backgroundColor: tileType === 'wall' ? '#666' : '#8b4513',
            border: '1px solid #333'
          }}
        />
      )
    })
    
    return tileElements
  }
  
  return (
    <div className="integrated-canvas">
      {/* Tool info display */}
      <div className="tool-info" style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: 8,
        borderRadius: 4,
        fontSize: 12
      }}>
        <div>Tool: {selectedTool}</div>
        <div>Brush Size: {brushSettings.size}</div>
        <div>Layer: {currentLayer}</div>
        <div>Zoom: {(viewportTransform.scale * 100).toFixed(0)}%</div>
        <div>Grid Snap: {isSnapToGrid ? 'ON' : 'OFF'}</div>
      </div>
      
      {/* Canvas area */}
      <div
        className="canvas"
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          border: '2px solid #ccc',
          overflow: 'hidden',
          cursor: getCursorForTool(selectedTool)
        }}
        onClick={handleCanvasClick}
      >
        {renderTiles()}
        
        {/* Grid overlay if visible */}
        {useUIStore(state => state.isGridVisible) && (
          <GridOverlay 
            transform={viewportTransform} 
            gridSize={gridSize} 
          />
        )}
      </div>
    </div>
  )
}

// Helper component for rendering grid
const GridOverlay: React.FC<{ 
  transform: { x: number, y: number, scale: number }, 
  gridSize: number 
}> = ({ transform, gridSize }) => {
  const scaledGridSize = gridSize * transform.scale
  
  if (scaledGridSize < 4) return null // Don't render if too small
  
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <defs>
          <pattern 
            id="grid" 
            width={scaledGridSize} 
            height={scaledGridSize} 
            patternUnits="userSpaceOnUse"
            x={transform.x % scaledGridSize}
            y={transform.y % scaledGridSize}
          >
            <path 
              d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`} 
              fill="none" 
              stroke="#ddd" 
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

// Helper function to get appropriate cursor for tool
const getCursorForTool = (tool: string): string => {
  switch (tool) {
    case 'draw':
      return 'crosshair'
    case 'erase':
      return 'crosshair'
    case 'select':
      return 'default'
    case 'rect':
    case 'line':
    case 'circle':
    case 'polygon':
      return 'crosshair'
    case 'freehand':
      return 'crosshair'
    default:
      return 'default'
  }
}

// Example component showing viewport controls integrated with the canvas
export const ViewportControls: React.FC = () => {
  const viewportTransform = useViewportTransform()
  const { setViewportTransform, resetViewport } = useUIStore()
  
  const pan = (dx: number, dy: number) => {
    setViewportTransform({
      x: viewportTransform.x + dx,
      y: viewportTransform.y + dy
    })
  }
  
  const zoom = (factor: number, centerX = 0, centerY = 0) => {
    const newScale = Math.max(0.1, Math.min(5, viewportTransform.scale * factor))
    
    // Zoom towards the center point
    setViewportTransform({
      scale: newScale,
      x: centerX - (centerX - viewportTransform.x) * factor,
      y: centerY - (centerY - viewportTransform.y) * factor
    })
  }
  
  return (
    <div className="viewport-controls" style={{
      position: 'absolute',
      bottom: 10,
      right: 10,
      display: 'flex',
      gap: 8,
      background: 'rgba(255,255,255,0.9)',
      padding: 8,
      borderRadius: 4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <button onClick={() => pan(-50, 0)}>←</button>
      <button onClick={() => pan(50, 0)}>→</button>
      <button onClick={() => pan(0, -50)}>↑</button>
      <button onClick={() => pan(0, 50)}>↓</button>
      <button onClick={() => zoom(1.2)}>+</button>
      <button onClick={() => zoom(0.8)}>-</button>
      <button onClick={resetViewport}>⌂</button>
    </div>
  )
}

// Complete example combining everything
export const DungeonEditorIntegration: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      <IntegratedCanvas />
      <ViewportControls />
    </div>
  )
}
