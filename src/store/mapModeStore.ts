import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  MapModeType, 
  MapModeState, 
  MapModeConfiguration, 
  ModeTransition, 
  GridConfiguration,
  AssetConfiguration,
  ToolConfiguration,
  LayerConfiguration,
  ModePreferences,
  ModePreferencesMap
} from './mapModeTypes'

// Default configurations for each map mode
const DUNGEON_MODE_CONFIG: MapModeConfiguration = {
  id: 'dungeon',
  name: 'Dungeon Mode',
  description: 'Create underground dungeons, caves, and interior encounters',
  icon: '🏰',
  grid: {
    cellSize: 5,
    unit: 'feet',
    unitDisplay: 'feet',
    pixelsPerCell: 32,
    minZoom: 0.25,
    maxZoom: 4.0,
    defaultZoom: 1.0,
    showGridByDefault: true,
    gridOpacity: 0.3,
    gridColor: '#ffffff'
  },
  assets: {
    availableCategories: ['characters', 'objects', 'effects', 'structures'],
    defaultCategory: 'objects',
    commonSizes: [
      { width: 1, height: 1, label: 'Small (5ft)' },
      { width: 2, height: 2, label: 'Medium (10ft)' },
      { width: 3, height: 3, label: 'Large (15ft)' },
      { width: 4, height: 4, label: 'Huge (20ft)' }
    ],
    snapToGridByDefault: true
  },
  tools: {
    availableTools: ['draw', 'erase', 'select', 'rectangle', 'circle', 'line', 'polygon'],
    defaultTool: 'draw',
    toolSettings: {
      brushSize: 1,
      patternFill: false
    }
  },
  layers: {
    availableLayers: ['floor', 'walls', 'objects', 'assets'],
    defaultLayer: 'floor',
    layerNames: {
      floor: 'Floor',
      walls: 'Walls',
      objects: 'Objects',
      assets: 'Assets'
    },
    layerOrder: ['floor', 'walls', 'objects', 'assets']
  },
  theme: {
    primary: '#8B4513',
    secondary: '#A0522D',
    accent: '#D2691E',
    background: '#2F1B14'
  }
}

const WORLD_MODE_CONFIG: MapModeConfiguration = {
  id: 'world',
  name: 'World Mode',
  description: 'Design overworld maps, continents, and large-scale regions',
  icon: '🌍',
  grid: {
    cellSize: 1,
    unit: 'miles',
    unitDisplay: 'miles',
    pixelsPerCell: 32,
    minZoom: 0.1,
    maxZoom: 2.0,
    defaultZoom: 0.5,
    showGridByDefault: false,
    gridOpacity: 0.2,
    gridColor: '#87CEEB'
  },
  assets: {
    availableCategories: ['terrain', 'settlements', 'landmarks', 'natural'],
    defaultCategory: 'terrain',
    commonSizes: [
      { width: 1, height: 1, label: 'Small (1 mile)' },
      { width: 2, height: 2, label: 'Medium (2 miles)' },
      { width: 5, height: 5, label: 'Large (5 miles)' },
      { width: 10, height: 10, label: 'Huge (10 miles)' }
    ],
    snapToGridByDefault: false
  },
  tools: {
    availableTools: ['terrain', 'path', 'region', 'settlement', 'landmark', 'river'],
    defaultTool: 'terrain',
    toolSettings: {
      brushSize: 3,
      terrainBlending: true,
      pathWidth: 1
    }
  },
  layers: {
    availableLayers: ['terrain', 'water', 'roads', 'settlements', 'labels'],
    defaultLayer: 'terrain',
    layerNames: {
      terrain: 'Terrain',
      water: 'Water Bodies',
      roads: 'Roads & Paths',
      settlements: 'Settlements',
      labels: 'Labels'
    },
    layerOrder: ['terrain', 'water', 'roads', 'settlements', 'labels']
  },
  theme: {
    primary: '#228B22',
    secondary: '#32CD32',
    accent: '#9ACD32',
    background: '#0F2F0F'
  }
}

