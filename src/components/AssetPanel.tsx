import { useState, useEffect, useCallback } from 'react'
import { useDrag } from 'react-dnd'
import type { Asset } from '../store'
import { useAssetStore, useAllAssets, useAssetLoading, useAssetError } from '../store/assetStore'
import { isImportedAsset } from '../services/assetPersistence'

// Individual draggable asset item
function AssetItem({ asset, onDelete }: { asset: Asset; onDelete?: (assetId: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'asset',
    item: { asset },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))
  
  const [showDelete, setShowDelete] = useState(false)
  const canDelete = isImportedAsset(asset.id) && onDelete

  return (
    <div
      ref={drag as any}
      className="asset-item"
      style={{
        padding: '8px',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        transition: 'opacity 0.2s',
        position: 'relative',
      }}
      onMouseEnter={() => setShowDelete(canDelete)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Delete button for imported assets */}
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(asset.id)
          }}
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            backgroundColor: '#ff4444',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            fontSize: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
          title="Delete asset"
        >
          ×
        </button>
      )}
      
      <img
        src={asset.thumb}
        alt={asset.name}
        style={{
          width: '48px',
          height: '48px',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto 4px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ fontSize: '12px', color: '#ccc', fontWeight: '500' }}>
        {asset.name}
      </div>
      {/* Indicate if asset is imported */}
      {isImportedAsset(asset.id) && (
        <div style={{ 
          fontSize: '9px', 
          color: '#888', 
          marginTop: '2px',
          fontStyle: 'italic'
        }}>
          imported
        </div>
      )}
    </div>
  )
}

interface AssetPanelProps {
  // No props needed since we use persistent store
}

