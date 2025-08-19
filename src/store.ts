// Backward-compatible store that wraps the new stores
// This file maintains the old API while delegating to the new stores

import { create } from 'zustand'
import { useMapStore } from './mapStore'
import { useUIStore } from './uiStore'
import type { Tool } from './uiStore'
import type { Position } from './mapStore'

// Re-export types for backward compatibility
export type TileType = Palette
export type Palette = 
  | 'grass' 
  | 'wall' 
  | 'delete'
  // Floor tiles
  | 'floor-stone-rough'
  | 'floor-stone-smooth' 
  | 'floor-wood-planks'
  | 'floor-cobblestone'
  // Wall tiles
  | 'wall-brick'
  | 'wall-stone'
  | 'wall-wood'
  // Special tiles
  | 'fog'
export type Layer = 'floor' | 'walls' | 'objects' | 'assets' | 'fog'
export type TileMap = Record<string, TileType>

export interface Asset {
  id: string
  name: string
  thumb: string
  src: string
  width: number
  height: number
  // Grid dimensions - how many grid cells this asset occupies
  gridWidth: number
  gridHeight: number
  // Asset category for organization
  category?: string
}

export interface AssetInstance {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  // Grid dimensions - how many grid cells this instance occupies
  gridWidth: number
  gridHeight: number
  selected?: boolean
}

interface LayerSettings { visible: boolean; opacity: number }

// Backward compatible interface - delegates to new stores
interface DungeonState {
  // Properties that delegate to the new stores
  player: Position
  tiles: Record<Layer, TileMap>
  layerSettings: Record<Layer, LayerSettings>
  assetInstances: AssetInstance[]
  selectedAssetInstances: string[]
  tool: Tool
  selected: Palette
  currentLayer: Layer

  // Actions that delegate to new stores
  setPlayer: (pos: Position) => void
  movePlayer: (dx: number, dy: number) => void
  setTiles: (tiles: Record<Layer, TileMap>) => void
  setTool: (tool: Tool) => void
  setSelected: (sel: Palette) => void
  setLayer: (layer: Layer) => void
  toggleLayer: (layer: Layer) => void
  setLayerOpacity: (layer: Layer, opacity: number) => void
  setTile: (x: number, y: number, type: TileType) => void
  eraseTile: (x: number, y: number) => void
  
  // Asset actions
  addAssetInstance: (assetInstance: AssetInstance) => void
  updateAssetInstance: (id: string, updates: Partial<AssetInstance>) => void
  deleteAssetInstance: (id: string) => void
  selectAssetInstance: (id: string) => void
  deselectAssetInstance: (id: string) => void
  clearAssetSelection: () => void
  
  reset: () => void
}

// Create the backward-compatible store that delegates to the new stores
export const useDungeonStore = create<DungeonState>((set) => {
  // Subscribe to changes from both stores and update this wrapper
  useMapStore.subscribe((mapState) => {
    set({
      player: mapState.player,
      tiles: mapState.mapData.tiles,
      layerSettings: mapState.layerSettings,
      assetInstances: mapState.mapData.assetInstances,
      selectedAssetInstances: mapState.selectedAssetInstances,
      selected: mapState.selected,
      currentLayer: mapState.currentLayer,
    })
  })
  
  useUIStore.subscribe((uiState) => {
    set({
      tool: uiState.selectedTool,
    })
  })
  
  // Initialize with current state from both stores
  const initialMapState = useMapStore.getState()
  const initialUIState = useUIStore.getState()
  
  return {
    // Initialize with current state from both stores
    player: initialMapState.player,
    tiles: initialMapState.mapData.tiles,
    layerSettings: initialMapState.layerSettings,
    assetInstances: initialMapState.mapData.assetInstances,
    selectedAssetInstances: initialMapState.selectedAssetInstances,
    tool: initialUIState.selectedTool,
    selected: initialMapState.selected,
    currentLayer: initialMapState.currentLayer,

    // Delegate actions to the appropriate stores
    setPlayer: (pos) => useMapStore.getState().setPlayer(pos),
    movePlayer: (dx, dy) => useMapStore.getState().movePlayer(dx, dy),
    
    setTiles: (tiles) => useMapStore.getState().setTiles(tiles),
    setTool: (tool) => useUIStore.getState().setSelectedTool(tool),
    setSelected: (selected) => useMapStore.getState().setSelected(selected),
    setLayer: (layer) => useMapStore.getState().setLayer(layer),
    toggleLayer: (layer) => useMapStore.getState().toggleLayer(layer),
    setLayerOpacity: (layer, opacity) => useMapStore.getState().setLayerOpacity(layer, opacity),
    
    setTile: (x, y, type) => useMapStore.getState().setTile(x, y, type),
    eraseTile: (x, y) => useMapStore.getState().eraseTile(x, y),
    
    // Asset actions
    addAssetInstance: (assetInstance) => useMapStore.getState().addAssetInstance(assetInstance),
    updateAssetInstance: (id, updates) => useMapStore.getState().updateAssetInstance(id, updates),
    deleteAssetInstance: (id) => useMapStore.getState().deleteAssetInstance(id),
    selectAssetInstance: (id) => useMapStore.getState().selectAssetInstance(id),
    deselectAssetInstance: (id) => useMapStore.getState().deselectAssetInstance(id),
    clearAssetSelection: () => useMapStore.getState().clearAssetSelection(),
    
    reset: () => {
      useMapStore.getState().reset()
      useUIStore.getState().setSelectedTool('select')
      useUIStore.getState().clearAllTempState()
    },
  }
})
