// Asset persistence service for user-imported assets
// Desktop-only storage using Tauri file system

import type { Asset } from '../store'

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
    throw new Error('This application requires the desktop version to save assets. Please run the Tauri desktop app instead of the web browser version.')
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch (error) {
    throw new Error('Failed to initialize desktop file system. Please ensure you are running the desktop application.')
  }
}

/**
 * Load imported assets from file storage
 */
export async function loadImportedAssets(): Promise<Asset[]> {
  try {
    if (!isTauriApp()) {
      console.warn('Running in web mode - imported assets not available')
      return []
    }
    
    const invoke = await getTauriInvoke()
    const assetsJson = await invoke<string>('read_imported_assets')
    const assets = JSON.parse(assetsJson) as Asset[]
    
    // Ensure backward compatibility: assets without 'type' default to 'regular'
    return assets.map(asset => ({
      ...asset,
      type: asset.type || 'regular'
    }))
  } catch (error) {
    // File doesn't exist yet or other errors, return empty array
    console.log('No imported assets file found, starting with empty list')
    return []
  }
}

/**
 * Save imported assets to file storage
 */
export async function saveImportedAssets(assets: Asset[]): Promise<boolean> {
  try {
    const assetsJson = JSON.stringify(assets, null, 2)
    console.log('Saving assets:', { count: assets.length, totalSize: assetsJson.length })
    
    const invoke = await getTauriInvoke()
    await invoke<void>('write_imported_assets', { assetsData: assetsJson })
    console.log('Imported assets saved to file')
    return true
  } catch (error) {
    console.error('Failed to save imported assets:', error)
    throw new Error('Failed to save assets to file. Please check file permissions and disk space.')
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
  // Imported assets have IDs that start with 'imported_' or legacy 'map_' format
  return assetId.startsWith('imported_') || assetId.startsWith('map_')
}