export function AssetPanel({}: AssetPanelProps = {}) {
  // Use persistent asset store
  const assets = useAllAssets()
  const loading = useAssetLoading()
  const error = useAssetError()
  const assetStore = useAssetStore()
  
  // Local UI state
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [showGridSizeSelector, setShowGridSizeSelector] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedGridSize, setSelectedGridSize] = useState({ width: 1, height: 1 })
  const [assetName, setAssetName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Load assets on component mount
  useEffect(() => {
    const loadAssets = async () => {
      await assetStore.loadDefaultAssets()
      await assetStore.loadImportedAssets()
    }
    loadAssets()
  }, []) // Remove assetStore dependency to prevent infinite loop
  
  
  const handleImportAsset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setImportStatus('Please select a PNG, JPG, or WebP image file.')
      setTimeout(() => setImportStatus(null), 3000)
      return
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setImportStatus('File size must be less than 10MB.')
      setTimeout(() => setImportStatus(null), 3000)
      return
    }
    
    // Show grid size selector with default name from filename
    setPendingFile(file)
    setSelectedGridSize({ width: 1, height: 1 })
    setAssetName(file.name.replace(/\.[^/.]+$/, '')) // Default name from filename
    setShowGridSizeSelector(true)
    setImportStatus(null)
    
    // Clear the input
    event.target.value = ''
  }
  
  const confirmImportAsset = async () => {
    if (!pendingFile) return
    
    setImportStatus('Importing asset...')
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return
      
      // Compress image to reduce localStorage usage
      const compressedDataUrl = await compressImage(dataUrl, 512, 512, 0.8)
      
      // Create a new asset with grid dimensions and custom name
      const newAsset: Asset = {
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: assetName.trim() || pendingFile.name.replace(/\.[^/.]+$/, ''), // Use custom name or fallback to filename
        src: compressedDataUrl,
        thumb: compressedDataUrl, // Use same image for thumbnail
        width: 32 * selectedGridSize.width, // Scale based on grid size
        height: 32 * selectedGridSize.height,
        gridWidth: selectedGridSize.width,
        gridHeight: selectedGridSize.height
      }
      
      // Add to persistent asset store
      const success = await assetStore.addAsset(newAsset)
      
      if (success) {
        setImportStatus('Asset imported successfully!')
      } else {
        setImportStatus('Failed to save asset.')
      }
      
      // Clear status after 3 seconds
      setTimeout(() => setImportStatus(null), 3000)
      
      // Reset state
      setShowGridSizeSelector(false)
      setPendingFile(null)
      setSelectedGridSize({ width: 1, height: 1 })
      setAssetName('')
    }
    
    reader.onerror = () => {
      setImportStatus('Failed to read file.')
      setTimeout(() => setImportStatus(null), 3000)
      setShowGridSizeSelector(false)
      setPendingFile(null)
    }
    
    reader.readAsDataURL(pendingFile)
  }
  
  const cancelImportAsset = () => {
    setShowGridSizeSelector(false)
    setPendingFile(null)
    setSelectedGridSize({ width: 1, height: 1 })
    setAssetName('')
  }
  
  const handleDeleteAsset = useCallback((assetId: string) => {
    setShowDeleteConfirm(assetId)
  }, [])
  
  const confirmDeleteAsset = async () => {
    if (!showDeleteConfirm) return
    
    const success = await assetStore.removeAsset(showDeleteConfirm)
    if (success) {
      setImportStatus('Asset deleted successfully!')
      setTimeout(() => setImportStatus(null), 3000)
    } else {
      setImportStatus('Failed to delete asset.')
      setTimeout(() => setImportStatus(null), 3000)
    }
    
    setShowDeleteConfirm(null)
  }
  
  const cancelDeleteAsset = () => {
    setShowDeleteConfirm(null)
  }
  
  // Helper function to compress images before storing
  const compressImage = (dataUrl: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress the image
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.src = dataUrl
    })
  }

  if (loading) {
    return (
      <div className="toolbar-section">
        <h3 className="toolbar-title">Assets</h3>
        <div style={{ color: '#888', fontSize: '14px', padding: '8px' }}>
          Loading assets...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="toolbar-section">
        <h3 className="toolbar-title">Assets</h3>
        <div style={{ color: '#ff6b6b', fontSize: '12px', padding: '8px' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="toolbar-section">
      <h3 className="toolbar-title">Assets</h3>
      
      {/* Import button */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleImportAsset}
          style={{ display: 'none' }}
          id="asset-import-input"
        />
        <label
          htmlFor="asset-import-input"
          style={{
            display: 'block',
            padding: '8px 12px',
            backgroundColor: '#2a4a6b',
            color: '#fff',
            border: '1px solid #3a5a7b',
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#3a5a8b'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#2a4a6b'
          }}
        >
          📁 Import Asset
        </label>
        
        {/* Status message */}
        {importStatus && (
          <div style={{
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '11px',
            borderRadius: '4px',
            textAlign: 'center',
            backgroundColor: importStatus.includes('successfully') ? '#2d4a2d' :
                            importStatus.includes('Importing') ? '#4a4a2d' : '#4a2d2d',
            color: importStatus.includes('successfully') ? '#90ee90' :
                   importStatus.includes('Importing') ? '#ffff90' : '#ff9090',
            border: '1px solid',
            borderColor: importStatus.includes('successfully') ? '#90ee90' :
                        importStatus.includes('Importing') ? '#ffff90' : '#ff9090'
          }}>
            {importStatus}
          </div>
        )}
      </div>
      
      {/* Grid Size Selector Modal */}
      {showGridSizeSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            maxWidth: '400px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#fff',
              textAlign: 'center'
            }}>
              Set Grid Size
            </h3>
            
            <div style={{ marginBottom: '16px', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
              Configure your asset settings
            </div>
            
            {/* Asset name input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#ccc', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Asset Name:
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Enter asset name..."
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#444',
                  border: '1px solid #666',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4a6fa5'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#666'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>
              How many grid cells should this asset occupy?
            </div>
            
            {/* Grid size presets */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '8px',
              marginBottom: '16px'
            }}>
              {[[1,1], [1,2], [2,1], [2,2], [1,3], [3,1], [2,3], [3,2]].map(([w, h]) => (
                <button
                  key={`${w}x${h}`}
                  onClick={() => setSelectedGridSize({ width: w, height: h })}
                  style={{
                    padding: '8px',
                    backgroundColor: selectedGridSize.width === w && selectedGridSize.height === h ? '#4a6fa5' : '#3a3a3a',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {w}×{h}
                </button>
              ))}
            </div>
            
            {/* Custom grid size inputs */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '20px',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#ccc' }}>Width:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedGridSize.width}
                  onChange={(e) => setSelectedGridSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))}
                  style={{
                    width: '50px',
                    padding: '4px',
                    backgroundColor: '#444',
                    border: '1px solid #666',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#ccc' }}>Height:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={selectedGridSize.height}
                  onChange={(e) => setSelectedGridSize(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))}
                  style={{
                    width: '50px',
                    padding: '4px',
                    backgroundColor: '#444',
                    border: '1px solid #666',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
            
            {/* Preview */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              border: '1px solid #333'
            }}>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>Preview Grid Footprint:</div>
              <div style={{
                display: 'inline-grid',
                gridTemplateColumns: `repeat(${selectedGridSize.width}, 16px)`,
                gap: '2px'
              }}>
                {Array.from({ length: selectedGridSize.width * selectedGridSize.height }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#4a6fa5',
                      border: '1px solid #6a8fc5',
                      borderRadius: '2px'
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                {selectedGridSize.width} × {selectedGridSize.height} cells
              </div>
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelImportAsset}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#555',
                  border: '1px solid #777',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmImportAsset}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#4a6fa5',
                  border: '1px solid #6a8fc5',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Import Asset
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            maxWidth: '400px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#fff',
              textAlign: 'center'
            }}>
              Delete Asset
            </h3>
            
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#ccc', textAlign: 'center' }}>
              Are you sure you want to delete this asset?
              <br />
              <strong style={{ color: '#fff' }}>
                {assets.find(a => a.id === showDeleteConfirm)?.name || 'Unknown Asset'}
              </strong>
              <br />
              <span style={{ fontSize: '12px', color: '#888' }}>
                This action cannot be undone.
              </span>
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={cancelDeleteAsset}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#555',
                  border: '1px solid #777',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAsset}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#cc4444',
                  border: '1px solid #dd5555',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {assets.map((asset) => (
          <AssetItem key={asset.id} asset={asset} onDelete={handleDeleteAsset} />
        ))}
      </div>
    </div>
  )
}
