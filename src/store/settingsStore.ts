import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Visual effects
  enableWarpDistortion: boolean
  enableParchmentCreases: boolean
  
  // UI preferences
  showAdvancedSettings: boolean
  
  // Actions
  setWarpDistortion: (enabled: boolean) => void
  setParchmentCreases: (enabled: boolean) => void
  setShowAdvancedSettings: (show: boolean) => void
  
  // Reset to defaults
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS = {
  enableWarpDistortion: false,
  enableParchmentCreases: false,
  showAdvancedSettings: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      
      setWarpDistortion: (enabled) => set({ enableWarpDistortion: enabled }),
      setParchmentCreases: (enabled) => set({ enableParchmentCreases: enabled }),
      setShowAdvancedSettings: (show) => set({ showAdvancedSettings: show }),
      
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