const BUILDING_MODE_CONFIG: MapModeConfiguration = {
  id: 'building',
  name: 'Building Mode',
  description: 'Design architectural layouts, floor plans, and interior spaces',
  icon: '🏢',
  grid: {
    cellSize: 1,
    unit: 'feet',
    unitDisplay: 'feet',
    pixelsPerCell: 32,
    minZoom: 0.5,
    maxZoom: 8.0,
    defaultZoom: 2.0,
    showGridByDefault: true,
    gridOpacity: 0.25,
    gridColor: '#D3D3D3'
  },
  assets: {
    availableCategories: ['furniture', 'fixtures', 'doors', 'windows', 'architectural'],
    defaultCategory: 'furniture',
    commonSizes: [
      { width: 1, height: 1, label: 'Tiny (1ft)' },
      { width: 2, height: 2, label: 'Small (2ft)' },
      { width: 3, height: 3, label: 'Medium (3ft)' },
      { width: 5, height: 5, label: 'Large (5ft)' }
    ],
    snapToGridByDefault: true
  },
  tools: {
    availableTools: ['wall', 'door', 'window', 'room', 'furniture', 'measure'],
    defaultTool: 'wall',
    toolSettings: {
      wallThickness: 0.5,
      autoConnect: true,
      snapToWalls: true
    }
  },
  layers: {
    availableLayers: ['structure', 'walls', 'doors', 'furniture', 'electrical', 'plumbing'],
    defaultLayer: 'walls',
    layerNames: {
      structure: 'Structure',
      walls: 'Walls',
      doors: 'Doors & Windows',
      furniture: 'Furniture',
      electrical: 'Electrical',
      plumbing: 'Plumbing'
    },
    layerOrder: ['structure', 'walls', 'doors', 'furniture', 'electrical', 'plumbing']
  },
  theme: {
    primary: '#4682B4',
    secondary: '#5F9EA0',
    accent: '#87CEEB',
    background: '#1E2F3F'
  }
}

// Default user preferences for each mode
const DEFAULT_PREFERENCES: ModePreferencesMap = {
  dungeon: {
    autoSave: true,
    gridVisible: true,
    gridSnap: true,
    defaultZoom: 1.0,
    preferredTools: ['draw', 'erase', 'select']
  },
  world: {
    autoSave: true,
    gridVisible: false,
    gridSnap: false,
    defaultZoom: 0.5,
    preferredTools: ['terrain', 'path', 'settlement']
  },
  building: {
    autoSave: true,
    gridVisible: true,
    gridSnap: true,
    defaultZoom: 2.0,
    preferredTools: ['wall', 'door', 'furniture']
  }
}

interface MapModeStoreState extends MapModeState {
  // User preferences
  preferences: ModePreferencesMap
  
  // Actions
  switchMode: (mode: MapModeType, options?: Partial<ModeTransition>) => Promise<void>
  updateModeConfig: (mode: MapModeType, config: Partial<MapModeConfiguration>) => void
  updatePreferences: (mode: MapModeType, preferences: Partial<ModePreferences>) => void
  resetModeToDefaults: (mode: MapModeType) => void
  getModeConfig: (mode: MapModeType) => MapModeConfiguration
  getCurrentModeConfig: () => MapModeConfiguration
  isToolAvailable: (tool: string) => boolean
  isLayerAvailable: (layer: string) => boolean
  isAssetCategoryAvailable: (category: string) => boolean
  
  // Event system
  subscribers: Set<(event: { type: string; mode: MapModeType; data?: any }) => void>
  subscribe: (callback: (event: { type: string; mode: MapModeType; data?: any }) => void) => () => void
  emit: (type: string, data?: any) => void
}

