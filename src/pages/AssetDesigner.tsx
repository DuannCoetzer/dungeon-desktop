import { useState, useEffect } from 'react'
import { useAssetStore } from '../store/assetStore'
import { isImportedAsset } from '../services/assetPersistence'
import type { Asset } from '../store'
import './AssetDesigner.css'

interface AssetCategory {
  id: string
  name: string
  description: string
  color: string
}

const DEFAULT_CATEGORIES: AssetCategory[] = [
  { id: 'characters', name: 'Characters', description: 'NPCs, monsters, and player characters', color: '#4ade80' },
  { id: 'terrain', name: 'Terrain', description: 'Natural features and landscapes', color: '#22d3ee' },
  { id: 'structures', name: 'Structures', description: 'Buildings, walls, and constructions', color: '#f59e0b' },
  { id: 'objects', name: 'Objects', description: 'Items, furniture, and props', color: '#a855f7' },
  { id: 'effects', name: 'Effects', description: 'Magic, lighting, and visual effects', color: '#ef4444' },
  { id: 'uncategorized', name: 'Uncategorized', description: 'Assets without a category', color: '#6b7280' }
]

export default function AssetDesigner() {
  const assetStore = useAssetStore()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  // Load assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      await assetStore.loadDefaultAssets()
      await assetStore.loadImportedAssets()
    }
    loadAssets()
  }, [])

  // Filter and sort assets
  const filteredAssets = assetStore.allAssets
    .filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || 
        (asset as any).category === selectedCategory ||
        (selectedCategory === 'uncategorized' && !(asset as any).category)
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime()
        case 'size':
          return (b.gridWidth * b.gridHeight) - (a.gridWidth * a.gridHeight)
        case 'type':
          return (isImportedAsset(a.id) ? 'imported' : 'default').localeCompare(
            isImportedAsset(b.id) ? 'imported' : 'default'
          )
        default:
          return 0
      }
    })

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    setEditingAsset(null)
  }

  const handleAssetEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setSelectedAsset(asset)
  }

  const handleAssetDelete = async (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const success = await assetStore.removeAsset(assetId)
      if (success && selectedAsset?.id === assetId) {
        setSelectedAsset(null)
        setEditingAsset(null)
      }
    }
  }

  const handleAssetUpdate = async (updates: Partial<Asset>) => {
    if (editingAsset) {
      const success = await assetStore.updateAsset(editingAsset.id, updates)
      if (success) {
        setEditingAsset(null)
        // Refresh the selected asset
        const updatedAsset = assetStore.getAssetById(editingAsset.id)
        if (updatedAsset) {
          setSelectedAsset(updatedAsset)
        }
      }
    }
  }

  const getAssetStats = () => {
    const total = assetStore.allAssets.length
    const imported = assetStore.importedAssets.length
    const defaultCount = assetStore.defaultAssets.length
    const categories = DEFAULT_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = assetStore.allAssets.filter(asset => 
        (asset as any).category === cat.id || 
        (cat.id === 'uncategorized' && !(asset as any).category)
      ).length
      return acc
    }, {} as Record<string, number>)
    
    return { total, imported, default: defaultCount, categories }
  }

  const stats = getAssetStats()

  return (
    <div className="asset-designer">
      <div className="asset-designer-header">
        <div className="header-content">
          <h1>Asset Designer</h1>
          <p>Manage, organize, and edit your asset library</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowImportDialog(true)}
          >
            📁 Import Assets
          </button>
        </div>
      </div>

      <div className="asset-designer-content">
        {/* Sidebar with filters and stats */}
        <div className="asset-sidebar">
          <div className="asset-stats">
            <h3>Library Stats</h3>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Assets</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.imported}</span>
                <span className="stat-label">Imported</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.default}</span>
                <span className="stat-label">Default</span>
              </div>
            </div>
          </div>

          <div className="asset-filters">
            <h3>Categories</h3>
            <div className="category-list">
              <button
                className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <span className="category-color" style={{ backgroundColor: '#3b82f6' }}></span>
                <span className="category-name">All Assets</span>
                <span className="category-count">{stats.total}</span>
              </button>
              {DEFAULT_CATEGORIES.map(category => (
                <button
                  key={category.id}
                  className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="category-color" style={{ backgroundColor: category.color }}></span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{stats.categories[category.id] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="asset-main">
          {/* Search and view controls */}
          <div className="asset-controls">
            <div className="search-section">
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="view-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-select"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="size">Sort by Size</option>
                <option value="type">Sort by Type</option>
              </select>
              <div className="view-mode-buttons">
                <button
                  className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  ⊞
                </button>
                <button
                  className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {/* Asset grid/list */}
          <div className={`asset-library ${viewMode}`}>
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => handleAssetSelect(asset)}
              >
                <div className="asset-thumbnail">
                  <img src={asset.thumb || asset.src} alt={asset.name} />
                  <div className="asset-overlay">
                    <div className="asset-actions">
                      {isImportedAsset(asset.id) && (
                        <>
                          <button
                            className="action-btn edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAssetEdit(asset)
                            }}
                            title="Edit asset"
                          >
                            ✏️
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAssetDelete(asset.id)
                            }}
                            title="Delete asset"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="asset-info">
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-meta">
                    <span className="asset-size">{asset.gridWidth}×{asset.gridHeight}</span>
                    <span className={`asset-type ${isImportedAsset(asset.id) ? 'imported' : 'default'}`}>
                      {isImportedAsset(asset.id) ? 'Imported' : 'Default'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredAssets.length === 0 && (
              <div className="empty-state">
                <p>No assets found matching your criteria.</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowImportDialog(true)}
                >
                  Import Your First Asset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Asset details panel */}
        {selectedAsset && (
          <div className="asset-details">
            <AssetDetailsPanel
              asset={selectedAsset}
              isEditing={editingAsset?.id === selectedAsset.id}
              onEdit={() => handleAssetEdit(selectedAsset)}
              onSave={handleAssetUpdate}
              onCancel={() => setEditingAsset(null)}
              onDelete={() => handleAssetDelete(selectedAsset.id)}
            />
          </div>
        )}
      </div>

      {/* Import dialog */}
      {showImportDialog && (
        <ImportAssetsDialog onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  )
}

// Asset details panel component
function AssetDetailsPanel({
  asset,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}: {
  asset: Asset
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<Asset>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [editName, setEditName] = useState(asset.name)
  const [editGridWidth, setEditGridWidth] = useState(asset.gridWidth)
  const [editGridHeight, setEditGridHeight] = useState(asset.gridHeight)
  const [editCategory, setEditCategory] = useState((asset as any).category || 'uncategorized')

  useEffect(() => {
    setEditName(asset.name)
    setEditGridWidth(asset.gridWidth)
    setEditGridHeight(asset.gridHeight)
    setEditCategory((asset as any).category || 'uncategorized')
  }, [asset])

  const handleSave = () => {
    onSave({
      name: editName,
      gridWidth: editGridWidth,
      gridHeight: editGridHeight,
      category: editCategory
    } as any)
  }

  return (
    <div className="asset-details-panel">
      <div className="details-header">
        <h3>Asset Details</h3>
        {isImportedAsset(asset.id) && !isEditing && (
          <button className="btn btn-secondary" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>

      <div className="details-content">
        {/* Asset preview */}
        <div className="asset-preview">
          <img src={asset.src} alt={asset.name} />
          <div 
            className="grid-overlay"
            style={{
              gridTemplateColumns: `repeat(${asset.gridWidth}, 1fr)`,
              gridTemplateRows: `repeat(${asset.gridHeight}, 1fr)`
            }}
          >
            {Array.from({ length: asset.gridWidth * asset.gridHeight }).map((_, i) => (
              <div key={i} className="grid-cell"></div>
            ))}
          </div>
        </div>

        {/* Asset properties */}
        <div className="asset-properties">
          {isEditing ? (
            <>
              <div className="property-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="property-group">
                <label>Grid Size:</label>
                <div className="grid-size-inputs">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editGridWidth}
                    onChange={(e) => setEditGridWidth(parseInt(e.target.value) || 1)}
                  />
                  <span>×</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editGridHeight}
                    onChange={(e) => setEditGridHeight(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="property-group">
                <label>Category:</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="edit-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button className="btn btn-secondary" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="property-item">
                <span className="property-label">Name:</span>
                <span className="property-value">{asset.name}</span>
              </div>
              <div className="property-item">
                <span className="property-label">Grid Size:</span>
                <span className="property-value">{asset.gridWidth}×{asset.gridHeight}</span>
              </div>
              <div className="property-item">
                <span className="property-label">Type:</span>
                <span className="property-value">
                  {isImportedAsset(asset.id) ? 'Imported' : 'Default'}
                </span>
              </div>
              <div className="property-item">
                <span className="property-label">Category:</span>
                <span className="property-value">
                  {DEFAULT_CATEGORIES.find(cat => cat.id === (asset as any).category)?.name || 'Uncategorized'}
                </span>
              </div>
              {isImportedAsset(asset.id) && (
                <div className="asset-actions">
                  <button className="btn btn-danger" onClick={onDelete}>
                    Delete Asset
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Import assets dialog component
function ImportAssetsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import Assets</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>Asset import functionality coming soon!</p>
          <p>This will provide enhanced import capabilities including:</p>
          <ul>
            <li>Batch asset import</li>
            <li>Automatic categorization</li>
            <li>Duplicate detection</li>
            <li>Bulk property editing</li>
          </ul>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
