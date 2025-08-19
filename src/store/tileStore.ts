import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  TileGrass, 
  TileWall,
  TileFloorStoneRough,
  TileFloorStoneSmooth, 
  TileFloorWoodPlanks,
  TileFloorCobblestone,
  TileWallBrick,
  TileWallStone,
  TileWallWood,
  IconErase
} from '../assets'

export interface Tile {
  id: string
  name: string
  category: TileCategory
  src: string  // Image source
  thumb?: string  // Optional thumbnail
  isDefault: boolean  // Whether this is a built-in tile
  createdAt?: string  // When it was added/imported
}

export type TileCategory = 'floors' | 'walls' | 'roofs' | 'pathing' | 'special'

interface TileState {
  // Tile definitions
  tiles: Tile[]
  
  // Category management
  categories: Array<{
    id: TileCategory
    name: string
    description: string
    color: string
  }>
  
  // Actions
  addTile: (tile: Omit<Tile, 'id'>) => Promise<boolean>
  updateTile: (id: string, updates: Partial<Tile>) => Promise<boolean>
  removeTile: (id: string) => Promise<boolean>
  getTileById: (id: string) => Tile | undefined
  getTilesByCategory: (category: TileCategory) => Tile[]
  importTiles: (files: File[], category: TileCategory) => Promise<{ success: number, failed: number, errors: string[] }>
  
  // Initialize default tiles
  loadDefaultTiles: () => void
}

// Create a fog tile image as a data URL
function createFogTileDataURL(): string {
  // Create a 32x32 canvas with dark semi-transparent fog
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  
  // Fill with dark semi-transparent color
  ctx.fillStyle = 'rgba(10, 20, 30, 0.8)' // Dark blue-black with transparency
  ctx.fillRect(0, 0, 32, 32)
  
  // Add some texture/pattern
  ctx.fillStyle = 'rgba(5, 10, 15, 0.3)'
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(i * 4, j * 4, 4, 4)
      }
    }
  }
  
  return canvas.toDataURL()
}

// Default tile categories
const DEFAULT_CATEGORIES = [
  { id: 'floors' as TileCategory, name: 'Floors', description: 'Floor tiles and terrain', color: '#22d3ee' },
  { id: 'walls' as TileCategory, name: 'Walls', description: 'Wall and barrier tiles', color: '#f59e0b' },
  { id: 'roofs' as TileCategory, name: 'Roofs', description: 'Roof and ceiling tiles', color: '#a855f7' },
  { id: 'pathing' as TileCategory, name: 'Pathing', description: 'Roads, paths, and walkways', color: '#4ade80' },
  { id: 'special' as TileCategory, name: 'Special', description: 'Special purpose tiles and tools', color: '#ef4444' }
]

// Default tiles matching the current system
const DEFAULT_TILES: Omit<Tile, 'id'>[] = [
  // Floor tiles
  { name: 'Grass', category: 'floors', src: TileGrass, isDefault: true },
  { name: 'Rough Stone Floor', category: 'floors', src: TileFloorStoneRough, isDefault: true },
  { name: 'Smooth Stone Floor', category: 'floors', src: TileFloorStoneSmooth, isDefault: true },
  { name: 'Wood Planks', category: 'floors', src: TileFloorWoodPlanks, isDefault: true },
  { name: 'Cobblestone', category: 'floors', src: TileFloorCobblestone, isDefault: true },
  
  // Wall tiles
  { name: 'Stone Wall', category: 'walls', src: TileWall, isDefault: true },
  { name: 'Brick Wall', category: 'walls', src: TileWallBrick, isDefault: true },
  { name: 'Stone Wall Alt', category: 'walls', src: TileWallStone, isDefault: true },
  { name: 'Wood Wall', category: 'walls', src: TileWallWood, isDefault: true },
  
  // Special tiles
  { name: 'Eraser', category: 'special', src: IconErase, isDefault: true },
  { name: 'Fog of War', category: 'special', src: createFogTileDataURL(), isDefault: true } // Dark fog tile for painting fog of war
]

export const useTileStore = create<TileState>()(
  persist(
    (set, get) => ({
      tiles: [],
      categories: DEFAULT_CATEGORIES,
      
      addTile: async (tileData) => {
        const newTile: Tile = {
          ...tileData,
          id: `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        }
        
        set(state => ({
          tiles: [...state.tiles, newTile]
        }))
        
        return true
      },
      
      updateTile: async (id, updates) => {
        const state = get()
        const existingTile = state.tiles.find(t => t.id === id)
        
        if (!existingTile) return false
        
        // Don't allow updating default tiles' core properties
        if (existingTile.isDefault && ('category' in updates || 'src' in updates)) {
          return false
        }
        
        set(state => ({
          tiles: state.tiles.map(tile => 
            tile.id === id ? { ...tile, ...updates } : tile
          )
        }))
        
        return true
      },
      
      removeTile: async (id) => {
        const state = get()
        const tile = state.tiles.find(t => t.id === id)
        
        // Don't allow deleting default tiles
        if (tile?.isDefault) return false
        
        set(state => ({
          tiles: state.tiles.filter(tile => tile.id !== id)
        }))
        
        return true
      },
      
      getTileById: (id) => {
        return get().tiles.find(t => t.id === id)
      },
      
      getTilesByCategory: (category) => {
        return get().tiles.filter(t => t.category === category)
      },
      
      importTiles: async (files, category) => {
        const results = { success: 0, failed: 0, errors: [] as string[] }
        
        for (const file of files) {
          try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
              results.failed++
              results.errors.push(`${file.name}: Not an image file`)
              continue
            }
            
            // Convert to data URL
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = (e) => resolve(e.target?.result as string)
              reader.onerror = reject
              reader.readAsDataURL(file)
            })
            
            // Create tile
            const success = await get().addTile({
              name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
              category,
              src: dataUrl,
              thumb: dataUrl,
              isDefault: false
            })
            
            if (success) {
              results.success++
            } else {
              results.failed++
              results.errors.push(`${file.name}: Failed to save`)
            }
          } catch (error) {
            results.failed++
            results.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        return results
      },
      
      loadDefaultTiles: () => {
        const state = get()
        
        // For version 2, we need to reload to include the fog tile
        // Remove all existing default tiles and reload them
        const defaultTiles: Tile[] = DEFAULT_TILES.map((tile, index) => ({
          ...tile,
          id: `default_${index}`,
          thumb: tile.src
        }))
        
        set(state => ({
          tiles: [...defaultTiles, ...state.tiles.filter(t => !t.isDefault)]
        }))
      }
    }),
    {
      name: 'tile-store',
      version: 2 // Bumped to force reload with fog tile
    }
  )
)

// Convenience hooks for accessing specific data
export const useAllTiles = () => useTileStore(state => state.tiles)
export const useTileCategories = () => useTileStore(state => state.categories)
export const useFloorTiles = () => useTileStore(state => state.tiles.filter(t => t.category === 'floors'))
export const useWallTiles = () => useTileStore(state => state.tiles.filter(t => t.category === 'walls'))
export const useRoofTiles = () => useTileStore(state => state.tiles.filter(t => t.category === 'roofs'))
export const usePathingTiles = () => useTileStore(state => state.tiles.filter(t => t.category === 'pathing'))
export const useSpecialTiles = () => useTileStore(state => state.tiles.filter(t => t.category === 'special'))
