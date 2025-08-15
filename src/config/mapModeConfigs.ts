export interface MapModeConfig {
  mode: 'world' | 'dungeon'
  name: string
  description: string
  
  // Grid and scale settings
  tileSize: number
  defaultScale: number
  minScale: number
  maxScale: number
  gridColor: string
  
  // Canvas settings
  backgroundColor: string
  
  // Asset categories for this mode
  assetCategories: string[]
  
  // Layer configuration
  layers: string[]
  
  // Tools configuration
  availableTools: string[]
  
  // Auto-save settings
  autoSaveInterval: number // in milliseconds
}

export const mapModeConfigs: Record<'world' | 'dungeon', MapModeConfig> = {
  world: {
    mode: 'world',
    name: 'World Map',
    description: 'Large-scale world maps for continents, kingdoms, and regions',
    
    // Larger tile size for world-scale features
    tileSize: 64,
    defaultScale: 0.5,
    minScale: 0.1,
    maxScale: 2,
    gridColor: '#1a3d1a',
    
    backgroundColor: '#0a1a0a',
    
    // World-specific asset categories
    assetCategories: [
      'mountains',
      'forests',
      'cities',
      'rivers',
      'roads',
      'borders',
      'landmarks',
      'terrain'
    ],
    
    layers: ['terrain', 'water', 'vegetation', 'settlements', 'roads', 'labels'],
    
    availableTools: [
      'select',
      'draw',
      'erase',
      'rect',
      'circle',
      'polygon',
      'freehand',
      'line'
    ],
    
    autoSaveInterval: 30000 // 30 seconds
  },
  
  dungeon: {
    mode: 'dungeon',
    name: 'Dungeon/Building Map',
    description: 'Interior maps for dungeons, buildings, rooms, and structures',
    
    // Standard tile size for room-scale features
    tileSize: 32,
    defaultScale: 1,
    minScale: 0.25,
    maxScale: 4,
    gridColor: '#2a2a2a',
    
    backgroundColor: '#000000',
    
    // Dungeon/building-specific asset categories
    assetCategories: [
      'furniture',
      'doors',
      'windows',
      'chests',
      'decorations',
      'lighting',
      'traps',
      'monsters'
    ],
    
    layers: ['floor', 'walls', 'objects', 'furniture', 'lighting'],
    
    availableTools: [
      'select',
      'draw',
      'erase',
      'rect',
      'circle',
      'polygon',
      'freehand',
      'line'
    ],
    
    autoSaveInterval: 15000 // 15 seconds
  }
}

export const getMapModeConfig = (mode: 'world' | 'dungeon'): MapModeConfig => {
  return mapModeConfigs[mode]
}
