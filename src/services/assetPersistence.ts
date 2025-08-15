// Asset persistence service for user-imported assets
// Handles saving/loading imported assets to localStorage (dev) or file system (Tauri)

import type { Asset } from '../store'

// Check if we're running in Tauri (desktop) or web development mode
const isTauriApp = () => {
  const hasTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined
  console.log('Tauri detection:', { hasTauri, windowTauri: (window as any).__TAURI__ })
  return hasTauri
}

// Dynamic import of Tauri API to avoid errors in web mode
const getTauriInvoke = async () => {
  if (!isTauriApp()) {
    throw new Error('Tauri API not available in web mode')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

const STORAGE_KEY = 'dungeon_imported_assets'

/**
 * Load imported assets from persistent storage
 */
export async function loadImportedAssets(): Promise<Asset[]> {
  try {
    if (!isTauriApp()) {
      // In web mode, use localStorage
      const assetsJson = localStorage.getItem(STORAGE_KEY)
      if (!assetsJson) return []
      return JSON.parse(assetsJson)
    }
    
    // In Tauri mode, try to read from file
    const invoke = await getTauriInvoke()
    try {
      const assetsJson = await invoke<string>('read_imported_assets')
      return JSON.parse(assetsJson)
    } catch (error) {
      // File doesn't exist yet, return empty array
      console.log('No imported assets file found, starting with empty list')
      return []
    }
  } catch (error) {
    console.error('Failed to load imported assets:', error)
    return []
  }
}

/**
 * Save imported assets to persistent storage
 */
export async function saveImportedAssets(assets: Asset[]): Promise<boolean> {
  try {
    const assetsJson = JSON.stringify(assets, null, 2)
    console.log('Saving assets:', { count: assets.length, totalSize: assetsJson.length, isTauri: isTauriApp() })
    
    if (!isTauriApp()) {
      // In web mode, use localStorage
      try {
        localStorage.setItem(STORAGE_KEY, assetsJson)
        console.log('Imported assets saved to browser storage')
        return true
      } catch (storageError) {
        console.error('LocalStorage error:', storageError)
        throw storageError
      }
    }
    
    // In Tauri mode, save to file
    const invoke = await getTauriInvoke()
    await invoke<void>('write_imported_assets', { assetsData: assetsJson })
    console.log('Imported assets saved to file')
    return true
  } catch (error) {
    console.error('Failed to save imported assets:', error)
    return false
  }
}

/**
 * Add a new imported asset
 */
export async function addImportedAsset(asset: Asset): Promise<boolean> {
  try {
    const currentAssets = await loadImportedAssets()
    const updatedAssets = [...currentAssets, asset]
    return await saveImportedAssets(updatedAssets)
  } catch (error) {
    console.error('Failed to add imported asset:', error)
    return false
  }
}

/**
 * Remove an imported asset by ID
 */
export async function removeImportedAsset(assetId: string): Promise<boolean> {
  try {
    const currentAssets = await loadImportedAssets()
    const updatedAssets = currentAssets.filter(asset => asset.id !== assetId)
    return await saveImportedAssets(updatedAssets)
  } catch (error) {
    console.error('Failed to remove imported asset:', error)
    return false
  }
}

/**
 * Update an existing imported asset
 */
export async function updateImportedAsset(assetId: string, updates: Partial<Asset>): Promise<boolean> {
  try {
    const currentAssets = await loadImportedAssets()
    const assetIndex = currentAssets.findIndex(asset => asset.id === assetId)
    
    if (assetIndex === -1) {
      console.error('Asset not found for update:', assetId)
      return false
    }
    
    currentAssets[assetIndex] = { ...currentAssets[assetIndex], ...updates }
    return await saveImportedAssets(currentAssets)
  } catch (error) {
    console.error('Failed to update imported asset:', error)
    return false
  }
}

/**
 * Clear all imported assets
 */
export async function clearImportedAssets(): Promise<boolean> {
  try {
    if (!isTauriApp()) {
      localStorage.removeItem(STORAGE_KEY)
      console.log('All imported assets cleared from browser storage')
      return true
    }
    
    const invoke = await getTauriInvoke()
    await invoke<void>('clear_imported_assets')
    console.log('All imported assets cleared from file')
    return true
  } catch (error) {
    console.error('Failed to clear imported assets:', error)
    return false
  }
}

/**
 * Check if an asset is user-imported (vs from default manifest)
 */
export function isImportedAsset(assetId: string): boolean {
  // Imported assets have IDs that start with 'imported_'
  return assetId.startsWith('imported_')
}
