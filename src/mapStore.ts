import { create } from 'zustand'
import { 
  subscribeToMapChanges, 
  setTile as protocolSetTile, 
  eraseTile as protocolEraseTile,
  addAssetInstance as protocolAddAssetInstance,
  updateAssetInstance as protocolUpdateAssetInstance,
  deleteAssetInstance as protocolDeleteAssetInstance,
  resetMap as protocolResetMap,
  getMapData,
  type MapData
} from './protocol'
import { saveMapToFile as tauriSaveMap, loadMapFromFile as tauriLoadMap } from './services/tauri'
import type { TileType, Layer, TileMap, AssetInstance, Palette } from './store'

export interface Position {
  x: number
  y: number
}

interface LayerSettings { 
  visible: boolean
  opacity: number 
}

interface MapState {
  // Map data from protocol
  mapData: MapData
  
  // Player position (game state, not editor state)
  player: Position
  
  // Layer settings for rendering
  layerSettings: Record<Layer, LayerSettings>
  
  // Asset selection state
  selectedAssetInstances: string[]
  
  // Current editing context
  currentLayer: Layer
  selected: Palette
  
  // Actions that call protocol functions
  setPlayer: (pos: Position) => void
  movePlayer: (dx: number, dy: number) => void
  setTiles: (tiles: Record<Layer, TileMap>) => void
  setTile: (x: number, y: number, type: TileType) => void
  eraseTile: (x: number, y: number) => void
  setLayer: (layer: Layer) => void
  setSelected: (selected: Palette) => void
  toggleLayer: (layer: Layer) => void
  setLayerOpacity: (layer: Layer, opacity: number) => void
  
  // Asset actions using protocol
  addAssetInstance: (assetInstance: AssetInstance) => void
  updateAssetInstance: (id: string, updates: Partial<AssetInstance>) => void
  deleteAssetInstance: (id: string) => void
  selectAssetInstance: (id: string) => void
  deselectAssetInstance: (id: string) => void
  clearAssetSelection: () => void
  
  // File operations
  saveMapToFile: () => Promise<boolean>
  loadMapFromFile: () => Promise<boolean>
  
  reset: () => void
}

export const useMapStore = create<MapState>((set, get) => {
  // Initialize with current map data
  const initialMapData = getMapData()
  
  const store: MapState = {
    // Initialize with protocol data
    mapData: initialMapData,
    player: { x: 0, y: 0 },
    layerSettings: {
      floor: { visible: true, opacity: 1 },
      walls: { visible: true, opacity: 1 },
      objects: { visible: true, opacity: 1 },
      assets: { visible: true, opacity: 1 },
    },
    selectedAssetInstances: [],
    currentLayer: 'floor',
    selected: 'grass',
    
    // Player actions
    setPlayer: (pos) => set({ player: pos }),
    movePlayer: (dx, dy) => set((s) => ({ 
      player: { x: s.player.x + dx, y: s.player.y + dy } 
    })),
    
    // Tile actions - now using protocol functions
    setTiles: (tiles) => {
      // Update each layer through protocol
      Object.entries(tiles).forEach(([layer, tileMap]) => {
        if (['floor', 'walls', 'objects', 'assets'].includes(layer)) {
          // Clear layer first, then set new tiles
          const currentMapData = get().mapData
          const currentTiles = currentMapData.tiles[layer as Layer]
          
          // Remove tiles that aren't in the new tilemap
          Object.keys(currentTiles).forEach(key => {
            if (!tileMap[key]) {
              const [x, y] = key.split(',').map(Number)
              protocolEraseTile(layer as Layer, x, y)
            }
          })
          
          // Add new tiles
          Object.entries(tileMap).forEach(([key, tileType]) => {
            const [x, y] = key.split(',').map(Number)
            protocolSetTile(layer as Layer, x, y, tileType)
          })
        }
      })
    },
    
    setTile: (x, y, type) => {
      const currentLayer = get().currentLayer
      protocolSetTile(currentLayer, x, y, type)
    },
    
    eraseTile: (x, y) => {
      const currentLayer = get().currentLayer
      protocolEraseTile(currentLayer, x, y)
    },
    
    // Layer management
    setLayer: (layer) => set({ currentLayer: layer }),
    setSelected: (selected) => set({ selected }),
    toggleLayer: (layer) => set((s) => ({ 
      layerSettings: { 
        ...s.layerSettings, 
        [layer]: { 
          ...s.layerSettings[layer], 
          visible: !s.layerSettings[layer].visible 
        } 
      } 
    })),
    setLayerOpacity: (layer, opacity) => set((s) => ({ 
      layerSettings: { 
        ...s.layerSettings, 
        [layer]: { 
          ...s.layerSettings[layer], 
          opacity: Math.min(1, Math.max(0, opacity)) 
        } 
      } 
    })),
    
    // Asset actions - using protocol functions
    addAssetInstance: (assetInstance) => {
      protocolAddAssetInstance(assetInstance)
    },
    
    updateAssetInstance: (id, updates) => {
      protocolUpdateAssetInstance(id, updates)
    },
    
    deleteAssetInstance: (id) => {
      protocolDeleteAssetInstance(id)
      // Also remove from selection if selected
      set((s) => ({
        selectedAssetInstances: s.selectedAssetInstances.filter(instId => instId !== id)
      }))
    },
    
    selectAssetInstance: (id) => set((s) => ({ 
      selectedAssetInstances: [...s.selectedAssetInstances, id] 
    })),
    
    deselectAssetInstance: (id) => set((s) => ({ 
      selectedAssetInstances: s.selectedAssetInstances.filter(instId => instId !== id) 
    })),
    
    clearAssetSelection: () => set({ selectedAssetInstances: [] }),
    
    // File operations - use Tauri service functions
    saveMapToFile: async () => {
      try {
        return await tauriSaveMap()
      } catch (error) {
        console.error('Error saving map:', error)
        return false
      }
    },
    
    loadMapFromFile: async () => {
      try {
        return await tauriLoadMap()
      } catch (error) {
        console.error('Error loading map:', error)
        return false
      }
    },
    
    reset: () => {
      protocolResetMap()
      set({
        player: { x: 0, y: 0 },
        layerSettings: {
          floor: { visible: true, opacity: 1 },
          walls: { visible: true, opacity: 1 },
          objects: { visible: true, opacity: 1 },
          assets: { visible: true, opacity: 1 },
        },
        selectedAssetInstances: [],
        currentLayer: 'floor',
        selected: 'grass',
      })
    }
  }
  
  return store
})

// Subscribe to protocol changes and update store
subscribeToMapChanges((mapData) => {
  useMapStore.setState({ mapData })
})

// Convenience selectors for commonly used data
export const useTiles = () => useMapStore(state => state.mapData.tiles)
export const useAssetInstances = () => useMapStore(state => state.mapData.assetInstances)
export const useCurrentLayer = () => useMapStore(state => state.currentLayer)
export const useLayerSettings = () => useMapStore(state => state.layerSettings)
export const useSelectedPalette = () => useMapStore(state => state.selected)
export const usePlayerPosition = () => useMapStore(state => state.player)
export const useSelectedAssetInstances = () => useMapStore(state => state.selectedAssetInstances)
