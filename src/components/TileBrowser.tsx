import React, { useState, useRef } from 'react'
import { useTileStore, useAllTiles, useTileCategories, type Tile, type TileCategory } from '../store/tileStore'
import { useMapStore } from '../mapStore'

interface TileBrowserProps {
  onTileSelect?: (tile: Tile) => void
  className?: string
}

export function TileBrowser({ onTileSelect, className = '' }: TileBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<TileCategory>('floors')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedTileId, setSelectedTileId] = useState<string>('')
  
  const tileStore = useTileStore()
  const allTiles = useAllTiles()
  const categories = useTileCategories()
  const setSelectedPalette = useMapStore(state => state.setSelected)
  
  const categoryTiles = tileStore.getTilesByCategory(selectedCategory)
  
  const handleTileSelect = (tile: Tile) => {
    setSelectedTileId(tile.id)
    
    // Convert tile ID to palette format for backward compatibility
    const paletteId = convertTileToLegacyId(tile)
    setSelectedPalette(paletteId as any) // Cast to satisfy TypeScript for legacy compatibility
    
    onTileSelect?.(tile)
  }
  
  // Convert new tile system to legacy palette format
  const convertTileToLegacyId = (tile: Tile): string => {
    // Map new tile IDs to legacy palette IDs for backward compatibility
    const legacyMap: Record<string, string> = {
      'default_0': 'grass',
      'default_1': 'floor-stone-rough',
      'default_2': 'floor-stone-smooth',
      'default_3': 'floor-wood-planks',
      'default_4': 'floor-cobblestone',
      'default_5': 'wall',
      'default_6': 'wall-brick',
      'default_7': 'wall-stone',
      'default_8': 'wall-wood',
      'default_9': 'delete',
      'default_10': 'fog' // Fog of War tile
    }
    
    return legacyMap[tile.id] || tile.id
  }
  
  const handleDeleteTile = async (tileId: string) => {
    if (window.confirm('Are you sure you want to delete this tile?')) {
      await tileStore.removeTile(tileId)
      if (selectedTileId === tileId) {
        setSelectedTileId('')
      }
    }
  }
  
  return (
    <div className={`tile-browser ${className}`}>
      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #2a3441',
        marginBottom: '12px',
        overflowX: 'auto'
      }}>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: '8px 16px',
              background: selectedCategory === category.id ? '#7c8cff' : 'transparent',
              border: 'none',
              color: selectedCategory === category.id ? '#fff' : '#e6e6e6',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Import Button */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#a8a8a8' }}>
          {categoryTiles.length} tiles in {categories.find(c => c.id === selectedCategory)?.name}
        </span>
        <button
          onClick={() => setShowImportDialog(true)}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            border: 'none',
            color: '#fff',
            fontSize: '11px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          📁 Import
        </button>
      </div>
      
      {/* Tile Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
        gap: '6px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {categoryTiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => handleTileSelect(tile)}
            style={{
              position: 'relative',
              aspectRatio: '1',
              background: selectedTileId === tile.id ? '#7c8cff' : '#1f2430',
              border: `1px solid ${selectedTileId === tile.id ? '#7c8cff' : '#2a3441'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
            title={tile.name}
          >
            <img
              src={tile.thumb || tile.src}
              alt={tile.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {/* Delete button for custom tiles */}
            {!tile.isDefault && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteTile(tile.id)
                }}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '16px',
                  height: '16px',
                  background: 'rgba(220, 38, 38, 0.9)',
                  border: 'none',
                  borderRadius: '2px',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {/* Empty state */}
        {categoryTiles.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            padding: '32px',
            textAlign: 'center',
            color: '#a8a8a8',
            fontSize: '12px'
          }}>
            No {categories.find(c => c.id === selectedCategory)?.name.toLowerCase()} tiles yet.
            <br />
            Click Import to add some!
          </div>
        )}
      </div>
      
      {/* Import Dialog */}
      {showImportDialog && (
        <TileImportDialog
          category={selectedCategory}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </div>
  )
}

interface TileImportDialogProps {
  category: TileCategory
  onClose: () => void
}

function TileImportDialog({ category, onClose }: TileImportDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number, failed: number, errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const tileStore = useTileStore()
  const categories = useTileCategories()
  const categoryInfo = categories.find(c => c.id === category)
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
      const maxSize = 5 * 1024 * 1024 // 5MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })
    
    setSelectedFiles(validFiles)
    
    if (validFiles.length !== files.length) {
      const invalid = files.length - validFiles.length
      alert(`${invalid} file(s) were skipped (invalid format or too large)`)
    }
  }
  
  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
  }
  
  const handleImport = async () => {
    if (selectedFiles.length === 0) return
    
    setImporting(true)
    const results = await tileStore.importTiles(selectedFiles, category)
    setImportResults(results)
    setImporting(false)
    
    if (results.success > 0) {
      setSelectedFiles([])
    }
  }
  
  return (
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
        padding: '24px',
        minWidth: '400px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#fff'
          }}>
            Import {categoryInfo?.name} Tiles
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        {!importResults ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 24px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Select Tile Images
              </button>
            </div>
            
            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff',
                  marginBottom: '8px'
                }}>
                  Selected Files ({selectedFiles.length}):
                </div>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #444',
                  borderRadius: '4px'
                }}>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderBottom: index < selectedFiles.length - 1 ? '1px solid #333' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#ccc' }}>
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: '#4b5563',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedFiles.length === 0 || importing}
                style={{
                  padding: '8px 16px',
                  background: selectedFiles.length === 0 || importing ? '#6b7280' : '#059669',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: selectedFiles.length === 0 || importing ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? 'Importing...' : `Import ${selectedFiles.length} Tiles`}
              </button>
            </div>
          </>
        ) : (
          // Import Results
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#fff', marginBottom: '8px' }}>
                Import Complete
              </div>
              <div style={{ fontSize: '14px', color: '#10b981' }}>
                ✓ {importResults.success} tiles imported successfully
              </div>
              {importResults.failed > 0 && (
                <div style={{ fontSize: '14px', color: '#f87171' }}>
                  ✗ {importResults.failed} tiles failed to import
                </div>
              )}
            </div>
            
            {importResults.errors.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#f87171', marginBottom: '4px' }}>
                  Errors:
                </div>
                <div style={{
                  maxHeight: '100px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  color: '#fca5a5'
                }}>
                  {importResults.errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
