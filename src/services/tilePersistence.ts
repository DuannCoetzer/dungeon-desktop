// Tile persistence service for user-imported tiles
// Desktop-only storage using Tauri file system

import type { Tile } from '../store/tileStore'

// Check if running in Tauri context with improved detection
const isTauriApp = () => {
  if (typeof window === 'undefined') return false
  
  // Multiple ways to detect Tauri environment
  const hasTauri = '__TAURI__' in window
  const hasTauriInvoke = '__TAURI_INTERNALS__' in window
  const hasTauriLocation = window.location.protocol === 'tauri:' || window.location.hostname === 'tauri.localhost'
  
  const isTauri = hasTauri || hasTauriInvoke || hasTauriLocation
  
  if (isTauri) {
    console.log('✅ Desktop mode detected:', {
      hasTauri,
      hasTauriInvoke,
      hasTauriLocation,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      userAgent: navigator.userAgent.includes('tauri')
    })
  } else {
    console.log('🌐 Web mode detected:', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      hasTauri: false
    })
  }
  
  return isTauri
}

// Dynamic import of Tauri API with error handling
const getTauriInvoke = async () => {
  if (!isTauriApp()) {
    throw new Error('This application requires the desktop version to save tiles. Please run the Tauri desktop app instead of the web browser version.')
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch (error) {
    throw new Error('Failed to initialize desktop file system. Please ensure you are running the desktop application.')
  }
}

// Interface for the persisted tile store structure
interface PersistedTileStore {
  tiles: Tile[]
  version: number
}

/**
 * Load imported tiles from file storage
 */
export async function loadImportedTiles(): Promise<Tile[]> {
  try {
    if (!isTauriApp()) {
      console.warn('Running in web mode - imported tiles not available, checking localStorage for migration')
      
      // In web mode, try to load from localStorage for migration purposes
      const localStorageData = localStorage.getItem('tile-store')
      if (localStorageData) {
        try {
          const parsed = JSON.parse(localStorageData)
          if (parsed?.state?.tiles) {
            // Return only non-default tiles for migration
            return parsed.state.tiles.filter((tile: Tile) => !tile.isDefault)
          }
        } catch (error) {
          console.warn('Failed to parse localStorage tile data for migration:', error)
        }
      }
      
      return []
    }
    
    const invoke = await getTauriInvoke()
    const tilesJson = await invoke<string>('read_imported_tiles')
    const tileStore: PersistedTileStore = JSON.parse(tilesJson)
    
    // Filter out default tiles - we only persist imported tiles in the file
    return tileStore.tiles.filter(tile => !tile.isDefault)
  } catch (error) {
    // File doesn't exist yet or other errors, return empty array
    console.log('No imported tiles file found, starting with empty list')
    return []
  }
}

/**
 * Save imported tiles to file storage
 */
export async function saveImportedTiles(tiles: Tile[]): Promise<boolean> {
  try {
    // Only save non-default tiles to file
    const importedTiles = tiles.filter(tile => !tile.isDefault)
    
    const tileStore: PersistedTileStore = {
      tiles: importedTiles,
      version: 2
    }
    
    const tilesJson = JSON.stringify(tileStore, null, 2)
    console.log('Saving tiles:', { count: importedTiles.length, totalSize: tilesJson.length })
    
    const invoke = await getTauriInvoke()
    await invoke<void>('write_imported_tiles', { tilesData: tilesJson })
    console.log('Imported tiles saved to file')
    return true
  } catch (error) {
    console.error('Failed to save imported tiles:', error)
    throw new Error('Failed to save tiles to file. Please check file permissions and disk space.')
  }
}

/**
 * Add a new imported tile
 */
export async function addImportedTile(tile: Tile): Promise<boolean> {
  try {
    const currentTiles = await loadImportedTiles()
    const updatedTiles = [...currentTiles, tile]
    return await saveImportedTiles(updatedTiles)
  } catch (error) {
    console.error('Failed to add imported tile:', error)
    return false
  }
}

/**
 * Remove an imported tile by ID
 */
export async function removeImportedTile(tileId: string): Promise<boolean> {
  try {
    const currentTiles = await loadImportedTiles()
    const updatedTiles = currentTiles.filter(tile => tile.id !== tileId)
    return await saveImportedTiles(updatedTiles)
  } catch (error) {
    console.error('Failed to remove imported tile:', error)
    return false
  }
}

/**
 * Update an existing imported tile
 */
export async function updateImportedTile(tileId: string, updates: Partial<Tile>): Promise<boolean> {
  try {
    const currentTiles = await loadImportedTiles()
    const tileIndex = currentTiles.findIndex(tile => tile.id === tileId)
    
    if (tileIndex === -1) {
      console.error('Tile not found for update:', tileId)
      return false
    }
    
    currentTiles[tileIndex] = { ...currentTiles[tileIndex], ...updates }
    return await saveImportedTiles(currentTiles)
  } catch (error) {
    console.error('Failed to update imported tile:', error)
    return false
  }
}

/**
 * Clear all imported tiles
 */
export async function clearImportedTiles(): Promise<boolean> {
  try {
    const invoke = await getTauriInvoke()
    await invoke<void>('clear_imported_tiles')
    console.log('All imported tiles cleared from file')
    return true
  } catch (error) {
    console.error('Failed to clear imported tiles:', error)
    return false
  }
}

/**
 * Check if a tile is user-imported (vs default)
 */
export function isImportedTile(tileId: string): boolean {
  // Imported tiles have IDs that don't start with 'default_'
  return !tileId.startsWith('default_')
}

/**
 * Migrate tiles from localStorage to file storage
 */
export async function migrateTilesFromLocalStorage(): Promise<boolean> {
  try {
    if (!isTauriApp()) {
      console.log('Cannot migrate in web mode')
      return false
    }
    
    // Check if we have localStorage data to migrate
    const localStorageData = localStorage.getItem('tile-store')
    if (!localStorageData) {
      console.log('No localStorage tile data found to migrate')
      return true // Nothing to migrate is not an error
    }
    
    try {
      const parsed = JSON.parse(localStorageData)
      if (parsed?.state?.tiles) {
        // Extract only imported (non-default) tiles
        const importedTiles = parsed.state.tiles.filter((tile: Tile) => !tile.isDefault)
        
        if (importedTiles.length > 0) {
          console.log(`Migrating ${importedTiles.length} tiles from localStorage to file storage`)
          
          // Save to file
          const success = await saveImportedTiles(importedTiles)
          
          if (success) {
            // Clear localStorage after successful migration
            localStorage.removeItem('tile-store')
            console.log('Tile migration completed successfully')
            return true
          }
        } else {
          // No imported tiles to migrate, just clear localStorage
          localStorage.removeItem('tile-store')
          console.log('No imported tiles to migrate, cleared localStorage')
          return true
        }
      }
    } catch (parseError) {
      console.error('Failed to parse localStorage tile data for migration:', parseError)
      return false
    }
    
    return false
  } catch (error) {
    console.error('Failed to migrate tiles from localStorage:', error)
    return false
  }
}