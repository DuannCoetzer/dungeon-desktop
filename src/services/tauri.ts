// Tauri service wrapper for IPC commands
// This module provides a clean interface for interacting with Tauri's file system and dialogs

import { serializeMap, deserializeMap } from '../protocol'

// Check if we're running in Tauri (desktop) or web development mode
const isTauriApp = () => {
  if (typeof window === 'undefined') return false
  
  // Multiple ways to detect Tauri environment
  const hasTauri = '__TAURI__' in window
  const hasTauriInvoke = '__TAURI_INTERNALS__' in window
  const hasTauriLocation = window.location.protocol === 'tauri:' || window.location.hostname === 'tauri.localhost'
  
  return hasTauri || hasTauriInvoke || hasTauriLocation
}

// Dynamic import of Tauri API to avoid errors in web mode
const getTauriInvoke = async () => {
  if (!isTauriApp()) {
    throw new Error('Tauri API not available in web mode')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

/**
 * Shows an open file dialog and returns the selected file path
 */
export async function openFileDialog(): Promise<string | null> {
  try {
    if (!isTauriApp()) {
      // In web mode, simulate file dialog with a prompt
      const filename = prompt('Enter filename to load (without extension):')
      return filename ? `${filename}.json` : null
    }
    
    const invoke = await getTauriInvoke()
    const result = await invoke<string | null>('open_file_dialog')
    return result
  } catch (error) {
    console.error('Failed to open file dialog:', error)
    return null
  }
}

/**
 * Shows a save file dialog and returns the selected file path
 */
export async function saveFileDialog(): Promise<string | null> {
  try {
    if (!isTauriApp()) {
      // In web mode, simulate save dialog with a prompt
      const filename = prompt('Enter filename to save (without extension):')
      return filename ? `${filename}.json` : null
    }
    
    const invoke = await getTauriInvoke()
    const result = await invoke<string | null>('save_file_dialog')
    return result
  } catch (error) {
    console.error('Failed to open save dialog:', error)
    return null
  }
}

/**
 * Reads the contents of a file
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    if (!isTauriApp()) {
      // In web mode, use localStorage as fallback
      const contents = localStorage.getItem(`dungeon_map_${filePath}`)
      return contents
    }
    
    const invoke = await getTauriInvoke()
    const contents = await invoke<string>('read_file', { filePath })
    return contents
  } catch (error) {
    console.error('Failed to read file:', error)
    return null
  }
}

/**
 * Writes contents to a file
 */
export async function writeFile(filePath: string, contents: string): Promise<boolean> {
  try {
    if (!isTauriApp()) {
      // In web mode, use localStorage as fallback
      localStorage.setItem(`dungeon_map_${filePath}`, contents)
      console.log(`Map saved to browser storage as: ${filePath}`)
      return true
    }
    
    const invoke = await getTauriInvoke()
    await invoke<void>('write_file', { filePath, contents })
    return true
  } catch (error) {
    console.error('Failed to write file:', error)
    return false
  }
}

/**
 * Shows a load dialog and loads map data
 */
export async function loadMapFromFile(): Promise<boolean> {
  try {
    if (!isTauriApp()) {
      // In web mode, use our browser-based load function
      return await loadMap()
    }
    
    const invoke = await getTauriInvoke()
    const result = await invoke<string | null>('load_map')
    
    if (result) {
      // Use protocol's deserializeMap to import into MapStore
      const success = deserializeMap(result)
      if (success) {
        console.log('Map loaded successfully')
        return true
      } else {
        console.error('Failed to deserialize map data')
        return false
      }
    } else {
      // User cancelled the dialog
      console.log('Load operation cancelled')
      return false
    }
  } catch (error) {
    console.error('Failed to load map:', error)
    return false
  }
}

/**
 * Shows a save dialog and saves current map data
 */
export async function saveMapToFile(): Promise<boolean> {
  try {
    if (!isTauriApp()) {
      // In web mode, use our browser-based save function
      return await saveMap()
    }
    
    // Use protocol's serializeMap to get current map data
    const mapData = serializeMap()
    
    const invoke = await getTauriInvoke()
    const result = await invoke<boolean>('save_map', { mapData })
    
    if (result) {
      console.log('Map saved successfully')
      return true
    } else {
      // User cancelled the dialog
      console.log('Save operation cancelled')
      return false
    }
  } catch (error) {
    console.error('Failed to save map:', error)
    return false
  }
}

/**
 * Convenience functions that combine dialog and file operations
 */

/**
 * Load a map file by showing an open dialog
 */
export async function loadMap(): Promise<boolean> {
  const filePath = await openFileDialog()
  if (!filePath) {
    return false
  }
  
  const contents = await readFile(filePath)
  if (!contents) {
    return false
  }
  
  return deserializeMap(contents)
}

/**
 * Save current map by showing a save dialog
 */
export async function saveMap(): Promise<boolean> {
  const filePath = await saveFileDialog()
  if (!filePath) {
    return false
  }
  
  const mapData = serializeMap()
  return await writeFile(filePath, mapData)
}

/**
 * Export current map data as JSON string (for debugging or other uses)
 */
export function exportMapData(): string {
  return serializeMap()
}

/**
 * Import map data from JSON string
 */
export function importMapData(jsonData: string): boolean {
  return deserializeMap(jsonData)
}

/**
 * Get list of saved maps (development mode only)
 */
export function getSavedMaps(): string[] {
  if (!isTauriApp()) {
    const savedMaps: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('dungeon_map_')) {
        savedMaps.push(key.replace('dungeon_map_', ''))
      }
    }
    return savedMaps
  }
  return []
}

/**
 * Clear all saved maps (development mode only)
 */
export function clearSavedMaps(): void {
  if (!isTauriApp()) {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('dungeon_map_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('All saved maps cleared from browser storage')
  }
}
