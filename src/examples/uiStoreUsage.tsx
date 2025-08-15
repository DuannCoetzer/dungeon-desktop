import React from 'react'
import { 
  useUIStore, 
  useSelectedTool,
  useBrushSettings,
  useViewportTransform,
  useGridSettings,
  snapPointToGrid,
  type Tool 
} from '../uiStore'

// Example component showing how to use the UI store for tool selection
export const ToolPanel: React.FC = () => {
  const selectedTool = useSelectedTool()
  const setSelectedTool = useUIStore(state => state.setSelectedTool)
  
  const tools: Tool[] = ['select', 'draw', 'erase', 'rect', 'line', 'circle', 'polygon', 'freehand']
  
  return (
    <div className="tool-panel">
      <h3>Tools</h3>
      {tools.map(tool => (
        <button
          key={tool}
          className={selectedTool === tool ? 'active' : ''}
          onClick={() => setSelectedTool(tool)}
        >
          {tool}
        </button>
      ))}
    </div>
  )
}

// Example component for brush settings
export const BrushPanel: React.FC = () => {
  const brushSettings = useBrushSettings()
  const { setBrushSize, setBrushOpacity, setBrushHardness } = useUIStore()
  
  return (
    <div className="brush-panel">
      <h3>Brush Settings</h3>
      <div>
        <label>Size: {brushSettings.size}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSettings.size}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Opacity: {Math.round(brushSettings.opacity * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={brushSettings.opacity}
          onChange={(e) => setBrushOpacity(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Hardness: {Math.round(brushSettings.hardness * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={brushSettings.hardness}
          onChange={(e) => setBrushHardness(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

// Example component for viewport controls
export const ViewportPanel: React.FC = () => {
  const viewportTransform = useViewportTransform()
  const { setViewportTransform, resetViewport } = useUIStore()
  
  return (
    <div className="viewport-panel">
      <h3>Viewport</h3>
      <div>
        <p>Position: ({viewportTransform.x}, {viewportTransform.y})</p>
        <p>Scale: {viewportTransform.scale.toFixed(2)}x</p>
      </div>
      <div>
        <button onClick={() => setViewportTransform({ scale: viewportTransform.scale * 1.2 })}>
          Zoom In
        </button>
        <button onClick={() => setViewportTransform({ scale: viewportTransform.scale / 1.2 })}>
          Zoom Out
        </button>
        <button onClick={resetViewport}>
          Reset View
        </button>
      </div>
    </div>
  )
}

// Example component for grid settings
export const GridPanel: React.FC = () => {
  const gridSettings = useGridSettings()
  const { toggleGrid, toggleSnapToGrid, setGridSize } = useUIStore()
  
  return (
    <div className="grid-panel">
      <h3>Grid Settings</h3>
      <div>
        <label>
          <input
            type="checkbox"
            checked={gridSettings.isGridVisible}
            onChange={toggleGrid}
          />
          Show Grid
        </label>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={gridSettings.isSnapToGrid}
            onChange={toggleSnapToGrid}
          />
          Snap to Grid
        </label>
      </div>
      <div>
        <label>Grid Size: {gridSettings.gridSize}px</label>
        <input
          type="range"
          min="8"
          max="128"
          step="8"
          value={gridSettings.gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

// Example component showing polygon tool usage
export const PolygonTool: React.FC = () => {
  const selectedTool = useSelectedTool()
  const toolTempState = useUIStore(state => state.toolTempState)
  const { addPolygonVertex, removeLastPolygonVertex, completePolygon, clearPolygon } = useUIStore()
  const gridSettings = useGridSettings()
  
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="polygon-tool">
      <h3>Polygon Tool</h3>
      <div 
        className="canvas-area"
        style={{ width: 400, height: 300, border: '1px solid #ccc', position: 'relative' }}
        onClick={handleCanvasClick}
      >
        {/* Render polygon vertices */}
        {toolTempState.polygon.vertices.map((vertex, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: vertex.x - 3,
              top: vertex.y - 3,
              width: 6,
              height: 6,
              background: 'red',
              borderRadius: '50%'
            }}
          />
        ))}
        
        {/* Render polygon lines */}
        {toolTempState.polygon.vertices.length > 1 && (
          <svg 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {toolTempState.polygon.vertices.slice(1).map((vertex, index) => {
              const prevVertex = toolTempState.polygon.vertices[index]
              return (
                <line
                  key={index}
                  x1={prevVertex.x}
                  y1={prevVertex.y}
                  x2={vertex.x}
                  y2={vertex.y}
                  stroke="blue"
                  strokeWidth="2"
                />
              )
            })}
            {/* Close the polygon if complete */}
            {toolTempState.polygon.isComplete && toolTempState.polygon.vertices.length > 2 && (
              <line
                x1={toolTempState.polygon.vertices[toolTempState.polygon.vertices.length - 1].x}
                y1={toolTempState.polygon.vertices[toolTempState.polygon.vertices.length - 1].y}
                x2={toolTempState.polygon.vertices[0].x}
                y2={toolTempState.polygon.vertices[0].y}
                stroke="blue"
                strokeWidth="2"
              />
            )}
          </svg>
        )}
      </div>
      
      <div className="polygon-controls">
        <p>Vertices: {toolTempState.polygon.vertices.length}</p>
        <button onClick={removeLastPolygonVertex} disabled={toolTempState.polygon.vertices.length === 0}>
          Remove Last Vertex
        </button>
        <button onClick={completePolygon} disabled={toolTempState.polygon.vertices.length < 3}>
          Complete Polygon
        </button>
        <button onClick={clearPolygon}>
          Clear Polygon
        </button>
      </div>
    </div>
  )
}

// Example of combining UI store with dungeon store
export const DungeonEditor: React.FC = () => {
  return (
    <div className="dungeon-editor">
      <div className="sidebar">
        <ToolPanel />
        <BrushPanel />
        <ViewportPanel />
        <GridPanel />
      </div>
      <div className="main-area">
        <PolygonTool />
        {/* Canvas would go here, using both stores:
            - UI store for current tool, brush settings, viewport
            - Dungeon store for actual tile data, layers, etc.
        */}
      </div>
    </div>
  )
}
