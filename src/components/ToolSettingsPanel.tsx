import { useState } from 'react'
import { 
  IconErase,
  TileGrass, 
  TileWall,
  TileFloorStoneRough,
  TileFloorStoneSmooth, 
  TileFloorWoodPlanks,
  TileFloorCobblestone,
  TileWallBrick,
  TileWallStone,
  TileWallWood
} from '../assets'
import { useMapStore, useSelectedPalette } from '../mapStore'
import { useUIStore, useSelectedTool, useBrushSettings } from '../uiStore'
import type { Palette } from '../store'

interface TileInfo {
  id: Palette
  name: string
  icon: string
  category: 'floors' | 'walls' | 'special'
}

const TILE_PALETTE: TileInfo[] = [
  // Floors
  { id: 'grass', name: 'Grass', icon: TileGrass, category: 'floors' },
  { id: 'floor-stone-rough', name: 'Rough Stone', icon: TileFloorStoneRough, category: 'floors' },
  { id: 'floor-stone-smooth', name: 'Smooth Stone', icon: TileFloorStoneSmooth, category: 'floors' },
  { id: 'floor-wood-planks', name: 'Wood Planks', icon: TileFloorWoodPlanks, category: 'floors' },
  { id: 'floor-cobblestone', name: 'Cobblestone', icon: TileFloorCobblestone, category: 'floors' },
  
  // Walls
  { id: 'wall', name: 'Stone Wall', icon: TileWall, category: 'walls' },
  { id: 'wall-brick', name: 'Brick Wall', icon: TileWallBrick, category: 'walls' },
  { id: 'wall-stone', name: 'Stone Wall', icon: TileWallStone, category: 'walls' },
  { id: 'wall-wood', name: 'Wood Wall', icon: TileWallWood, category: 'walls' },
  
  // Special
  { id: 'delete', name: 'Erase', icon: IconErase, category: 'special' },
]

interface ToolSettingsPanelProps {
  className?: string
}

export const ToolSettingsPanel: React.FC<ToolSettingsPanelProps> = ({ className = '' }) => {
  const [expandedCategory, setExpandedCategory] = useState<string>('floors')
  const [autoWallMode, setAutoWallMode] = useState(false)
  
  // Store hooks
  const selectedTool = useSelectedTool()
  const selectedPalette = useSelectedPalette()
  const setSelectedPalette = useMapStore(state => state.setSelected)
  const brushSettings = useBrushSettings()
  const { setBrushSize, setBrushOpacity } = useUIStore()
  
  // Group tiles by category
  const floorTiles = TILE_PALETTE.filter(tile => tile.category === 'floors')
  const wallTiles = TILE_PALETTE.filter(tile => tile.category === 'walls')
  const specialTiles = TILE_PALETTE.filter(tile => tile.category === 'special')
  
  const handleTileSelect = (tileId: Palette) => {
    setSelectedPalette(tileId)
  }
  
  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? '' : category)
  }
  
  const renderTileButton = (tile: TileInfo) => (
    <button
      key={tile.id}
      className={`palette-btn ${selectedPalette === tile.id ? 'active' : ''}`}
      onClick={() => handleTileSelect(tile.id)}
      title={tile.name}
      style={{
        padding: '6px',
        background: selectedPalette === tile.id ? '#7c8cff' : '#141821',
        border: '1px solid #1f2430',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        minHeight: '32px',
        cursor: 'pointer'
      }}
    >
      <img 
        src={tile.icon} 
        alt={tile.name} 
        style={{ width: '20px', height: '20px' }}
      />
    </button>
  )
  
  const renderTileCategory = (categoryName: string, tiles: TileInfo[], expanded: boolean) => (
    <div key={categoryName}>
      <button
        onClick={() => toggleCategory(categoryName)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: '#1f2430',
          border: '1px solid #2a3441',
          borderRadius: '4px',
          color: '#e6e6e6',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
          textTransform: 'capitalize'
        }}
      >
        <span>{categoryName}</span>
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▶
        </span>
      </button>
      
      {expanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
          gap: '4px',
          marginBottom: '8px',
          padding: '4px 0'
        }}>
          {tiles.map(renderTileButton)}
        </div>
      )}
    </div>
  )
  
  return (
    <div className={`toolbar-section ${className}`}>
      <h3 className="toolbar-title">Tool Settings</h3>
      
      {/* Brush Settings - Show for drawing tools */}
      {(selectedTool === 'draw' || selectedTool === 'freehand') && (
        <div style={{ marginBottom: '16px', padding: '8px', background: '#0d1117', borderRadius: '4px' }}>
          <h4 style={{ color: '#e6e6e6', fontSize: '12px', margin: '0 0 8px 0' }}>Brush</h4>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ color: '#a8a8a8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              Size: {brushSettings.size}px
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSettings.size}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ color: '#a8a8a8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              Opacity: {Math.round(brushSettings.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={brushSettings.opacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
      
      {/* Auto-Wall Toggle */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#0d1117', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <input
            type="checkbox"
            id="autoWall"
            checked={autoWallMode}
            onChange={(e) => setAutoWallMode(e.target.checked)}
            style={{ margin: 0 }}
          />
          <label htmlFor="autoWall" style={{ color: '#e6e6e6', cursor: 'pointer' }}>
            Auto-place walls
          </label>
        </div>
        <div style={{ fontSize: '10px', color: '#a8a8a8', marginTop: '4px' }}>
          Automatically adds walls around floor edges
        </div>
      </div>
      
      {/* Tile Palette */}
      <div>
        <h4 style={{ color: '#e6e6e6', fontSize: '13px', margin: '0 0 8px 0' }}>Tile Palette</h4>
        
        {renderTileCategory('floors', floorTiles, expandedCategory === 'floors')}
        {renderTileCategory('walls', wallTiles, expandedCategory === 'walls')}
        {renderTileCategory('special', specialTiles, expandedCategory === 'special')}
      </div>
      
      {/* Selected Tile Info */}
      {selectedPalette && selectedPalette !== 'delete' && (
        <div style={{ marginTop: '12px', padding: '8px', background: '#0d1117', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#a8a8a8' }}>Selected:</div>
          <div style={{ fontSize: '12px', color: '#e6e6e6', fontWeight: '500' }}>
            {TILE_PALETTE.find(t => t.id === selectedPalette)?.name || selectedPalette}
          </div>
        </div>
      )}
    </div>
  )
}
