import React, { useState, useRef } from 'react'
import { useMapStore, useMapAsset, useCanvasMode } from '../mapStore'
import { useAllAssets, useAssetStore } from '../store/assetStore'
import type { Asset } from '../store'
import { confirm, message } from '@tauri-apps/plugin-dialog'

export function MapAssetPanel() {
  const [showMapAssetPanel, setShowMapAssetPanel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Map asset state
  const mapAsset = useMapAsset()
  const canvasMode = useCanvasMode()
  const setMapAsset = useMapStore(state => state.setMapAsset)
  const clearMapAsset = useMapStore(state => state.clearMapAsset)
  const toggleCanvasMode = useMapStore(state => state.toggleCanvasMode)
  const adjustMapAlignment = useMapStore(state => state.adjustMapAlignment)
  const resetMapAlignment = useMapStore(state => state.resetMapAlignment)
  
  // Asset store
  const assets = useAllAssets()
  const assetStore = useAssetStore()
  
  // Filter for map-type assets
  const mapAssets = assets.filter(asset => asset.type === 'map')
  
  const handleImportMapAsset = () => {
    fileInputRef.current?.click()
  }
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      await message('Please select an image file.', { title: 'Invalid File Type', kind: 'error' })
      return
    }
    
    try {
      // Create object URL for the image
      const imageUrl = URL.createObjectURL(file)
      const img = new Image()
      
      img.onload = async () => {
        // Calculate grid dimensions based on image size and tile size (32px)
        const TILE_SIZE = 32
        const exactGridWidth = img.width / TILE_SIZE
        const exactGridHeight = img.height / TILE_SIZE
        const gridWidth = Math.ceil(exactGridWidth)
        const gridHeight = Math.ceil(exactGridHeight)
        
        // Check if the asset is very large (potential map asset)
        const isLargeAsset = gridWidth > 50 || gridHeight > 50
        
        if (isLargeAsset) {
          const confirmMapAsset = await confirm(
`This is a very large image (${img.width}×${img.height}px = ${exactGridWidth.toFixed(1)}×${exactGridHeight.toFixed(1)} tiles).\n\n` +
            'Would you like to import this as a Map Background? This will:\n' +
            '• Use the image as your canvas background\n' +
            '• Switch to bounded canvas mode\n' +
            '• Set canvas size to match the image exactly\n' +
            '• Use alignment controls for fine positioning\n\n' +
            'Select "OK" for Map Background or "Cancel" for Regular Asset.',
            { title: 'Import as Map Background?', kind: 'info' }
          )
          
          if (confirmMapAsset) {
            // Create map asset with proper imported asset ID format
            const mapAsset: Asset = {
              id: `imported_map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
              thumb: imageUrl,
              src: imageUrl,
              width: img.width,
              height: img.height,
              gridWidth,
              gridHeight,
              category: 'Map Backgrounds',
              type: 'map'
            }
            
            // Add to asset store
            const success = await assetStore.addAsset(mapAsset)
            if (success) {
              // Set as active map background
              handleSetMapAsset(mapAsset.id)
              await message(`Map background "${mapAsset.name}" imported successfully!\n\nCanvas is now bounded to ${exactGridWidth.toFixed(1)}×${exactGridHeight.toFixed(1)} tiles (${img.width}×${img.height}px).\n\nUse the alignment controls to fine-tune positioning.`, { title: 'Success', kind: 'info' })
              
              // Don't revoke the blob URL immediately - let it persist for rendering
              // It will be cleaned up when the page is refreshed or closed
            } else {
              await message('Failed to import map asset.', { title: 'Error', kind: 'error' })
              URL.revokeObjectURL(imageUrl)
            }
          } else {
            // Import as regular asset
            const regularAsset: Asset = {
              id: `imported_asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name.replace(/\.[^/.]+$/, ''),
              thumb: imageUrl,
              src: imageUrl,
              width: img.width,
              height: img.height,
              gridWidth,
              gridHeight,
              category: 'Imported Assets',
              type: 'regular'
            }
            
            const success = await assetStore.addAsset(regularAsset)
            if (success) {
              await message(`Regular asset "${regularAsset.name}" imported successfully!`, { title: 'Success', kind: 'info' })
              // Don't revoke blob URL - let it persist
            } else {
              await message('Failed to import asset.', { title: 'Error', kind: 'error' })
              URL.revokeObjectURL(imageUrl)
            }
          }
        } else {
          // Small image, import as regular asset
          const regularAsset: Asset = {
            id: `imported_asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            thumb: imageUrl,
            src: imageUrl,
            width: img.width,
            height: img.height,
            gridWidth,
            gridHeight,
            category: 'Imported Assets',
            type: 'regular'
          }
          
          const success = await assetStore.addAsset(regularAsset)
          if (success) {
            await message(`Asset "${regularAsset.name}" imported successfully!`, { title: 'Success', kind: 'info' })
            // Don't revoke blob URL - let it persist
          } else {
            await message('Failed to import asset.', { title: 'Error', kind: 'error' })
            URL.revokeObjectURL(imageUrl)
          }
        }
        
        // Clear file input
        event.target.value = ''
      }
      
      img.onerror = async () => {
        await message('Failed to load image.', { title: 'Error', kind: 'error' })
        URL.revokeObjectURL(imageUrl)
        event.target.value = ''
      }
      
      img.src = imageUrl
    } catch (error) {
      console.error('Error importing map asset:', error)
      await message('Failed to import image.', { title: 'Error', kind: 'error' })
      event.target.value = ''
    }
  }
  
  const handleSetMapAsset = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return
    
    // Calculate map bounds based on actual image dimensions converted to tile coordinates
    const TILE_SIZE = 32
    const bounds = {
      minX: 0,
      minY: 0,
      // Use exact tile dimensions based on image pixel size
      maxX: asset.width / TILE_SIZE,
      maxY: asset.height / TILE_SIZE
    }
    
    setMapAsset(assetId, bounds)
  }
  
  const handleClearMapAsset = async () => {
    const confirmed = await confirm(
      'Remove map background?\n\nThis will:\n' +
      '• Clear the canvas background\n' +
      '• Switch back to infinite canvas mode\n' +
      '• Keep all tiles and assets you\'ve placed',
      { title: 'Remove Map Background?', kind: 'warning' }
    )
    
    if (confirmed) {
      clearMapAsset()
    }
  }
  
  const handleClearAllMapAssets = async () => {
    const confirmed = await confirm(
      'Delete ALL map background assets?\n\nThis will:\n' +
      '• Permanently delete all imported map assets\n' +
      '• Clear the current map background\n' +
      '• Switch back to infinite canvas mode\n' +
      '• Keep all regular assets and tiles\n\n' +
      'This action cannot be undone!',
      { title: 'Delete All Map Assets?', kind: 'warning' }
    )
    
    if (confirmed) {
      // Clear current map background first
      clearMapAsset()
      
      // Remove all map-type assets from the store
      for (const asset of mapAssets) {
        await assetStore.removeAsset(asset.id)
      }
      
      await message(`Removed ${mapAssets.length} map background asset(s).`, { title: 'Success', kind: 'info' })
    }
  }
  
  const currentMapAssetData = mapAsset.assetId ? 
    assets.find(asset => asset.id === mapAsset.assetId) : null
  
  return (
    <div className="toolbar-section">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <h3 className="toolbar-title">
        Canvas Mode
        <span style={{ 
          fontSize: '11px', 
          marginLeft: '8px',
          color: canvasMode === 'bounded' ? '#90ee90' : '#ff9090',
          fontWeight: 'normal'
        }}>
          ({canvasMode === 'bounded' ? 'Bounded' : 'Infinite'})
        </span>
      </h3>
      
      <div style={{ display: 'grid', gap: 6 }}>
        {/* Current Map Status */}
        {currentMapAssetData && (
          <div style={{
            padding: '8px',
            backgroundColor: '#2d4a2d',
            border: '1px solid #4a7c59',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#90ee90', marginBottom: '4px' }}>
              Active Map Background:
            </div>
            <div style={{ color: '#e6e6e6' }}>
              {currentMapAssetData.name}
            </div>
            <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
              {currentMapAssetData.gridWidth} × {currentMapAssetData.gridHeight} tiles
            </div>
          </div>
        )}
        
        {/* Canvas Mode Toggle */}
        {mapAsset.assetId && (
          <button
            className="tool-button"
            onClick={toggleCanvasMode}
            style={{
              backgroundColor: canvasMode === 'bounded' ? '#2d4a2d' : '#4a2d2d',
              border: canvasMode === 'bounded' ? '1px solid #4a7c59' : '1px solid #7c4a4a'
            }}
            title={canvasMode === 'bounded' ? 
              'Switch to infinite canvas mode' : 
              'Switch to bounded canvas mode (map background)'
            }
          >
            {canvasMode === 'bounded' ? '📏 Switch to Infinite' : '🗺️ Switch to Bounded'}
          </button>
        )}
        
        {/* Map Alignment Controls */}
        {mapAsset.assetId && canvasMode === 'bounded' && (
          <div style={{
            padding: '8px',
            backgroundColor: '#1f2430',
            border: '1px solid #2a3441',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#e6e6e6' }}>
              🎯 Map Alignment
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '4px',
              marginBottom: '6px'
            }}>
              {/* Top Row */}
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(-0.1, -0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map up-left (0.1 tiles)"
              >
                ↖️
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0, -0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map up (0.1 tiles)"
              >
                ⬆️
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0.1, -0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map up-right (0.1 tiles)"
              >
                ↗️
              </button>
              
              {/* Middle Row */}
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(-0.1, 0)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map left (0.1 tiles)"
              >
                ⬅️
              </button>
              <button
                className="tool-button"
                onClick={resetMapAlignment}
                style={{ fontSize: '10px', padding: '4px' }}
                title="Reset to center alignment"
              >
                🎯
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0.1, 0)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map right (0.1 tiles)"
              >
                ➡️
              </button>
              
              {/* Bottom Row */}
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(-0.1, 0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map down-left (0.1 tiles)"
              >
                ↙️
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0, 0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map down (0.1 tiles)"
              >
                ⬇️
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0.1, 0.1)}
                style={{ fontSize: '12px', padding: '4px' }}
                title="Move map down-right (0.1 tiles)"
              >
                ↘️
              </button>
            </div>
            
            {/* Larger Step Controls */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              marginBottom: '6px'
            }}>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(-1, 0)}
                style={{ fontSize: '10px', padding: '4px' }}
                title="Move map left 1 full tile"
              >
                ⬅️⬅️ -1 Tile
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(1, 0)}
                style={{ fontSize: '10px', padding: '4px' }}
                title="Move map right 1 full tile"
              >
                1 Tile ➡️➡️
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0, -1)}
                style={{ fontSize: '10px', padding: '4px' }}
                title="Move map up 1 full tile"
              >
                ⬆️⬆️ -1 Tile
              </button>
              <button
                className="tool-button"
                onClick={() => adjustMapAlignment(0, 1)}
                style={{ fontSize: '10px', padding: '4px' }}
                title="Move map down 1 full tile"
              >
                1 Tile ⬇️⬇️
              </button>
            </div>
            
            {/* Current Offset Display */}
            {(mapAsset.offsetX !== 0 || mapAsset.offsetY !== 0) && (
              <div style={{ 
                textAlign: 'center', 
                color: '#888', 
                fontSize: '10px' 
              }}>
                Offset: {mapAsset.offsetX.toFixed(1)}, {mapAsset.offsetY.toFixed(1)} tiles
              </div>
            )}
          </div>
        )}
        
        {/* Import Map Asset */}
        <button
          className="tool-button"
          onClick={handleImportMapAsset}
          title="Import a large image as map background"
          style={{
            backgroundColor: '#2d3d4a',
            border: '1px solid #4a6a7c'
          }}
        >
          🗺️ Import Map Background
        </button>
        
        {/* Map Asset Selection */}
        {mapAssets.length > 0 && (
          <>
            <button
              className="tool-button"
              onClick={() => setShowMapAssetPanel(!showMapAssetPanel)}
              title="Select from existing map backgrounds"
            >
              📋 Select Map Background {showMapAssetPanel ? '▼' : '▶'}
            </button>
            
            {showMapAssetPanel && (
              <div style={{
                padding: '8px',
                backgroundColor: '#1f2430',
                border: '1px solid #2a3441',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {mapAssets.map(asset => (
                  <div
                    key={asset.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      marginBottom: '4px',
                      backgroundColor: mapAsset.assetId === asset.id ? '#2d4a2d' : 'transparent',
                      border: '1px solid ' + (mapAsset.assetId === asset.id ? '#4a7c59' : 'transparent'),
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSetMapAsset(asset.id)}
                  >
                    <img
                      src={asset.thumb}
                      alt={asset.name}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'cover',
                        marginRight: '8px',
                        border: '1px solid #444'
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        {asset.gridWidth} × {asset.gridHeight} tiles
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Clear Map Asset */}
        {mapAsset.assetId && (
          <button
            className="tool-button"
            onClick={handleClearMapAsset}
            title="Remove map background and return to infinite canvas"
            style={{
              backgroundColor: '#4a2d2d',
              border: '1px solid #7c4a4a'
            }}
          >
            🗑️ Clear Map Background
          </button>
        )}
        
        {/* Clear All Map Assets - Only show if there are map assets */}
        {mapAssets.length > 0 && (
          <button
            className="tool-button"
            onClick={handleClearAllMapAssets}
            title="Permanently delete all imported map background assets"
            style={{
              backgroundColor: '#4a2d2d',
              border: '1px solid #7c4a4a',
              fontSize: '10px'
            }}
          >
            🗑️🗑️ Delete All Map Assets ({mapAssets.length})
          </button>
        )}
        
        {/* Status Information */}
        {canvasMode === 'bounded' && (
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#2d4a2d',
            border: '1px solid #4a7c59',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#90ee90',
            textAlign: 'center',
            marginTop: '4px'
          }}>
            ✅ Bounded Canvas Active - Panning constrained to map area
          </div>
        )}
        
        {canvasMode === 'infinite' && (
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#4a2d2d',
            border: '1px solid #7c4a4a',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#ff9090',
            textAlign: 'center',
            marginTop: '4px'
          }}>
            ♾️ Infinite Canvas - Unlimited panning and building
          </div>
        )}
        
        {/* Help Text */}
        <div style={{
          fontSize: '10px',
          color: '#888',
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: '1.3',
          marginTop: '4px'
        }}>
          💡 Import large images (50+ tiles) as map backgrounds to create bounded canvases
        </div>
      </div>
    </div>
  )
}