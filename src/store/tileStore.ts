import { create } from 'zustand'
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
import { 
  loadImportedTiles, 
  addImportedTile, 
  removeImportedTile, 
  updateImportedTile,
  clearImportedTiles,
  isImportedTile,
  migrateTilesFromLocalStorage
} from '../services/tilePersistence'

export interface Tile {
  id: string
  name: string
  category: TileCategory
  src: string  // Image source
  thumb?: string  // Optional thumbnail
  isDefault: boolean  // Whether this is a built-in tile
  createdAt?: string  // When it was added/imported
  blendPriority?: number  // Blending priority (higher = dominates blend)
}

export type TileCategory = 'floors' | 'walls' | 'roofs' | 'pathing' | 'special'

interface TileState {
  // Tile definitions
  defaultTiles: Tile[]        // Built-in tiles
  importedTiles: Tile[]       // User-imported tiles (persistent)
  allTiles: Tile[]           // Combined list of all tiles
  
  // Loading state
  isLoading: boolean
  error: string | null
  
  // Category management
  categories: Array<{
    id: TileCategory
    name: string
    description: string
    color: string
  }>
  
  // Actions
  loadDefaultTiles: () => void
  loadImportedTiles: () => Promise<void>
  addTile: (tile: Omit<Tile, 'id'>) => Promise<boolean>
  updateTile: (id: string, updates: Partial<Tile>) => Promise<boolean>
  removeTile: (id: string) => Promise<boolean>
  clearAllImportedTiles: () => Promise<boolean>
  getTileById: (id: string) => Tile | undefined
  getTilesByCategory: (category: TileCategory) => Tile[]
  importTiles: (files: File[], category: TileCategory) => Promise<{ success: number, failed: number, errors: string[] }>
  clearError: () => void
  
