// Persistent asset store for user-imported assets
// Combines default assets from manifest with user-imported assets

import { create } from 'zustand'
import type { Asset } from '../store'
import { 
  loadImportedAssets, 
  addImportedAsset, 
  removeImportedAsset, 
  updateImportedAsset,
  clearImportedAssets,
  isImportedAsset
} from '../services/assetPersistence'

interface AssetState {
  // Asset collections
  defaultAssets: Asset[]        // Assets from manifest.json
  importedAssets: Asset[]       // User-imported assets (persistent)
  allAssets: Asset[]           // Combined list of all assets
  
  // Loading state
  isLoading: boolean
  error: string | null
  
  // Actions
  loadDefaultAssets: () => Promise<void>
  loadImportedAssets: () => Promise<void>
  addAsset: (asset: Asset) => Promise<boolean>
  removeAsset: (assetId: string) => Promise<boolean>
  updateAsset: (assetId: string, updates: Partial<Asset>) => Promise<boolean>
  clearAllImportedAssets: () => Promise<boolean>
  getAssetById: (assetId: string) => Asset | undefined
  getAssetsByType: (imported: boolean) => Asset[]
  clearError: () => void
}

export const useAssetStore = create<AssetState>((set, get) => ({
  // Initial state
  defaultAssets: [],
  importedAssets: [],
  allAssets: [],
  isLoading: false,
  error: null,
  
  // Load default assets from manifest.json
  loadDefaultAssets: async () => {
    try {
      set({ isLoading: true, error: null })
      
      const response = await fetch('/assets/manifest.json')
      if (!response.ok) {
        throw new Error(`Failed to load assets: ${response.statusText}`)
      }
      
      const data = await response.json()
      const defaultAssets = (data.assets || []).map((asset: any) => ({
        ...asset,
        gridWidth: asset.gridWidth || 1,
        gridHeight: asset.gridHeight || 1,
        type: asset.type || 'regular' // Ensure backward compatibility
      }))
      
      set(state => ({
        defaultAssets,
        allAssets: [...defaultAssets, ...state.importedAssets],
        isLoading: false
      }))
      
      console.log(`Loaded ${defaultAssets.length} default assets`)
    } catch (error) {
      console.error('Error loading default assets:', error)
      set({ 
        defaultAssets: [], // Fallback to empty array
        allAssets: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },
  
  // Load user-imported assets from persistent storage
  loadImportedAssets: async () => {
    try {
      set({ isLoading: true, error: null })
      
      const importedAssets = await loadImportedAssets()
      
      set(state => ({
        importedAssets,
        allAssets: [...state.defaultAssets, ...importedAssets],
        isLoading: false
      }))
      
      console.log(`Loaded ${importedAssets.length} imported assets`)
    } catch (error) {
      console.error('Error loading imported assets:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },
  
  // Add a new asset (will be persisted)
  addAsset: async (asset: Asset) => {
    try {
      const success = await addImportedAsset(asset)
      if (success) {
        set(state => {
          const updatedImported = [...state.importedAssets, asset]
          return {
            importedAssets: updatedImported,
            allAssets: [...state.defaultAssets, ...updatedImported],
            error: null // Clear any previous errors on success
          }
        })
        console.log('Asset added successfully:', asset.name)
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding asset:', error)
      let errorMessage = 'Failed to save asset to file'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      set({ error: errorMessage })
      return false
    }
  },
  
  // Remove an asset by ID
  removeAsset: async (assetId: string) => {
    try {
      if (!isImportedAsset(assetId)) {
        console.error('Cannot remove default asset:', assetId)
        return false
      }
      
      const success = await removeImportedAsset(assetId)
      if (success) {
        set(state => {
          const updatedImported = state.importedAssets.filter(asset => asset.id !== assetId)
          return {
            importedAssets: updatedImported,
            allAssets: [...state.defaultAssets, ...updatedImported]
          }
        })
        console.log('Asset removed successfully:', assetId)
      }
      return success
    } catch (error) {
      console.error('Error removing asset:', error)
      return false
    }
  },
  
  // Update an existing asset
  updateAsset: async (assetId: string, updates: Partial<Asset>) => {
    try {
      if (!isImportedAsset(assetId)) {
        console.error('Cannot update default asset:', assetId)
        return false
      }
      
      const success = await updateImportedAsset(assetId, updates)
      if (success) {
        set(state => {
          const updatedImported = state.importedAssets.map(asset =>
            asset.id === assetId ? { ...asset, ...updates } : asset
          )
          return {
            importedAssets: updatedImported,
            allAssets: [...state.defaultAssets, ...updatedImported]
          }
        })
        console.log('Asset updated successfully:', assetId)
      }
      return success
    } catch (error) {
      console.error('Error updating asset:', error)
      return false
    }
  },
  
  // Clear all imported assets
  clearAllImportedAssets: async () => {
    try {
      const success = await clearImportedAssets()
      if (success) {
        set(state => ({
          importedAssets: [],
          allAssets: [...state.defaultAssets]
        }))
        console.log('All imported assets cleared')
      }
      return success
    } catch (error) {
      console.error('Error clearing imported assets:', error)
      return false
    }
  },
  
  // Get asset by ID
  getAssetById: (assetId: string) => {
    return get().allAssets.find(asset => asset.id === assetId)
  },
  
  // Get assets by type (imported vs default)
  getAssetsByType: (imported: boolean) => {
    return imported ? get().importedAssets : get().defaultAssets
  },
  
  // Clear error state
  clearError: () => {
    set({ error: null })
  }
}))

// Convenience hooks for specific data
export const useAllAssets = () => useAssetStore(state => state.allAssets)
export const useDefaultAssets = () => useAssetStore(state => state.defaultAssets)
export const useImportedAssets = () => useAssetStore(state => state.importedAssets)
export const useAssetLoading = () => useAssetStore(state => state.isLoading)
export const useAssetError = () => useAssetStore(state => state.error)
