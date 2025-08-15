import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Asset, AssetInstance } from '../store'

// Common map data structure
export interface MapData {
  tiles: {
    floor: Record<string, string>
    walls: Record<string, string>
    objects: Record<string, string>
  }
  assetInstances: AssetInstance[]
}

export interface LayerSettings {
  visible: boolean
  opacity: number
}

export interface MapStore {
  mapData: MapData
  layerSettings: Record<string, LayerSettings>
  currentLayer: string
  selectedPalette: string
  selectedAssetId: string | null
  
  // Actions
  setTile: (x: number, y: number, type: string) => void
  eraseTile: (x: number, y: number) => void
  setLayer: (layer: string) => void
  toggleLayer: (layer: string) => void
  setLayerOpacity: (layer: string, opacity: number) => void
  setSelected: (type: string) => void
  addAssetInstance: (instance: AssetInstance) => void
  updateAssetInstance: (id: string, updates: Partial<AssetInstance>) => void
  deleteAssetInstance: (id: string) => void
  selectAsset: (id: string | null) => void
  clearMap: () => void
  loadMapData: (data: MapData) => void
}

// Default map data
const createDefaultMapData = (): MapData => ({
  tiles: {
    floor: {},
    walls: {},
    objects: {}
  },
  assetInstances: []
})

const createDefaultLayerSettings = () => ({
  floor: { visible: true, opacity: 1 },
  walls: { visible: true, opacity: 1 },
  objects: { visible: true, opacity: 1 }
})

// Auto-save utility
const createAutoSaveStore = (storageKey: string) => {
  return subscribeWithSelector<MapStore>((set, get) => ({
    mapData: createDefaultMapData(),
    layerSettings: createDefaultLayerSettings(),
    currentLayer: 'floor',
    selectedPalette: 'grass',
    selectedAssetId: null,

    setTile: (x: number, y: number, type: string) => {
      const { currentLayer, selectedPalette } = get()
      set((state) => ({
        mapData: {
          ...state.mapData,
          tiles: {
            ...state.mapData.tiles,
            [currentLayer]: {
              ...state.mapData.tiles[currentLayer as keyof typeof state.mapData.tiles],
              [`${x},${y}`]: type || selectedPalette
            }
          }
        }
      }))
    },

    eraseTile: (x: number, y: number) => {
      const { currentLayer } = get()
      set((state) => {
        const newTiles = { ...state.mapData.tiles[currentLayer as keyof typeof state.mapData.tiles] }
        delete newTiles[`${x},${y}`]
        return {
          mapData: {
            ...state.mapData,
            tiles: {
              ...state.mapData.tiles,
              [currentLayer]: newTiles
            }
          }
        }
      })
    },

    setLayer: (layer: string) => set({ currentLayer: layer }),
    
    toggleLayer: (layer: string) => {
      set((state) => ({
        layerSettings: {
          ...state.layerSettings,
          [layer]: {
            ...state.layerSettings[layer],
            visible: !state.layerSettings[layer].visible
          }
        }
      }))
    },

    setLayerOpacity: (layer: string, opacity: number) => {
      set((state) => ({
        layerSettings: {
          ...state.layerSettings,
          [layer]: {
            ...state.layerSettings[layer],
            opacity
          }
        }
      }))
    },

    setSelected: (type: string) => set({ selectedPalette: type }),

    addAssetInstance: (instance: AssetInstance) => {
      set((state) => ({
        mapData: {
          ...state.mapData,
          assetInstances: [...state.mapData.assetInstances, instance]
        }
      }))
    },

    updateAssetInstance: (id: string, updates: Partial<AssetInstance>) => {
      set((state) => ({
        mapData: {
          ...state.mapData,
          assetInstances: state.mapData.assetInstances.map(instance =>
            instance.id === id ? { ...instance, ...updates } : instance
          )
        }
      }))
    },

    deleteAssetInstance: (id: string) => {
      set((state) => ({
        mapData: {
          ...state.mapData,
          assetInstances: state.mapData.assetInstances.filter(instance => instance.id !== id)
        }
      }))
    },

    selectAsset: (id: string | null) => set({ selectedAssetId: id }),

    clearMap: () => {
      set({
        mapData: createDefaultMapData(),
        layerSettings: createDefaultLayerSettings(),
        currentLayer: 'floor',
        selectedPalette: 'grass',
        selectedAssetId: null
      })
    },

    loadMapData: (data: MapData) => {
      set({ mapData: data })
    }
  }))
}

// Create separate stores for each map mode
export const useWorldMapStore = create(createAutoSaveStore('world-map-temp'))
export const useDungeonMapStore = create(createAutoSaveStore('dungeon-map-temp'))

// Auto-save functionality
const setupAutoSave = (store: any, storageKey: string) => {
  // Load from localStorage on initialization
  const savedData = localStorage.getItem(storageKey)
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      store.getState().loadMapData(parsed.mapData)
      // Also restore other state
      store.setState({
        layerSettings: parsed.layerSettings || createDefaultLayerSettings(),
        currentLayer: parsed.currentLayer || 'floor',
        selectedPalette: parsed.selectedPalette || 'grass'
      })
    } catch (error) {
      console.warn(`Failed to load saved data for ${storageKey}:`, error)
    }
  }

  // Auto-save on state changes
  store.subscribe(
    (state: MapStore) => ({
      mapData: state.mapData,
      layerSettings: state.layerSettings,
      currentLayer: state.currentLayer,
      selectedPalette: state.selectedPalette
    }),
    (state: any) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state))
      } catch (error) {
        console.warn(`Failed to auto-save ${storageKey}:`, error)
      }
    }
  )
}

// Initialize auto-save for both stores
setupAutoSave(useWorldMapStore, 'world-map-temp')
setupAutoSave(useDungeonMapStore, 'dungeon-map-temp')

// Export hook to get the current map store based on mode
export const useCurrentMapStore = (mode: 'world' | 'dungeon') => {
  return mode === 'world' ? useWorldMapStore : useDungeonMapStore
}