  // Migration
  migrateFromLocalStorage: () => Promise<boolean>
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

// Default tiles matching the current system with blend priorities
const DEFAULT_TILES: Omit<Tile, 'id'>[] = [
  // Floor tiles (lower priorities blend into higher priorities)
  { name: 'Grass', category: 'floors', src: TileGrass, isDefault: true, blendPriority: 1 },
  { name: 'Rough Stone Floor', category: 'floors', src: TileFloorStoneRough, isDefault: true, blendPriority: 2 },
  { name: 'Smooth Stone Floor', category: 'floors', src: TileFloorStoneSmooth, isDefault: true, blendPriority: 3 },
  { name: 'Wood Planks', category: 'floors', src: TileFloorWoodPlanks, isDefault: true, blendPriority: 4 },
  { name: 'Cobblestone', category: 'floors', src: TileFloorCobblestone, isDefault: true, blendPriority: 5 },
  
  // Wall tiles (high priority - don't usually blend)
  { name: 'Stone Wall', category: 'walls', src: TileWall, isDefault: true, blendPriority: 10 },
  { name: 'Brick Wall', category: 'walls', src: TileWallBrick, isDefault: true, blendPriority: 10 },
  { name: 'Stone Wall Alt', category: 'walls', src: TileWallStone, isDefault: true, blendPriority: 10 },
  { name: 'Wood Wall', category: 'walls', src: TileWallWood, isDefault: true, blendPriority: 10 },
  
  // Special tiles
  { name: 'Eraser', category: 'special', src: IconErase, isDefault: true, blendPriority: 0 },
  { name: 'Fog of War', category: 'special', src: createFogTileDataURL(), isDefault: true, blendPriority: 1 } // Dark fog tile for painting fog of war
]

export const useTileStore = create<TileState>((set, get) => ({
  // Initial state
  defaultTiles: [],
  importedTiles: [],
  allTiles: [],
  isLoading: false,
  error: null,
  categories: DEFAULT_CATEGORIES,
  
  // Load default tiles (synchronous, from constants)
  loadDefaultTiles: () => {
    const defaultTiles: Tile[] = DEFAULT_TILES.map((tile, index) => ({
      ...tile,
      id: `default_${index}`,
      thumb: tile.src
    }))
    
    set(state => ({
      defaultTiles,
      allTiles: [...defaultTiles, ...state.importedTiles]
    }))
    
    console.log(`Loaded ${defaultTiles.length} default tiles`)
  },
  
  // Load imported tiles from file storage
  loadImportedTiles: async () => {
    try {
      set({ isLoading: true, error: null })
      
      const importedTiles = await loadImportedTiles()
      
      set(state => ({
        importedTiles,
        allTiles: [...state.defaultTiles, ...importedTiles],
        isLoading: false
      }))
      
      console.log(`Loaded ${importedTiles.length} imported tiles`)
    } catch (error) {
      console.error('Error loading imported tiles:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },
  
  // Add a new tile (will be persisted)
  addTile: async (tileData) => {
    try {
      const newTile: Tile = {
        ...tileData,
        id: `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        isDefault: false // Ensure added tiles are marked as imported
      }
      
      const success = await addImportedTile(newTile)
      if (success) {
        set(state => {
          const updatedImported = [...state.importedTiles, newTile]
          return {
            importedTiles: updatedImported,
            allTiles: [...state.defaultTiles, ...updatedImported],
            error: null // Clear any previous errors on success
          }
        })
        console.log('Tile added successfully:', newTile.name)
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding tile:', error)
      let errorMessage = 'Failed to save tile to file'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      set({ error: errorMessage })
      return false
    }
  },
  
  // Update an existing tile
  updateTile: async (id, updates) => {
    try {
      if (!isImportedTile(id)) {
        console.error('Cannot update default tile:', id)
        return false
      }
      
      const success = await updateImportedTile(id, updates)
      if (success) {
        set(state => {
          const updatedImported = state.importedTiles.map(tile =>
            tile.id === id ? { ...tile, ...updates } : tile
          )
          return {
            importedTiles: updatedImported,
            allTiles: [...state.defaultTiles, ...updatedImported]
          }
        })
        console.log('Tile updated successfully:', id)
      }
      return success
    } catch (error) {
      console.error('Error updating tile:', error)
      return false
    }
  },
  
  // Remove a tile by ID
  removeTile: async (id) => {
    try {
      if (!isImportedTile(id)) {
        console.error('Cannot remove default tile:', id)
        return false
      }
      
      const success = await removeImportedTile(id)
      if (success) {
        set(state => {
          const updatedImported = state.importedTiles.filter(tile => tile.id !== id)
          return {
            importedTiles: updatedImported,
            allTiles: [...state.defaultTiles, ...updatedImported]
          }
        })
        console.log('Tile removed successfully:', id)
      }
      return success
    } catch (error) {
      console.error('Error removing tile:', error)
      return false
    }
  },
  
  // Clear all imported tiles
  clearAllImportedTiles: async () => {
    try {
      const success = await clearImportedTiles()
      if (success) {
        set(state => ({
          importedTiles: [],
          allTiles: [...state.defaultTiles]
        }))
        console.log('All imported tiles cleared')
      }
      return success
    } catch (error) {
      console.error('Error clearing imported tiles:', error)
      return false
    }
  },
  
  // Get tile by ID
  getTileById: (id) => {
    return get().allTiles.find(t => t.id === id)
  },
  
  // Get tiles by category
  getTilesByCategory: (category) => {
    return get().allTiles.filter(t => t.category === category)
  },
  
  // Import tiles from files
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
  
  // Clear error state
  clearError: () => {
    set({ error: null })
  },
  
  // Migrate from localStorage
  migrateFromLocalStorage: async () => {
    try {
      set({ isLoading: true, error: null })
      const success = await migrateTilesFromLocalStorage()
      if (success) {
        // Reload imported tiles after migration
        await get().loadImportedTiles()
      }
      set({ isLoading: false })
      return success
    } catch (error) {
      console.error('Error migrating from localStorage:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Migration failed',
        isLoading: false 
      })
      return false
    }
  }
}))

// Convenience hooks for accessing specific data
export const useAllTiles = () => useTileStore(state => state.allTiles)
export const useDefaultTiles = () => useTileStore(state => state.defaultTiles)
export const useImportedTiles = () => useTileStore(state => state.importedTiles)
export const useTileCategories = () => useTileStore(state => state.categories)
export const useTileLoading = () => useTileStore(state => state.isLoading)
export const useTileError = () => useTileStore(state => state.error)
export const useFloorTiles = () => useTileStore(state => state.allTiles.filter(t => t.category === 'floors'))
export const useWallTiles = () => useTileStore(state => state.allTiles.filter(t => t.category === 'walls'))
export const useRoofTiles = () => useTileStore(state => state.allTiles.filter(t => t.category === 'roofs'))
export const usePathingTiles = () => useTileStore(state => state.allTiles.filter(t => t.category === 'pathing'))
export const useSpecialTiles = () => useTileStore(state => state.allTiles.filter(t => t.category === 'special'))
