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
  setMapData as protocolSetMapData,
  type MapData
} from './protocol'
import { saveMapToFile as tauriSaveMap, loadMapFromFile as tauriLoadMap } from './services/tauri'
import { invalidateTileCache } from './utils/tileRenderer'
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
  
  // Asset placement state
  selectedAssetForPlacement: string | null // Asset ID selected for placement
  
  // Map asset state - for canvas background override
  mapAsset: {
    assetId: string | null // ID of the map asset used as canvas background
    isActive: boolean // Whether bounded canvas mode is active
    bounds: { // Map boundaries in grid coordinates
      minX: number
      minY: number
      maxX: number
      maxY: number
    } | null
    // Alignment offset in grid units for fine-tuning map position
    offsetX: number
    offsetY: number
  }
  
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
  setSelectedAssetForPlacement: (assetId: string | null) => void
  
  // Map asset management
  setMapAsset: (assetId: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void
  clearMapAsset: () => void
  toggleCanvasMode: () => void // Toggle between infinite and bounded mode
  adjustMapAlignment: (offsetX: number, offsetY: number) => void // Adjust map alignment offset
  resetMapAlignment: () => void // Reset alignment to default
  
  // File operations
  saveMapToFile: () => Promise<boolean>
  loadMapFromFile: () => Promise<boolean>
  loadMapData: (mapData: MapData) => void
  
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
      fog: { visible: true, opacity: 1 },
    },
    selectedAssetInstances: [],
    selectedAssetForPlacement: null,
    
    // Initialize map asset state
    mapAsset: {
      assetId: null,
      isActive: false,
      bounds: null,
      offsetX: 0,
      offsetY: 0
    },
    
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
        if (['floor', 'walls', 'objects', 'assets', 'fog'].includes(layer)) {
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
      const state = get()
      const { mapAsset } = state
      
      // Check bounds in bounded canvas mode
      if (mapAsset.isActive && mapAsset.bounds) {
        const { bounds } = mapAsset
        if (x < bounds.minX || x >= bounds.maxX || y < bounds.minY || y >= bounds.maxY) {
          // Tile is outside map bounds in bounded mode, ignore
          return
        }
      }
      
      const currentLayer = state.currentLayer
      protocolSetTile(currentLayer, x, y, type)
      // Invalidate cache for this tile and its neighbors
      invalidateTileCache(x, y)
    },
    
    eraseTile: (x, y) => {
      const state = get()
      const { mapAsset } = state
      
      // Check bounds in bounded canvas mode
      if (mapAsset.isActive && mapAsset.bounds) {
        const { bounds } = mapAsset
        if (x < bounds.minX || x >= bounds.maxX || y < bounds.minY || y >= bounds.maxY) {
          // Tile is outside map bounds in bounded mode, ignore
          return
        }
      }
      
      const currentLayer = state.currentLayer
      protocolEraseTile(currentLayer, x, y)
      // Invalidate cache for this tile and its neighbors
      invalidateTileCache(x, y)
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
    
  // Asset placement selection
  setSelectedAssetForPlacement: (assetId: string | null) => set({ selectedAssetForPlacement: assetId }),
  
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
    
    // Map asset management actions
    setMapAsset: (assetId, bounds) => set((s) => ({
      mapAsset: {
        assetId,
        isActive: true,
        bounds,
        offsetX: s.mapAsset.offsetX, // Preserve existing alignment
        offsetY: s.mapAsset.offsetY
      }
    })),
    
    clearMapAsset: () => set((s) => ({
      mapAsset: {
        assetId: null,
        isActive: false,
        bounds: null,
        offsetX: 0,
        offsetY: 0
      }
    })),
    
    toggleCanvasMode: () => set((s) => ({
      mapAsset: {
        ...s.mapAsset,
        isActive: !s.mapAsset.isActive
      }
    })),
    
    // Map alignment controls
    adjustMapAlignment: (offsetX, offsetY) => set((s) => ({
      mapAsset: {
        ...s.mapAsset,
        offsetX: s.mapAsset.offsetX + offsetX,
        offsetY: s.mapAsset.offsetY + offsetY
      }
    })),
    
    resetMapAlignment: () => set((s) => ({
      mapAsset: {
        ...s.mapAsset,
        offsetX: 0,
        offsetY: 0
      }
    })),
    
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
    
    loadMapData: (mapData) => {
      protocolSetMapData(mapData)
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
          fog: { visible: true, opacity: 1 },
        },
        selectedAssetInstances: [],
        selectedAssetForPlacement: null,
        mapAsset: {
          assetId: null,
          isActive: false,
          bounds: null,
          offsetX: 0,
          offsetY: 0
        },
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
export const useSelectedAssetForPlacement = () => useMapStore(state => state.selectedAssetForPlacement)
export const useMapAsset = () => useMapStore(state => state.mapAsset)
export const useCanvasMode = () => useMapStore(state => state.mapAsset.isActive ? 'bounded' : 'infinite')