export const useMapModeStore = create<MapModeStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMode: 'dungeon' as MapModeType,
      modes: {
        dungeon: DUNGEON_MODE_CONFIG,
        world: WORLD_MODE_CONFIG,
        building: BUILDING_MODE_CONFIG
      },
      modeData: {
        dungeon: {},
        world: {},
        building: {}
      },
      isSwitching: false,
      previousMode: null,
      preferences: DEFAULT_PREFERENCES,
      subscribers: new Set(),

      // Actions
      switchMode: async (mode: MapModeType, options = {}) => {
        const state = get()
        if (state.currentMode === mode) return

        set({ isSwitching: true })

        try {
          // Emit switching event
          state.emit('mode-switching', { from: state.currentMode, to: mode })

          // Preserve current mode data if requested
          if (options.preserveData !== false) {
            // This would save current map state to modeData[currentMode]
            // Implementation depends on how map data is structured
          }

          // Switch to new mode
          set({ 
            previousMode: state.currentMode,
            currentMode: mode,
            isSwitching: false
          })

          // Emit mode changed event
          state.emit('mode-changed', { mode })

          console.log(`Switched from ${state.currentMode} mode to ${mode} mode`)
        } catch (error) {
          console.error('Error switching modes:', error)
          set({ isSwitching: false })
        }
      },

      updateModeConfig: (mode: MapModeType, config: Partial<MapModeConfiguration>) => {
        set(state => ({
          modes: {
            ...state.modes,
            [mode]: { ...state.modes[mode], ...config }
          }
        }))
      },

      updatePreferences: (mode: MapModeType, preferences: Partial<ModePreferences>) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            [mode]: { ...state.preferences[mode], ...preferences }
          }
        }))
      },

      resetModeToDefaults: (mode: MapModeType) => {
        const defaultConfigs = {
          dungeon: DUNGEON_MODE_CONFIG,
          world: WORLD_MODE_CONFIG,
          building: BUILDING_MODE_CONFIG
        }
        
        set(state => ({
          modes: {
            ...state.modes,
            [mode]: { ...defaultConfigs[mode] }
          },
          preferences: {
            ...state.preferences,
            [mode]: { ...DEFAULT_PREFERENCES[mode] }
          }
        }))
      },

      getModeConfig: (mode: MapModeType) => {
        return get().modes[mode]
      },

      getCurrentModeConfig: () => {
        const state = get()
        return state.modes[state.currentMode]
      },

      isToolAvailable: (tool: string) => {
        const state = get()
        return state.modes[state.currentMode].tools.availableTools.includes(tool)
      },

      isLayerAvailable: (layer: string) => {
        const state = get()
        return state.modes[state.currentMode].layers.availableLayers.includes(layer)
      },

      isAssetCategoryAvailable: (category: string) => {
        const state = get()
        return state.modes[state.currentMode].assets.availableCategories.includes(category)
      },

      // Event system
      subscribe: (callback) => {
        const state = get()
        state.subscribers.add(callback)
        return () => {
          state.subscribers.delete(callback)
        }
      },

      emit: (type: string, data?: any) => {
        const state = get()
        const event = {
          type,
          mode: state.currentMode,
          timestamp: Date.now(),
          ...data
        }
        state.subscribers.forEach(callback => callback(event))
      }
    }),
    {
      name: 'map-mode-store',
      // Only persist user preferences and current mode, not the full config
      partialize: (state) => ({
        currentMode: state.currentMode,
        preferences: state.preferences,
        modeData: state.modeData
      })
    }
  )
)

// Convenience hooks for common operations
export const useCurrentMode = () => useMapModeStore(state => state.currentMode)
export const useCurrentModeConfig = () => useMapModeStore(state => state.getCurrentModeConfig())
export const useIsSwitching = () => useMapModeStore(state => state.isSwitching)
export const useModePreferences = () => {
  const currentMode = useCurrentMode()
  return useMapModeStore(state => state.preferences[currentMode])
}

// Mode-specific hooks
export const useGridConfig = () => useMapModeStore(state => state.getCurrentModeConfig().grid)
export const useAssetConfig = () => useMapModeStore(state => state.getCurrentModeConfig().assets)
export const useToolConfig = () => useMapModeStore(state => state.getCurrentModeConfig().tools)
export const useLayerConfig = () => useMapModeStore(state => state.getCurrentModeConfig().layers)
export const useModeTheme = () => useMapModeStore(state => state.getCurrentModeConfig().theme)
