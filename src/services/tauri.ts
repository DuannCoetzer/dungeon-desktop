// Tauri service wrapper for IPC commands
// This module provides a clean interface for interacting with Tauri's file system and dialogs

import { invoke } from '@tauri-apps/api/core'
import { serializeMap, deserializeMap } from '../protocol'

/**
 * Shows an open file dialog and returns the selected file path
 */
export async function openFileDialog(): Promise<string | null> {
  try {
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
    // Use protocol's serializeMap to get current map data
    const mapData = serializeMap()
    
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
