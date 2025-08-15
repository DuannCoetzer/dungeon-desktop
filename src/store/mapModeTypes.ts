// Core types and interfaces for multi-mode map system

export type MapModeType = 'dungeon' | 'world' | 'building'

export interface GridConfiguration {
  /** Size of each grid cell in the real-world unit */
  cellSize: number
  /** Unit of measurement (feet, meters, miles, kilometers) */
  unit: 'feet' | 'meters' | 'miles' | 'kilometers'
  /** Display name for the unit */
  unitDisplay: string
  /** Pixels per grid cell for rendering */
  pixelsPerCell: number
  /** Minimum zoom level */
  minZoom: number
  /** Maximum zoom level */
  maxZoom: number
  /** Default zoom level */
  defaultZoom: number
  /** Whether to show grid lines by default */
  showGridByDefault: boolean
  /** Grid line opacity (0-1) */
  gridOpacity: number
  /** Grid line color */
  gridColor: string
}

export interface AssetConfiguration {
  /** Categories of assets available in this mode */
  availableCategories: string[]
  /** Default category for new assets */
  defaultCategory: string
  /** Typical asset sizes for this mode */
  commonSizes: Array<{ width: number; height: number; label: string }>
  /** Whether assets snap to grid by default */
  snapToGridByDefault: boolean
}

export interface ToolConfiguration {
  /** Tools available in this mode */
  availableTools: string[]
  /** Default tool when switching to this mode */
  defaultTool: string
  /** Tool-specific settings */
  toolSettings: Record<string, any>
}

export interface LayerConfiguration {
  /** Layers available in this mode */
  availableLayers: string[]
  /** Default layer when switching to this mode */
  defaultLayer: string
  /** Layer display names */
  layerNames: Record<string, string>
  /** Layer z-index ordering */
  layerOrder: string[]
}

export interface MapModeConfiguration {
  /** Unique identifier for the map mode */
  id: MapModeType
  /** Display name for the mode */
  name: string
  /** Short description of the mode */
  description: string
  /** Icon or emoji for the mode */
  icon: string
  /** Grid system configuration */
  grid: GridConfiguration
  /** Asset system configuration */
  assets: AssetConfiguration
  /** Tool system configuration */
  tools: ToolConfiguration
  /** Layer system configuration */
  layers: LayerConfiguration
  /** UI theme/color scheme */
  theme: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
}

export interface MapModeState {
  /** Currently active map mode */
  currentMode: MapModeType
  /** Configurations for all map modes */
  modes: Record<MapModeType, MapModeConfiguration>
  /** Mode-specific map data storage */
  modeData: Record<MapModeType, any>
  /** Whether mode switching is in progress */
  isSwitching: boolean
  /** Last active mode before current */
  previousMode: MapModeType | null
}

export interface ModeTransition {
  /** Source mode */
  from: MapModeType
  /** Target mode */
  to: MapModeType
  /** Whether to preserve current map data */
  preserveData: boolean
  /** Custom transition settings */
  settings?: Record<string, any>
}

// Utility types for mode-specific data
export interface DungeonModeData {
  rooms: any[]
  corridors: any[]
  secretDoors: any[]
  traps: any[]
}

export interface WorldModeData {
  regions: any[]
  settlements: any[]
  roads: any[]
  rivers: any[]
  landmarks: any[]
}

export interface BuildingModeData {
  rooms: any[]
  doors: any[]
  windows: any[]
  furniture: any[]
  fixtures: any[]
}

// Event types for mode system
export interface MapModeEvent {
  type: 'mode-changed' | 'mode-switching' | 'mode-initialized'
  mode: MapModeType
  timestamp: number
  data?: any
}

// Configuration validation
export interface ModeValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Mode-specific settings that can be customized by users
export interface ModePreferences {
  [key: string]: any
  autoSave: boolean
  gridVisible: boolean
  gridSnap: boolean
  defaultZoom: number
  preferredTools: string[]
}

export type ModePreferencesMap = Record<MapModeType, ModePreferences>
