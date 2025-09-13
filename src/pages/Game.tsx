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
import { ImageMapImporter } from '../components/ImageMapImporter'
import { TileBrowser } from '../components/TileBrowser'
import { useAllAssets } from '../store/assetStore'
import { useTileStore } from '../store/tileStore'
import { preloadAllTileImages, renderTile, renderTileWithBlending, renderSmartTile, invalidateTileCache } from '../utils/tileRenderer'
import { applyParchmentBackground } from '../utils/canvasUtils'
import { isDebugLoggingEnabled } from '../store/settingsStore'
import type { Palette } from '../store'
import { About } from '../components/About'

const TILE = 32

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const [, setDragTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 })
  
  // Image map importer state
  const [isImageImporterOpen, setIsImageImporterOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [debugConsole, setDebugConsole] = useState<string[]>([])
  const [showDebugConsole, setShowDebugConsole] = useState(false)
  
  // Tile store
  const tileStore = useTileStore()

  // UI state from UI store
  const tool = useSelectedTool()
  const setTool = useUIStore(state => state.setSelectedTool)
  const isGridVisible = useUIStore(state => state.isGridVisible)
  const isSnapToGrid = useUIStore(state => state.isSnapToGrid)
  const isTileBlendingEnabled = useUIStore(state => state.isTileBlendingEnabled)
  const toggleGrid = useUIStore(state => state.toggleGrid)
  const toggleSnapToGrid = useUIStore(state => state.toggleSnapToGrid)
  const toggleTileBlending = useUIStore(state => state.toggleTileBlending)
  
  // Map state from map store
  const selected = useSelectedPalette()
  const setSelected = useMapStore(state => state.setSelected)
  const assetInstances = useAssetInstances()
  const addAssetInstance = useMapStore(state => state.addAssetInstance)
  const resetMap = useMapStore(state => state.reset)
  // const clearAssetSelection = useMapStore(state => state.clearAssetSelection)

  // Assets from persistent store
  const assets = useAllAssets()

  // Camera transform state - using refs to avoid re-render loops
  const cameraTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 })
  const [cameraTransform, setCameraTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 })
  
  // Handle image import completion
  const handleImageImported = () => {
    setIsImageImporterOpen(false)
    // Trigger a canvas redraw to show the new map data
    // The canvas will automatically pick up the updated map data from the store
  }


  // Handle asset drop on canvas
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'asset',
    canDrop: () => {
      console.log('✅ Can drop asset on canvas')
      return true
    },
    drop: (item: { asset: Asset }, monitor) => {
      if (isDebugLoggingEnabled()) {
        console.log('🎯 Asset drop received:', item.asset.name)
        console.log('🎯 Drop monitor info:', {
          canDrop: monitor.canDrop(),
          isOver: monitor.isOver(),
          didDrop: monitor.didDrop()
        })
      }
      
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const clientOffset = monitor.getClientOffset()
      
      if (!canvasRect || !clientOffset) {
        if (isDebugLoggingEnabled()) {
          console.log('⚠️ Drop failed: no canvas rect or client offset')
        }
        return
      }
      
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
      
      if (isDebugLoggingEnabled()) {
        console.log('✅ Asset instance created:', newAssetInstance)
      }
      addAssetInstance(newAssetInstance)
      return { success: true } // Return success result to drag source
    },
    hover: (item, monitor) => {
      if (isDebugLoggingEnabled()) {
        console.log('🔍 Asset hovering over drop zone:', item.asset.name)
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [cameraTransform, addAssetInstance])
  
  // Add custom drop event listener for native asset drag in desktop mode
  useEffect(() => {
    const handleCustomAssetDrop = (e: CustomEvent) => {
      console.log('🎯 Custom asset drop event received:', e.detail)
      
      const { asset, clientX, clientY } = e.detail
      const canvas = canvasRef.current
      
      if (!canvas) {
        console.log('⚠️ No canvas found for custom asset drop')
        return
      }
      
      const canvasRect = canvas.getBoundingClientRect()
      const x = clientX - canvasRect.left
      const y = clientY - canvasRect.top
      
      // Use current camera transform values directly
      const { scale, offsetX, offsetY } = cameraTransform
      
      // Convert screen position to world position
      const worldX = (x - offsetX) / (TILE * scale)
      const worldY = (y - offsetY) / (TILE * scale)
      
      // Snap to grid if enabled
      const { isSnapToGrid } = useUIStore.getState()
      const snappedX = isSnapToGrid ? Math.round(worldX) : worldX
      const snappedY = isSnapToGrid ? Math.round(worldY) : worldY
      
      // Use grid dimensions from asset
      const gridWidth = asset.gridWidth || 1
      const gridHeight = asset.gridHeight || 1
      
      // Calculate the actual size based on grid dimensions
      const actualWidth = TILE * gridWidth
      const actualHeight = TILE * gridHeight
      
      // Create new asset instance
      const newAssetInstance: AssetInstance = {
        id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetId: asset.id,
        x: snappedX,
        y: snappedY,
        width: actualWidth,
        height: actualHeight,
        rotation: 0,
        gridWidth,
        gridHeight,
      }
      
      console.log('✅ Custom asset instance created:', newAssetInstance)
      addAssetInstance(newAssetInstance)
    }
    
    const stageElement = document.querySelector('.stage')
    if (stageElement) {
      stageElement.addEventListener('asset-drop', handleCustomAssetDrop as EventListener)
      return () => {
        stageElement.removeEventListener('asset-drop', handleCustomAssetDrop as EventListener)
      }
    }
  }, [cameraTransform, addAssetInstance])

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
  
  // Handle clear map with confirmation
  const handleClearMap = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the entire map?\n\nThis will remove all tiles and assets. This action cannot be undone.'
    )
    if (confirmed) {
      resetMap()
    }
  }
  const currentLayer = useCurrentLayer()
  const setLayer = useMapStore(state => state.setLayer)
  const layerSettings = useLayerSettings()
  const toggleLayer = useMapStore(state => state.toggleLayer)
  const setLayerOpacity = useMapStore(state => state.setLayerOpacity)

  // Intercept console logs for debug panel
  useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    
    console.log = (...args: any[]) => {
      originalConsoleLog(...args)
      if (isDebugLoggingEnabled()) {
        setDebugConsole(prev => [...prev.slice(-49), `LOG: ${args.join(' ')}`]) // Keep last 50 messages
      }
    }
    
    console.error = (...args: any[]) => {
      originalConsoleError(...args)
      setDebugConsole(prev => [...prev.slice(-49), `ERROR: ${args.join(' ')}`])
    }
    
    console.warn = (...args: any[]) => {
      originalConsoleWarn(...args)
      setDebugConsole(prev => [...prev.slice(-49), `WARN: ${args.join(' ')}`])
    }
    
    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [])

  // Preload tile images and initialize tile store on component mount
  useEffect(() => {
    preloadAllTileImages()
    
  // Initialize tile store with default tiles
    tileStore.loadDefaultTiles()
    
    // Add keyboard shortcut for debug console (F12)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        setShowDebugConsole(prev => !prev)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    
    let ctx: CanvasRenderingContext2D
    try {
      // Try optimized context first
      ctx = canvas.getContext('2d', { 
        alpha: false, // Disable alpha for better performance
        desynchronized: true, // Enable low-latency rendering
        willReadFrequently: false // Optimize for writing, not reading
      })!
    } catch (error) {
      // Fallback to basic context if optimized fails
      console.warn('Optimized canvas context failed, using fallback:', error)
      ctx = canvas.getContext('2d')!
    }
    
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }
    
    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false
    
    // GPU acceleration hints (safe fallback)
    try {
      if ('webkitBackingStorePixelRatio' in ctx) {
        (ctx as any).webkitBackingStorePixelRatio = 1
      }
    } catch (e) {
      // Ignore if not supported
    }

    // Use shared parchment pattern functionality

    // camera state for pan/zoom - use state directly instead of props
    let scale = 1
    let offsetX = 0
    let offsetY = 0

    const resize = () => {
      const devicePixelRatio = window.devicePixelRatio || 1
      const rect = stage.getBoundingClientRect()
      
      // Set actual size in memory (scaled for high-DPI displays)
      canvas.width = rect.width * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
      
      // Scale back down using CSS for proper display
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      // Scale the context to match the device pixel ratio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      
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
      try {
        // Use optimized clear for better GPU performance
        const devicePixelRatio = window.devicePixelRatio || 1
        const rect = stage.getBoundingClientRect()
        if (isDebugLoggingEnabled()) {
          console.log('🎨 Drawing grid - Canvas size:', rect.width, 'x', rect.height)
        }
        ctx.clearRect(0, 0, rect.width, rect.height)
        
        // Apply parchment background using shared utility
        if (isDebugLoggingEnabled()) {
          console.log('🎨 Applying parchment background')
        }
        applyParchmentBackground(ctx, rect.width, rect.height)
        if (isDebugLoggingEnabled()) {
          console.log('✅ Parchment background applied')
        }
      
      // Only draw grid lines if grid is visible
      const { isGridVisible } = useUIStore.getState()
      if (isGridVisible) {
        ctx.strokeStyle = '#c4a882'
        ctx.lineWidth = 1
        
        // Calculate visible bounds more efficiently
        const rect = stage.getBoundingClientRect()
        const left = screenToTile(0, 0).x - 1
        const top = screenToTile(0, 0).y - 1
        const right = screenToTile(rect.width, rect.height).x + 2
        const bottom = screenToTile(rect.width, rect.height).y + 2
        
        // Use batch drawing for better GPU performance
        ctx.beginPath()
        for (let x = left; x <= right; x++) {
          const { sx } = worldToScreen(x, 0)
          ctx.moveTo(sx + 0.5, 0)
          ctx.lineTo(sx + 0.5, rect.height)
        }
        for (let y = top; y <= bottom; y++) {
          const { sy } = worldToScreen(0, y)
          ctx.moveTo(0, sy + 0.5)
          ctx.lineTo(rect.width, sy + 0.5)
        }
        ctx.stroke()
        if (isDebugLoggingEnabled()) {
          console.log('✅ Grid lines drawn')
        }
      }
      } catch (error) {
        console.error('❌ Error in drawGrid:', error)
      }
    }

    const drawTiles = () => {
      try {
        const { tiles } = useMapStore.getState().mapData
        const layerSettings = useMapStore.getState().layerSettings
        const order: Array<keyof typeof tiles> = ['floor', 'walls', 'objects']
        if (isDebugLoggingEnabled()) {
          console.log('🎯 Drawing tiles - Total tiles:', Object.keys(tiles.floor).length + Object.keys(tiles.walls).length + Object.keys(tiles.objects).length)
        }
      
      // Calculate viewport bounds for culling tiles outside view
      const rect = stage.getBoundingClientRect()
      const padding = 2 // Extra tiles on each side to prevent pop-in
      const leftBound = screenToTile(-TILE, -TILE).x - padding
      const topBound = screenToTile(-TILE, -TILE).y - padding  
      const rightBound = screenToTile(rect.width + TILE, rect.height + TILE).x + padding
      const bottomBound = screenToTile(rect.width + TILE, rect.height + TILE).y + padding
      
      // Optimization: Create a map of positions to their topmost visible tile
      const tilePositions = new Map<string, { layer: keyof typeof tiles, tileType: Palette, opacity: number }>()
      
      // Process layers in reverse order (topmost first) to find the topmost visible tile per position
      for (let i = order.length - 1; i >= 0; i--) {
        const layer = order[i]
        const settings = layerSettings[layer]
        if (!settings.visible) continue
        
        for (const k of Object.keys(tiles[layer])) {
          const [tx, ty] = k.split(',').map(Number)
          
          // Viewport culling: skip tiles outside visible bounds
          if (tx < leftBound || tx > rightBound || ty < topBound || ty > bottomBound) {
            continue
          }
          
          // Only store if we haven't seen this position yet (topmost visible tile)
          if (!tilePositions.has(k)) {
            tilePositions.set(k, {
              layer,
              tileType: tiles[layer][k] as Palette,
              opacity: settings.opacity
            })
          }
        }
      }
      
      // Render only the topmost visible tile for each position
      for (const [posKey, tileData] of tilePositions) {
        const [tx, ty] = posKey.split(',').map(Number)
        const { sx, sy } = worldToScreen(tx, ty)
        const size = Math.ceil(TILE * scale)
        
        // Apply layer opacity
        const prevAlpha = ctx.globalAlpha
        ctx.globalAlpha = tileData.opacity
        
        // Use smart tile renderer that automatically handles blending based on settings and context
        renderSmartTile(
          ctx,
          tileData.tileType as string,
          sx,
          sy,
          size,
          tx, // tile coordinates for blending analysis
          ty,
          tiles, // tile data for neighbor analysis
          tileData.layer // layer for blending rules
        )
        
        ctx.globalAlpha = prevAlpha
      }
      if (isDebugLoggingEnabled()) {
        console.log('✅ All tiles rendered successfully')
      }
      } catch (error) {
        console.error('❌ Error in drawTiles:', error)
      }
    }

    let raf = 0
    let lastDrawTime = 0
    const maxFPS = 60 // Cap at 60 FPS for better performance
    
    // Zoom performance optimization
    let zoomRAF = 0
    let zoomDebounceTimer = 0
    let isZooming = false
    
    const drawAll = () => {
      let startTime = 0
      if (isDebugLoggingEnabled()) {
        startTime = performance.now()
      }
      
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
      
      // Performance monitoring for debug mode
      if (isDebugLoggingEnabled() && startTime > 0) {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        if (renderTime > 16) { // Log if render takes longer than one frame (16ms)
          console.log(`🐌 Slow render: ${renderTime.toFixed(2)}ms (scale: ${scale.toFixed(2)}, tiles visible: ~${Math.round(Object.keys(useMapStore.getState().mapData.tiles.floor).length * 0.1)})`)
        }
      }
    }
    
    const scheduleDraw = () => {
      if (raf) cancelAnimationFrame(raf)
      
      raf = requestAnimationFrame((currentTime) => {
        // Throttle drawing to maxFPS for better performance
        if (currentTime - lastDrawTime >= (1000 / maxFPS)) {
          drawAll()
          lastDrawTime = currentTime
        } else {
          // Re-schedule if we're drawing too fast
          scheduleDraw()
        }
      })
    }
    
    // Optimized zoom drawing with throttling
    const scheduleZoomDraw = () => {
      isZooming = true
      
      // Cancel existing zoom animation frame
      if (zoomRAF) cancelAnimationFrame(zoomRAF)
      
      // Throttle zoom redraws to 30 FPS for better performance during zoom
      zoomRAF = requestAnimationFrame(() => {
        drawAll()
        
        // Debounce final high-quality render
        clearTimeout(zoomDebounceTimer)
        zoomDebounceTimer = window.setTimeout(() => {
          isZooming = false
          // Final high-quality render after zoom stops
          drawAll()
        }, 150) // Wait 150ms after zoom stops for final render
      })
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
      scheduleDraw() // Use immediate draw on mouse up to ensure final state is rendered
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
        
        // Update the camera transform ref and state
        cameraTransformRef.current = { scale, offsetX, offsetY }
        setCameraTransform({ scale, offsetX, offsetY })
        // Use optimized drawing for smooth panning
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
        
        // Update the camera transform ref and state
        cameraTransformRef.current = { scale, offsetX, offsetY }
        setCameraTransform({ scale, offsetX, offsetY })
        
        // Use optimized zoom drawing for better performance
        scheduleZoomDraw()
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
    
    // Enable cache cleanup to manage memory usage
    const cacheCleanupInterval = setInterval(() => {
      const { cleanupAllCaches } = require('../utils/tileRenderer')
      cleanupAllCaches()
      if (isDebugLoggingEnabled()) {
        console.log('🧹 Periodic cache cleanup performed')
      }
    }, 120000) // 2 minutes

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove) 
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', resize)
      
      // Clean up animation frames and timers
      if (raf) cancelAnimationFrame(raf)
      if (zoomRAF) cancelAnimationFrame(zoomRAF)
      if (zoomDebounceTimer) clearTimeout(zoomDebounceTimer)
      if (cacheCleanupInterval) clearInterval(cacheCleanupInterval)
    }
  }, [isGridVisible, isSnapToGrid, layerSettings])

  return (
    <div className="workspace">
      {/* Sidebar */}
      <div className="sidebar">
        <FileOperationsPanel />
        
        {/* Clear Map Button */}
        <div className="toolbar-section">
          <button
            onClick={handleClearMap}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              border: '1px solid #b91c1c',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626'
            }}
            title="Clear entire map (removes all tiles and assets)"
          >
            🗑️ Clear Map
          </button>
        </div>
        
        {/* Image Import */}
        <div className="toolbar-section">
        <button
            onClick={() => setIsImageImporterOpen(true)}
            style={{
              padding: '8px 16px',
              background: '#4a5568',
              border: '1px solid #1f2430',
              borderRadius: '4px',
              color: '#e6e6e6',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            📷 Import from Image
          </button>
        </div>
        
        {/* Update Blending */}
        <div className="toolbar-section">
          <button
            onClick={() => {
              // Invalidate tile cache to force redraw with new priorities
              const { invalidateTileCache } = require('../utils/tileRenderer')
              invalidateTileCache() // Clear all cached blends
              
              // Force a redraw
              const canvas = canvasRef.current
              if (canvas) {
                const event = new Event('resize')
                window.dispatchEvent(event)
              }
              
              if (isDebugLoggingEnabled()) {
                console.log('🔄 Blend priorities updated - cache cleared and redrawing')
              }
            }}
            style={{
              padding: '8px 16px',
              background: '#059669',
              border: '1px solid #047857',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#047857'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#059669'
            }}
            title="Update tile blending with new priority settings"
          >
            🔄 Update Blending
          </button>
        </div>
        
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <input
                type="checkbox"
                id="tileBlending"
                checked={isTileBlendingEnabled}
                onChange={toggleTileBlending}
                style={{ margin: 0 }}
              />
              <label htmlFor="tileBlending" style={{ color: '#e6e6e6' }}>Floor Tile Blending</label>
            </div>
          </div>
        </div>

        <ToolSettingsPanel />
        
        {/* Tile Browser */}
        <div className="toolbar-section">
          <h3 className="toolbar-title">Tiles</h3>
          <TileBrowser />
        </div>

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
        {/* World generation tools hidden - not suitable for indoor dungeon creation */}
        {/* <GenerationParametersPanel /> */}
        
        {/* Studio Cosmic North Credits */}
        <div className="toolbar-section">
          <button
            onClick={() => setIsAboutOpen(true)}
            style={{
              padding: '8px 16px',
              background: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              color: '#e6e6e6',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#4a5568'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748'
            }}
            title="About Dungeon Desktop and Studio Cosmic North"
          >
            🌌 About & Credits
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        className="stage" 
        ref={(el) => {
          dropRef.current = el
          drop(el)
        }}
      >
        <canvas 
          ref={(ref) => {
            canvasRef.current = ref
            stageRef.current = ref?.parentElement as HTMLElement
          }}
          className="canvas"
          style={{ 
            backgroundColor: isOver ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
            border: isOver ? '2px dashed #007acc' : 'none',
            transition: 'all 0.2s ease'
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
      
      {/* Image Map Importer Modal */}
      {isImageImporterOpen && (
        <ImageMapImporter
          onClose={() => setIsImageImporterOpen(false)}
          onImported={handleImageImported}
        />
      )}
      
      {/* About Modal */}
      {isAboutOpen && (
        <About onClose={() => setIsAboutOpen(false)} />
      )}
      
      {/* Debug Console */}
      {showDebugConsole && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '300px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffffff',
            zIndex: 10000,
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            overflow: 'auto',
            borderTop: '2px solid #333'
          }}
        >
          <div style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
            <strong>Debug Console (F12 to toggle)</strong>
            <button
              onClick={() => setDebugConsole([])}
              style={{
                float: 'right',
                background: '#333',
                border: 'none',
                color: '#fff',
                padding: '2px 8px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
          {debugConsole.map((msg, i) => (
            <div key={i} style={{ 
              marginBottom: '2px', 
              color: msg.startsWith('ERROR:') ? '#ff6b6b' : msg.startsWith('WARN:') ? '#ffa500' : '#fff' 
            }}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
