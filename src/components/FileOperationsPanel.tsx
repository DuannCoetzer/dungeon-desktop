import { useState, useRef, useEffect } from 'react'
import { useMapStore, useAssetInstances, useLayerSettings } from '../mapStore'
import { useUIStore } from '../uiStore'
import { getSavedMaps, exportMapData } from '../services/tauri'
import { useAssetStore } from '../store/assetStore'
import { preloadAllTileImages, renderTile, getCachedTileImage, renderSmartTile, TILE_IMAGE_MAP, loadTileImage } from '../utils/tileRenderer'
import { applyParchmentBackground } from '../utils/canvasUtils'
import type { Palette } from '../store'

export function FileOperationsPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastOperationStatus, setLastOperationStatus] = useState<string | null>(null)
  const [showDevInfo, setShowDevInfo] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportScale, setExportScale] = useState(4)
  const exportOptionsRef = useRef<HTMLDivElement>(null)
  
  const saveMapToFile = useMapStore(state => state.saveMapToFile)
  const loadMapFromFile = useMapStore(state => state.loadMapFromFile)
  const assetInstances = useAssetInstances()
  const mapData = useMapStore(state => state.mapData)
  const assetStore = useAssetStore()
  const layerSettings = useLayerSettings()
  
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
  
  // Close export options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportOptionsRef.current && !exportOptionsRef.current.contains(event.target as Node)) {
        setShowExportOptions(false)
      }
    }
    
    if (showExportOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportOptions])
  
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
  
  const handleExportPNG = async (customScale?: number) => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas')
      const exportCtx = exportCanvas.getContext('2d')!
      
      // Set canvas size with configurable resolution
      const TILE_SIZE = 32
      const EXPORT_SCALE = customScale || exportScale
      
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
      
      // Configure canvas for high-quality rendering
      exportCtx.imageSmoothingEnabled = false // Pixel-perfect for tiles
      exportCtx.imageSmoothingQuality = 'high'
      
      // Apply parchment background matching the main view
      applyParchmentBackground(exportCtx, mapWidth, mapHeight)
      
      // Helper function to convert world coordinates to export canvas coordinates
      const worldToExport = (x: number, y: number) => ({
        sx: (x - minX) * TILE_SIZE * EXPORT_SCALE,
        sy: (y - minY) * TILE_SIZE * EXPORT_SCALE
      })
      
      // Pre-load all tile images to ensure they're available for export
      await Promise.all(
        Object.values(TILE_IMAGE_MAP).map(async (tileType) => {
          try {
            await loadTileImage(tileType as Palette)
          } catch (error) {
            console.warn(`Failed to load tile for export: ${tileType}`, error)
          }
        })
      )
      
      // Draw tiles using proper tile renderer, respecting layer visibility and opacity
      const layerOrder: Array<keyof typeof tiles> = ['floor', 'walls', 'objects']
      for (const layer of layerOrder) {
        // Skip layer if not visible in UI
        if (!layerSettings[layer].visible) continue;
        
        // Apply layer opacity settings
        const originalGlobalAlpha = exportCtx.globalAlpha
        exportCtx.globalAlpha = layerSettings[layer].opacity
        
        for (const k of Object.keys(tiles[layer])) {
          const [tx, ty] = k.split(',').map(Number)
          const { sx, sy } = worldToExport(tx, ty)
          const size = TILE_SIZE * EXPORT_SCALE
          const palette = tiles[layer][k] as Palette
          
          // Use the smart tile renderer with blending support for consistent export
          renderSmartTile(
            exportCtx,
            palette as string,
            sx,
            sy,
            size,
            tx, // tile coordinates for blending
            ty,
            tiles, // tile data for neighbor analysis
            layer, // current layer
            true // force blending for export consistency
          )
        }
        
        // Restore original alpha
        exportCtx.globalAlpha = originalGlobalAlpha
      }
      
      // Skip asset rendering if layer is hidden
      if (layerSettings.assets.visible) {
        // Apply layer opacity settings
        const originalGlobalAlpha = exportCtx.globalAlpha
        exportCtx.globalAlpha = layerSettings.assets.opacity
        
        // Preload all assets first to ensure they're available for export
        const assetImageMap = new Map<string, HTMLImageElement>()
        
        // Load all asset images first
        const assetLoadPromises = assetInstances.map(async (instance) => {
          try {
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
            
            // Store loaded image in map by instance id for later use
            assetImageMap.set(instance.id, img)
          } catch (error) {
            console.warn(`Failed to load asset ${instance.id}:`, error)
          }
        })
        
        // Wait for all assets to load
        await Promise.all(assetLoadPromises)
        
        // Now render all assets using the loaded images
        for (const instance of assetInstances) {
          try {
            const img = assetImageMap.get(instance.id)
            if (!img) continue
            
            const asset = assetStore.getAssetById(instance.assetId)
            if (!asset) continue
            
            const { sx, sy } = worldToExport(instance.x, instance.y)
            const width = (asset.gridWidth || 1) * TILE_SIZE * EXPORT_SCALE
            const height = (asset.gridHeight || 1) * TILE_SIZE * EXPORT_SCALE
            
            // Save context for rotation and enable smoothing for assets (better quality)
            exportCtx.save()
            exportCtx.imageSmoothingEnabled = true
            exportCtx.imageSmoothingQuality = 'high'
            exportCtx.translate(sx + width / 2, sy + height / 2)
            exportCtx.rotate((instance.rotation * Math.PI) / 180)
            exportCtx.drawImage(img, -width / 2, -height / 2, width, height)
            exportCtx.restore()
            
            // Reset to pixel-perfect for tiles
            exportCtx.imageSmoothingEnabled = false
          } catch (error) {
            console.warn(`Failed to render asset ${instance.id}:`, error)
          }
        }
        
        // Restore original alpha
        exportCtx.globalAlpha = originalGlobalAlpha
      }
      
      // Convert to blob with high quality settings and download
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `dungeon-map-${new Date().toISOString().split('T')[0]}-${EXPORT_SCALE}x.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          setLastOperationStatus(`Map exported as PNG (${EXPORT_SCALE}x resolution)!`)
        } else {
          setLastOperationStatus('Export failed.')
        }
      }, 'image/png', 1.0)
      
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
        <div style={{ position: 'relative' }} ref={exportOptionsRef}>
          <button 
            className="tool-button" 
            onClick={() => setShowExportOptions(!showExportOptions)}
            disabled={isLoading}
            title="Export current map as PNG image with quality options"
          >
            🖼️ Export PNG {showExportOptions ? '▼' : '▶'} {isLoading ? '...' : ''}
          </button>
          
          {showExportOptions && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#1f2430',
              border: '1px solid #2a3441',
              borderRadius: '4px',
              padding: '8px',
              zIndex: 1000,
              marginTop: '2px'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#e6e6e6',
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Export Quality:
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => {
                    handleExportPNG(2)
                    setShowExportOptions(false)
                  }}
                  disabled={isLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#2a3441',
                    border: '1px solid #3a4451',
                    borderRadius: '3px',
                    color: '#e6e6e6',
                    cursor: 'pointer'
                  }}
                  title="2x resolution - Good for web sharing (~500KB typical)"
                >
                  📱 Standard (2x)
                </button>
                
                <button
                  onClick={() => {
                    handleExportPNG(4)
                    setShowExportOptions(false)
                  }}
                  disabled={isLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#2a3441',
                    border: '1px solid #3a4451',
                    borderRadius: '3px',
                    color: '#e6e6e6',
                    cursor: 'pointer'
                  }}
                  title="4x resolution - High quality for printing (~2MB typical)"
                >
                  🖨️ High Quality (4x)
                </button>
                
                <button
                  onClick={() => {
                    handleExportPNG(8)
                    setShowExportOptions(false)
                  }}
                  disabled={isLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: '#2a3441',
                    border: '1px solid #3a4451',
                    borderRadius: '3px',
                    color: '#e6e6e6',
                    cursor: 'pointer'
                  }}
                  title="8x resolution - Ultra high quality (~8MB typical)"
                >
                  💎 Ultra HD (8x)
                </button>
              </div>
              
              <div style={{
                fontSize: '9px',
                color: '#888',
                marginTop: '6px',
                lineHeight: '1.2'
              }}>
                💡 Higher quality = larger file size
              </div>
            </div>
          )}
        </div>
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
