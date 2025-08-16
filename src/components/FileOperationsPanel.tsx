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
      
      setLastOperationStatus('Map exported for Action Mode!')
    } catch (error) {
      console.error('Action Mode export failed:', error)
      setLastOperationStatus('Export failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  return (
    <div className="toolbar-section">
      <h3 className="toolbar-title">File</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        <button 
          className="tool-button" 
          onClick={handleSave}
          disabled={isLoading}
          title="Save current map to a JSON file"
        >
          💾 Save Map {isLoading ? '...' : ''}
        </button>
        <button 
          className="tool-button" 
          onClick={handleLoad}
          disabled={isLoading}
          title="Load map from a JSON file"
        >
          📁 Load Map {isLoading ? '...' : ''}
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
          title="Export map as JSON for Action Mode viewing"
          style={{
            backgroundColor: '#2d4a2d',
            border: '1px solid #4a7c59'
          }}
        >
          🎭 Export for Action {isLoading ? '...' : ''}
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
      </div>
    </div>
  )
}
