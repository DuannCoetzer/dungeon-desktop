import { useState, useRef } from 'react'
import { useMapStore, useAssetInstances } from '../mapStore'
import { useUIStore } from '../uiStore'
import { getSavedMaps, exportMapData } from '../services/tauri'
import { useAssetStore } from '../store/assetStore'
import { getCachedTileImage, TILE_IMAGE_MAP } from '../utils/tileRenderer'
import type { Palette } from '../store'

export function FileOperationsPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastOperationStatus, setLastOperationStatus] = useState<string | null>(null)
  const [showDevInfo, setShowDevInfo] = useState(false)
  
  const saveMapToFile = useMapStore(state => state.saveMapToFile)
  const loadMapFromFile = useMapStore(state => state.loadMapFromFile)
  const assetInstances = useAssetInstances()
  const mapData = useMapStore(state => state.mapData)
  const assetStore = useAssetStore()
  
  // Check if we're in development mode
  const isDevelopmentMode = typeof window !== 'undefined' && (window as any).__TAURI__ === undefined
  const savedMaps = isDevelopmentMode ? getSavedMaps() : []
  
  const handleSave = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const success = await saveMapToFile()
      if (success) {
        setLastOperationStatus('Map saved successfully!')
      } else {
        setLastOperationStatus('Save cancelled.')
      }
    } catch (error) {
      console.error('Save failed:', error)
      setLastOperationStatus('Save failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleLoad = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const success = await loadMapFromFile()
      if (success) {
        setLastOperationStatus('Map loaded successfully!')
      } else {
        setLastOperationStatus('Load cancelled.')
      }
    } catch (error) {
      console.error('Load failed:', error)
      setLastOperationStatus('Load failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  const handleLoadFromFile = () => {
    fileInputRef.current?.click()
  }
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const text = await file.text()
      const loadMapData = useMapStore.getState().loadMapData
      
      // Parse and validate the JSON
      const data = JSON.parse(text)
      if (!data || !data.tiles) {
        setLastOperationStatus('Invalid map file format')
        return
      }
      
      loadMapData(data)
      setLastOperationStatus('Map loaded from file successfully!')
    } catch (error) {
      console.error('File load failed:', error)
      setLastOperationStatus('Failed to load file')
    } finally {
      setIsLoading(false)
      // Clear the input
      event.target.value = ''
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  const handleSaveToFile = () => {
    const mapData = exportMapData()
    const blob = new Blob([mapData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dungeon-map-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setLastOperationStatus('Map downloaded as JSON file!')
    setTimeout(() => setLastOperationStatus(null), 3000)
  }
  
  const handleNewMap = () => {
    if (isLoading) return
    
    const confirmed = window.confirm(
      'Create a new empty map?\n\nThis will clear all current work. Make sure to save your current map first if you want to keep it.'
    )
    
    if (confirmed) {
      setIsLoading(true)
      setLastOperationStatus(null)
      
      try {
        // Use the mapStore reset function to create a fresh map
        const resetMap = useMapStore.getState().reset
        resetMap()
        setLastOperationStatus('New map created!')
      } catch (error) {
        console.error('New map creation failed:', error)
        setLastOperationStatus('Failed to create new map.')
      } finally {
        setIsLoading(false)
        // Clear status after 3 seconds
        setTimeout(() => setLastOperationStatus(null), 3000)
      }
    }
  }
  
  const handleExportPNG = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas')
      const exportCtx = exportCanvas.getContext('2d')!
      
      // Set canvas size (you might want to make this configurable)
      const TILE_SIZE = 32
      const EXPORT_SCALE = 2 // Higher resolution for export
      
      // Calculate map bounds more accurately
      const tiles = mapData.tiles
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      let hasContent = false
      
      // Find bounds from tiles
      Object.keys(tiles.floor).concat(Object.keys(tiles.walls), Object.keys(tiles.objects)).forEach(key => {
        const [x, y] = key.split(',').map(Number)
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + 1) // Add 1 to include the full tile
        maxY = Math.max(maxY, y + 1)
        hasContent = true
      })
      
      // Include assets in bounds calculation with proper grid size handling
      assetInstances.forEach(instance => {
        // Get the asset data to determine its grid size
        const asset = assetStore.getAssetById(instance.assetId)
        const gridWidth = asset?.gridWidth || 1
        const gridHeight = asset?.gridHeight || 1
        
        // Calculate asset bounds in grid coordinates
        const assetMinX = Math.floor(instance.x)
        const assetMinY = Math.floor(instance.y)
        const assetMaxX = assetMinX + gridWidth
        const assetMaxY = assetMinY + gridHeight
        
        minX = Math.min(minX, assetMinX)
        minY = Math.min(minY, assetMinY)
        maxX = Math.max(maxX, assetMaxX)
        maxY = Math.max(maxY, assetMaxY)
        hasContent = true
      })
      
      // If no content, create a minimal map
      if (!hasContent) {
        minX = 0
        minY = 0
        maxX = 10
        maxY = 10
      }
      
      // Add minimal padding to ensure clean edges
      const padding = 1
      minX -= padding
      minY -= padding
      maxX += padding
      maxY += padding
      
      const mapWidth = (maxX - minX) * TILE_SIZE * EXPORT_SCALE
      const mapHeight = (maxY - minY) * TILE_SIZE * EXPORT_SCALE
      
      exportCanvas.width = mapWidth
      exportCanvas.height = mapHeight
      
      // Set transparent background to preserve alpha
      exportCtx.clearRect(0, 0, mapWidth, mapHeight)
      
      // Helper function to convert world coordinates to export canvas coordinates
      const worldToExport = (x: number, y: number) => ({
        sx: (x - minX) * TILE_SIZE * EXPORT_SCALE,
        sy: (y - minY) * TILE_SIZE * EXPORT_SCALE
      })
      
      // Helper function to render a tile with proper image
      const renderTileForExport = (ctx: CanvasRenderingContext2D, palette: Palette, x: number, y: number, size: number) => {
        const img = getCachedTileImage(palette)
        
        if (img) {
          ctx.drawImage(img, x, y, size, size)
        } else {
          // Fallback to color if image not loaded
          let color = '#4a7c2a' // grass
          switch (palette) {
            case 'wall':
            case 'wall-brick':
            case 'wall-stone':
            case 'wall-wood':
              color = '#5a5a5a'
              break
            case 'floor-stone-rough':
              color = '#666666'
              break
            case 'floor-stone-smooth':
              color = '#777777'
              break
            case 'floor-wood-planks':
              color = '#8b4513'
              break
            case 'floor-cobblestone':
              color = '#696969'
              break
          }
          ctx.fillStyle = color
          ctx.fillRect(x, y, size, size)
        }
      }
      
      // Draw tiles using proper tile renderer
      const layerOrder: Array<keyof typeof tiles> = ['floor', 'walls', 'objects']
      for (const layer of layerOrder) {
        for (const k of Object.keys(tiles[layer])) {
          const [tx, ty] = k.split(',').map(Number)
          const { sx, sy } = worldToExport(tx, ty)
          const size = TILE_SIZE * EXPORT_SCALE
          const palette = tiles[layer][k] as Palette
          
          renderTileForExport(exportCtx, palette, sx, sy, size)
        }
      }
      
      // Load and draw assets using asset store
      const assetPromises = assetInstances.map(async (instance) => {
        try {
          // Find the asset data from asset store (includes both default and imported assets)
          const asset = assetStore.getAssetById(instance.assetId)
          
          if (!asset) {
            console.warn(`Asset not found in store: ${instance.assetId}`)
            return
          }
          
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error(`Failed to load asset: ${asset.src}`))
            img.src = asset.src
          })
          
          const { sx, sy } = worldToExport(instance.x, instance.y)
          const width = (asset.gridWidth || 1) * TILE_SIZE * EXPORT_SCALE
          const height = (asset.gridHeight || 1) * TILE_SIZE * EXPORT_SCALE
          
          // Save context for rotation
          exportCtx.save()
          exportCtx.translate(sx + width / 2, sy + height / 2)
          exportCtx.rotate((instance.rotation * Math.PI) / 180)
          exportCtx.drawImage(img, -width / 2, -height / 2, width, height)
          exportCtx.restore()
        } catch (error) {
          console.warn(`Failed to render asset ${instance.id}:`, error)
        }
      })
      
      await Promise.all(assetPromises)
      
      // Convert to blob and download
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `dungeon-map-${new Date().toISOString().split('T')[0]}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          setLastOperationStatus('Map exported as PNG!')
        } else {
          setLastOperationStatus('Export failed.')
        }
      }, 'image/png')
      
    } catch (error) {
      console.error('PNG export failed:', error)
      setLastOperationStatus('Export failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  const handleExportForAction = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const mapData = exportMapData()
      
      // Create and download the JSON file
      const blob = new Blob([mapData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dungeon-map-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setLastOperationStatus('Map exported for DM Game!')
    } catch (error) {
      console.error('DM Game export failed:', error)
      setLastOperationStatus('Export failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  // Check if there are unsaved changes (simple heuristic: map has content but no recent save/load operation)
  const hasUnsavedChanges = (
    Object.keys(mapData.tiles.floor).length > 0 || 
    Object.keys(mapData.tiles.walls).length > 0 || 
    Object.keys(mapData.tiles.objects).length > 0 || 
    assetInstances.length > 0
  ) && !lastOperationStatus?.includes('saved') && !lastOperationStatus?.includes('loaded')
  
  return (
    <div className="toolbar-section">
      {/* Hidden file input for JSON file loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <h3 className="toolbar-title">
        File
        {hasUnsavedChanges && (
          <span style={{ 
            color: '#ff9090', 
            fontSize: '12px', 
            marginLeft: '8px',
            animation: 'pulse 2s infinite'
          }}>
            *
          </span>
        )}
      </h3>
      <div style={{ display: 'grid', gap: 6 }}>
        <button 
          className="tool-button" 
          onClick={isDevelopmentMode ? handleSave : handleSave}
          disabled={isLoading}
          title={isDevelopmentMode ? "Save map to browser storage" : "Save current map to a JSON file"}
        >
          💾 {isDevelopmentMode ? 'Save (Storage)' : 'Save Map'} {isLoading ? '...' : ''}
        </button>
        {isDevelopmentMode && (
          <button 
            className="tool-button" 
            onClick={handleSaveToFile}
            disabled={isLoading}
            title="Download map as JSON file to your computer"
            style={{
              backgroundColor: '#4a2d4a',
              border: '1px solid #7c4a7c'
            }}
          >
            💿 Save to File {isLoading ? '...' : ''}
          </button>
        )}
        <button 
          className="tool-button" 
          onClick={isDevelopmentMode ? handleLoad : handleLoad}
          disabled={isLoading}
          title={isDevelopmentMode ? "Load map from browser storage" : "Load map from a JSON file"}
        >
          📁 {isDevelopmentMode ? 'Load (Storage)' : 'Load Map'} {isLoading ? '...' : ''}
        </button>
        {isDevelopmentMode && (
          <button 
            className="tool-button" 
            onClick={handleLoadFromFile}
            disabled={isLoading}
            title="Load map from JSON file on your computer"
            style={{
              backgroundColor: '#2d4a4a',
              border: '1px solid #4a7c7c'
            }}
          >
            📂 Load from File {isLoading ? '...' : ''}
          </button>
        )}
        <button 
          className="tool-button" 
          onClick={handleNewMap}
          disabled={isLoading}
          title="Create a new empty map (clears current work)"
          style={{
            backgroundColor: '#4a2d4a',
            border: '1px solid #7c4a7c'
          }}
        >
          📄 New Map {isLoading ? '...' : ''}
        </button>
        <button 
          className="tool-button" 
          onClick={handleExportPNG}
          disabled={isLoading}
          title="Export current map as high-resolution PNG image"
        >
          🖼️ Export PNG {isLoading ? '...' : ''}
        </button>
        <button 
          className="tool-button" 
          onClick={handleExportForAction}
          disabled={isLoading}
          title="Export map as JSON for DM Game viewing"
          style={{
            backgroundColor: '#2d4a2d',
            border: '1px solid #4a7c59'
          }}
        >
          🎭 Export for DM Game {isLoading ? '...' : ''}
        </button>
        
        {isDevelopmentMode && (
          <>
            <button 
              className="tool-button" 
              onClick={() => setShowDevInfo(!showDevInfo)}
              title="Show development mode information"
              style={{ fontSize: '10px', opacity: 0.7 }}
            >
              ⚠️ Dev Mode {showDevInfo ? '▼' : '▶'}
            </button>
            {showDevInfo && (
              <div style={{
                padding: '8px',
                fontSize: '11px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#ccc'
              }}>
                <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Development Mode</div>
                <div style={{ marginBottom: '4px' }}>Save/Load uses browser storage</div>
                {savedMaps.length > 0 && (
                  <div>
                    <div style={{ marginBottom: '2px' }}>Saved maps:</div>
                    {savedMaps.map(map => (
                      <div key={map} style={{ marginLeft: '8px', fontSize: '10px' }}>• {map}</div>
                    ))}
                  </div>
                )}
                {savedMaps.length === 0 && (
                  <div style={{ fontStyle: 'italic' }}>No saved maps yet</div>
                )}
              </div>
            )}
          </>
        )}
        
        {lastOperationStatus && (
          <div style={{
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: (lastOperationStatus.includes('success') || lastOperationStatus.includes('exported')) ? '#2d4a2d' : 
                            lastOperationStatus.includes('cancelled') ? '#4a4a2d' : '#4a2d2d',
            color: (lastOperationStatus.includes('success') || lastOperationStatus.includes('exported')) ? '#90ee90' : 
                   lastOperationStatus.includes('cancelled') ? '#ffff90' : '#ff9090',
            textAlign: 'center',
            border: '1px solid',
            borderColor: (lastOperationStatus.includes('success') || lastOperationStatus.includes('exported')) ? '#90ee90' : 
                        lastOperationStatus.includes('cancelled') ? '#ffff90' : '#ff9090'
          }}>
            {lastOperationStatus}
          </div>
        )}
        
        {!lastOperationStatus && (
          <div style={{
            padding: '6px 8px',
            fontSize: '11px',
            color: '#888',
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: '1.3'
          }}>
            💡 Tip: Use "New Map" for fresh start, "Load Map" to open saved maps
          </div>
        )}
      </div>
    </div>
  )
}
