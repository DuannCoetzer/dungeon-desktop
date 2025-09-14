import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Visual effects
  enableWarpDistortion: boolean
  enableParchmentCreases: boolean
  
  // UI preferences
  showAdvancedSettings: boolean
  
  // Debug settings
  enableDebugLogging: boolean
  
  // Experimental features
  enableMapAssets: boolean
  
  // Actions
  setWarpDistortion: (enabled: boolean) => void
  setParchmentCreases: (enabled: boolean) => void
  setShowAdvancedSettings: (show: boolean) => void
  setDebugLogging: (enabled: boolean) => void
  setMapAssets: (enabled: boolean) => void
  
  // Reset to defaults
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS = {
  enableWarpDistortion: false,
  enableParchmentCreases: false,
  showAdvancedSettings: false,
  enableDebugLogging: false,
  enableMapAssets: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      
      setWarpDistortion: (enabled) => set({ enableWarpDistortion: enabled }),
      setParchmentCreases: (enabled) => set({ enableParchmentCreases: enabled }),
      setShowAdvancedSettings: (show) => set({ showAdvancedSettings: show }),
      setDebugLogging: (enabled) => set({ enableDebugLogging: enabled }),
      setMapAssets: (enabled) => set({ enableMapAssets: enabled }),
      
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'dungeon-desktop-settings',
      version: 1,
    }
  )
)

// Convenience hooks
export const useWarpDistortion = () => useSettingsStore(state => state.enableWarpDistortion)
export const useParchmentCreases = () => useSettingsStore(state => state.enableParchmentCreases)
export const useAdvancedSettings = () => useSettingsStore(state => state.showAdvancedSettings)
export const useDebugLogging = () => useSettingsStore(state => state.enableDebugLogging)
export const useMapAssets = () => useSettingsStore(state => state.enableMapAssets)

// Global debug logging utility
export const isDebugLoggingEnabled = () => useSettingsStore.getState().enableDebugLogging
