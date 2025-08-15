import { useEffect, useRef, useState } from 'react'
import { useDrop } from 'react-dnd'
import { IconSelect, IconDraw, IconErase, TileGrass, TileWall } from '../assets'
import { useMapStore, useCurrentLayer, useLayerSettings, useSelectedPalette, useAssetInstances } from '../mapStore'
import { useUIStore, useSelectedTool } from '../uiStore'
import { type Asset, type AssetInstance } from '../store'
import { toolManager } from '../tools'
import type { PointerEventContext, RenderContext } from '../tools'
import { AssetPanel } from '../components/AssetPanel'
import { AssetInstanceComponent } from '../components/AssetInstance'
import { GenerationParametersPanel } from '../components/GenerationParametersPanel'
import { FileOperationsPanel } from '../components/FileOperationsPanel'
import { ToolSettingsPanel } from '../components/ToolSettingsPanel'
import { useAllAssets } from '../store/assetStore'
import { preloadAllTileImages, renderTile } from '../utils/tileRenderer'
import type { Palette } from '../store'

const TILE = 32

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const [, setDragTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 })

  // UI state from UI store
  const tool = useSelectedTool()
  const setTool = useUIStore(state => state.setSelectedTool)
  const isGridVisible = useUIStore(state => state.isGridVisible)
  const isSnapToGrid = useUIStore(state => state.isSnapToGrid)
  const toggleGrid = useUIStore(state => state.toggleGrid)
  const toggleSnapToGrid = useUIStore(state => state.toggleSnapToGrid)
  
  // Map state from map store
  const selected = useSelectedPalette()
  const setSelected = useMapStore(state => state.setSelected)
  const assetInstances = useAssetInstances()
  const addAssetInstance = useMapStore(state => state.addAssetInstance)
  // const clearAssetSelection = useMapStore(state => state.clearAssetSelection)

  // Assets from persistent store
  const assets = useAllAssets()

  // Camera transform state - exposed to track canvas transforms
  const [cameraTransform, setCameraTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 })


  // Handle asset drop on canvas
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'asset',
    drop: (item: { asset: Asset }, monitor) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const clientOffset = monitor.getClientOffset()
      
      if (!canvasRect || !clientOffset) return
      
      const x = clientOffset.x - canvasRect.left
      const y = clientOffset.y - canvasRect.top
      
      // Use current camera transform values directly
      const { scale, offsetX, offsetY } = cameraTransform
      
      // Convert screen position to world position
      const worldX = (x - offsetX) / (TILE * scale)
      const worldY = (y - offsetY) / (TILE * scale)
      
      // Snap to grid if enabled (check UI store snap setting)
      const { isSnapToGrid } = useUIStore.getState()
      const snappedX = isSnapToGrid ? Math.round(worldX) : worldX
      const snappedY = isSnapToGrid ? Math.round(worldY) : worldY
      
      // Use grid dimensions from asset, with fallback to 1x1 for backward compatibility
      const gridWidth = item.asset.gridWidth || 1
      const gridHeight = item.asset.gridHeight || 1
      
      // Calculate the actual size based on grid dimensions
      const actualWidth = TILE * gridWidth
      const actualHeight = TILE * gridHeight
      
      // Create new asset instance with proper grid dimensions
      const newAssetInstance: AssetInstance = {
        id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetId: item.asset.id,
        x: snappedX,
        y: snappedY,
        width: actualWidth,
        height: actualHeight,
        rotation: 0,
        gridWidth,
        gridHeight,
      }
      
      addAssetInstance(newAssetInstance)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [cameraTransform, addAssetInstance])

  // Update drag transform whenever camera changes  
  useEffect(() => {
    setDragTransform(cameraTransform)
  }, [cameraTransform])

  // Helper function to handle tool switching with cleanup
  const handleToolSwitch = (newTool: typeof tool) => {
    // Reset polygon tool if switching away from it
    if (tool === 'polygon') {
      const polygonTool = toolManager.getTool('polygon')
      if ('reset' in polygonTool && typeof polygonTool.reset === 'function') {
        polygonTool.reset()
      }
    }
    setTool(newTool)
  }
  const currentLayer = useCurrentLayer()
  const setLayer = useMapStore(state => state.setLayer)
  const layerSettings = useLayerSettings()
  const toggleLayer = useMapStore(state => state.toggleLayer)
  const setLayerOpacity = useMapStore(state => state.setLayerOpacity)

  // Preload tile images on component mount
  useEffect(() => {
    preloadAllTileImages()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    // camera state for pan/zoom - use state directly instead of props
    let scale = 1
    let offsetX = 0
    let offsetY = 0

    const resize = () => {
      canvas.width = stage.clientWidth
      canvas.height = stage.clientHeight
      scheduleDraw()
    }

    const worldToScreen = (x: number, y: number) => ({
      sx: x * TILE * scale + offsetX,
      sy: y * TILE * scale + offsetY,
    })
    const screenToTile = (px: number, py: number) => {
      const wx = (px - offsetX) / (TILE * scale)
      const wy = (py - offsetY) / (TILE * scale)
      return { x: Math.floor(wx), y: Math.floor(wy) }
    }

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Only draw grid lines if grid is visible
      const { isGridVisible } = useUIStore.getState()
      if (isGridVisible) {
        ctx.strokeStyle = '#2a2a2a'
        ctx.lineWidth = 1
        // visible tile bounds
        const left = screenToTile(0, 0).x - 1
        const top = screenToTile(0, 0).y - 1
        const right = screenToTile(canvas.width, canvas.height).x + 2
        const bottom = screenToTile(canvas.width, canvas.height).y + 2
        for (let x = left; x <= right; x++) {
          const { sx } = worldToScreen(x, 0)
          ctx.beginPath(); ctx.moveTo(sx + 0.5, 0); ctx.lineTo(sx + 0.5, canvas.height); ctx.stroke()
        }
        for (let y = top; y <= bottom; y++) {
          const { sy } = worldToScreen(0, y)
          ctx.beginPath(); ctx.moveTo(0, sy + 0.5); ctx.lineTo(canvas.width, sy + 0.5); ctx.stroke()
        }
      }
    }

    const drawTiles = () => {
      const { tiles } = useMapStore.getState().mapData
      const order: Array<keyof typeof tiles> = ['floor', 'walls', 'objects']
      for (const layer of order) {
        const settings = useMapStore.getState().layerSettings[layer]
        if (!settings.visible) continue
        const prevAlpha = ctx.globalAlpha
        ctx.globalAlpha = settings.opacity
        for (const k of Object.keys(tiles[layer])) {
          const [tx, ty] = k.split(',').map(Number)
          const { sx, sy } = worldToScreen(tx, ty)
          const size = Math.ceil(TILE * scale)
          const tileType = tiles[layer][k] as Palette
          
          // Use the new tile renderer with image support
          renderTile(ctx, tileType, sx, sy, size)
        }
        ctx.globalAlpha = prevAlpha
      }
    }

    let raf = 0
    const drawAll = () => { 
      drawGrid(); 
      drawTiles();
      
      // Render tool preview layer
      const currentTool = toolManager.getTool(useUIStore.getState().selectedTool)
      const renderContext: RenderContext = {
        ctx,
        worldToScreen,
        screenToTile,
        scale,
        tileSize: TILE
      }
      currentTool.renderPreview(renderContext)
    }
    const scheduleDraw = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => drawAll())
    }

    // Handle input
    const handleDown = (px: number, py: number, event: PointerEvent | MouseEvent) => {
      const isRightClick = event.button === 2
      if (isRightClick) {
        // Right-click for quick erase functionality
        const { x, y } = screenToTile(px, py)
        const eraseTile = useMapStore.getState().eraseTile
        eraseTile(x, y)
        scheduleDraw()
        return
      }

      // Check if we clicked on an asset instance for selection
      for (const assetInstance of useMapStore.getState().mapData.assetInstances) {
        const { sx, sy } = worldToScreen(assetInstance.x, assetInstance.y)
        const width = assetInstance.width * scale
        const height = assetInstance.height * scale
        
        if (px >= sx && px <= sx + width && py >= sy && py <= sy + height) {
          // Asset was clicked, don't propagate to tool
          return
        }
      }

      // Convert screen coordinates to tile coordinates
      const { x: tileX, y: tileY } = screenToTile(px, py)
      
      // Build proper PointerEventContext for tools
      const context: PointerEventContext = {
        x: px,
        y: py,
        tileX,
        tileY,
        button: event.button,
        buttons: event.buttons,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey
      }
      
      const currentTool = toolManager.getTool(useUIStore.getState().selectedTool)
      currentTool.onDown(context)
      scheduleDraw() // Trigger redraw after tool operation
    }

    const handleMove = (px: number, py: number, event?: PointerEvent | MouseEvent) => {
      // Convert screen coordinates to tile coordinates
      const { x: tileX, y: tileY } = screenToTile(px, py)
      
      // Build proper PointerEventContext for tools
      const context: PointerEventContext = {
        x: px,
        y: py,
        tileX,
        tileY,
        button: event?.button ?? 0,
        buttons: event?.buttons ?? 0,
        shiftKey: event?.shiftKey ?? false,
        ctrlKey: event?.ctrlKey ?? false,
        altKey: event?.altKey ?? false
      }
      
      const currentTool = toolManager.getTool(useUIStore.getState().selectedTool)
      currentTool.onMove(context)
      scheduleDraw() // Trigger redraw after tool operation
    }

    const handleUp = (px: number, py: number, event?: PointerEvent | MouseEvent) => {
      // Convert screen coordinates to tile coordinates
      const { x: tileX, y: tileY } = screenToTile(px, py)
      
      // Build proper PointerEventContext for tools
      const context: PointerEventContext = {
        x: px,
        y: py,
        tileX,
        tileY,
        button: event?.button ?? 0,
        buttons: event?.buttons ?? 0,
        shiftKey: event?.shiftKey ?? false,
        ctrlKey: event?.ctrlKey ?? false,
        altKey: event?.altKey ?? false
      }
      
      const currentTool = toolManager.getTool(useUIStore.getState().selectedTool)
      currentTool.onUp(context)
      scheduleDraw() // Trigger redraw after tool operation
    }

    const handleWheel = (event: WheelEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      
      // Convert screen coordinates to tile coordinates
      const { x: tileX, y: tileY } = screenToTile(px, py)
      
      // Build proper PointerEventContext for tools with wheel data
      const context: PointerEventContext & { deltaX: number; deltaY: number } = {
        x: px,
        y: py,
        tileX,
        tileY,
        button: 0, // wheel events don't have button info
        buttons: 0,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        deltaX: event.deltaX,
        deltaY: event.deltaY
      }
      
      const currentTool = toolManager.getTool(useUIStore.getState().selectedTool)
      currentTool.onWheel(context)
    }

    // Mouse events
    let isDragging = false
    let lastX = 0, lastY = 0
    let dragButton = -1 // Track which button initiated drag

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      
      if (e.button === 1) { // Middle button for pan
        isDragging = true
        lastX = px
        lastY = py
        dragButton = 1
        canvas.style.cursor = 'grabbing'
      } else {
        handleDown(px, py, e)
        dragButton = e.button
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      
      if (isDragging && dragButton === 1) {
        // Pan with middle mouse button
        const dx = px - lastX
        const dy = py - lastY
        offsetX += dx
        offsetY += dy
        lastX = px
        lastY = py
        
        // Update the camera transform state
        setCameraTransform({ scale, offsetX, offsetY })
        scheduleDraw()
      } else {
        handleMove(px, py, e)
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left  
      const py = e.clientY - rect.top
      
      if (isDragging && e.button === 1) {
        isDragging = false
        canvas.style.cursor = 'default'
      } else {
        handleUp(px, py, e)
      }
      dragButton = -1
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      
      // Check if any modifier keys are pressed to allow tool-specific wheel handling
      if (e.ctrlKey || e.shiftKey || e.altKey) {
        handleWheel(e)
        return
      }
      
      // Default zoom behavior
      const zoomSensitivity = 0.1
      const zoomFactor = e.deltaY > 0 ? (1 - zoomSensitivity) : (1 + zoomSensitivity)
      
      // Calculate zoom around mouse position
      const oldScale = scale
      scale = Math.max(0.25, Math.min(4, scale * zoomFactor))
      
      if (scale !== oldScale) {
        // Adjust offset to zoom around mouse position
        offsetX = px - (px - offsetX) * (scale / oldScale)
        offsetY = py - (py - offsetY) * (scale / oldScale)
        
        // Update the camera transform state
        setCameraTransform({ scale, offsetX, offsetY })
        scheduleDraw()
      }
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault() // Prevent browser context menu
    }

    // Attach event listeners
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('resize', resize)

    // Initial setup
    resize()

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove) 
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', resize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [isGridVisible, isSnapToGrid, layerSettings])

  return (
    <div className="workspace">
      {/* Sidebar */}
      <div className="sidebar">
        <FileOperationsPanel />
        
        {/* Tools */}
        <div className="toolbar-section">
          <h3 className="toolbar-title">Tools</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            <button 
              className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('select')}
              title="Select Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'select' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={IconSelect} alt="Select" style={{ width: '16px', height: '16px' }} />
            </button>
            <button 
              className={`tool-btn ${tool === 'draw' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('draw')}
              title="Draw Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'draw' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={IconDraw} alt="Draw" style={{ width: '16px', height: '16px' }} />
            </button>
            <button 
              className={`tool-btn ${tool === 'erase' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('erase')}
              title="Erase Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'erase' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={IconErase} alt="Erase" style={{ width: '16px', height: '16px' }} />
            </button>
            <button 
              className={`tool-btn ${tool === 'rect' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('rect')}
              title="Rectangle Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'rect' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⬛
            </button>
            <button 
              className={`tool-btn ${tool === 'line' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('line')}
              title="Line Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'line' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⟍
            </button>
            <button 
              className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('circle')}
              title="Circle Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'circle' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ○
            </button>
            <button 
              className={`tool-btn ${tool === 'polygon' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('polygon')}
              title="Polygon Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'polygon' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⬟
            </button>
            <button 
              className={`tool-btn ${tool === 'freehand' ? 'active' : ''}`}
              onClick={() => handleToolSwitch('freehand')}
              title="Freehand Tool"
              style={{ 
                padding: '8px', 
                background: tool === 'freehand' ? '#7c8cff' : '#141821',
                border: '1px solid #1f2430',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✎
            </button>
          </div>
          
          {/* Grid and Snap Settings */}
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input
                type="checkbox"
                id="snapToGrid"
                checked={isSnapToGrid}
                onChange={toggleSnapToGrid}
                style={{ margin: 0 }}
              />
              <label htmlFor="snapToGrid" style={{ color: '#e6e6e6' }}>Snap to Grid</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input
                type="checkbox"
                id="showGrid"
                checked={isGridVisible}
                onChange={toggleGrid}
                style={{ margin: 0 }}
              />
              <label htmlFor="showGrid" style={{ color: '#e6e6e6' }}>Show Grid</label>
            </div>
          </div>
        </div>

        <ToolSettingsPanel />

        {/* Layers */}
        <div className="toolbar-section">
          <h3 className="toolbar-title">Layers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.entries(layerSettings).map(([layer, settings]) => (
              <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <button
                  onClick={() => setLayer(layer as typeof currentLayer)}
                  style={{ 
                    padding: '4px 8px',
                    background: currentLayer === layer ? '#7c8cff' : '#141821',
                    border: '1px solid #1f2430',
                    borderRadius: '4px',
                    fontSize: '10px',
                    minWidth: '50px'
                  }}
                >
                  {layer}
                </button>
                <input
                  type="checkbox"
                  checked={settings.visible}
                  onChange={() => toggleLayer(layer as typeof currentLayer)}
                  title="Toggle visibility"
                  style={{ margin: 0 }}
                />
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.opacity}
                  onChange={(e) => setLayerOpacity(layer as typeof currentLayer, parseFloat(e.target.value))}
                  title="Adjust opacity"
                  style={{ width: '60px' }}
                />
              </div>
            ))}
          </div>
        </div>

        <AssetPanel />
        <GenerationParametersPanel />
      </div>

      {/* Canvas */}
      <div className="stage" ref={drop as any}>
        <canvas 
          ref={(ref) => {
            canvasRef.current = ref
            stageRef.current = ref?.parentElement as HTMLElement
          }} 
          className="canvas"
          style={{ 
            backgroundColor: isOver ? 'rgba(0, 122, 204, 0.1)' : 'transparent'
          }} 
        />
        {/* Asset instances overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {assetInstances.map(instance => {
            const asset = assets.find(a => a.id === instance.assetId)
            return (
              <AssetInstanceComponent
                key={instance.id}
                instance={instance}
                asset={asset}
                worldToScreen={(x, y) => ({
                  sx: x * TILE * cameraTransform.scale + cameraTransform.offsetX,
                  sy: y * TILE * cameraTransform.scale + cameraTransform.offsetY
                })}
                screenToTile={(px, py) => ({
                  x: Math.floor((px - cameraTransform.offsetX) / (TILE * cameraTransform.scale)),
                  y: Math.floor((py - cameraTransform.offsetY) / (TILE * cameraTransform.scale))
                })}
                scale={cameraTransform.scale}
                tileSize={TILE}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
