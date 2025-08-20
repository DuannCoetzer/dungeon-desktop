import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MapData, CharacterToken } from '../protocol'

// Character that exists but hasn't been placed on the map yet
export interface PendingCharacter {
  id: string
  name: string
  color: string
  size: number
  isVisible: boolean
  avatarAssetId?: string
  notes?: string
  visionRange: number // Vision range in grid tiles
  createdAt: string
  updatedAt: string
}

export interface DMGameSession {
  // Map state
  mapData: MapData | null
  mapInfo: {
    name: string
    createdAt?: string
    updatedAt?: string
  } | null
  
  // Character state  
  characters: CharacterToken[] // Characters placed on the map
  pendingCharacters: PendingCharacter[] // Characters created but not yet placed
  selectedCharacterId: string | null
  
  // UI state
  isCharacterPanelCollapsed: boolean
  isInfoPanelCollapsed: boolean
  measurementSettings: {
    gridSize: number
    distancePerCell: number
    units: string
  }
  
  // Fog of war settings
  fogOfWarEnabled: boolean
  
  // Session metadata
  isActive: boolean
  lastActiveAt: string | null
}

interface DMGameState extends DMGameSession {
  // Actions
  setMapData: (mapData: MapData | null) => void
  setMapInfo: (mapInfo: DMGameSession['mapInfo']) => void
  setCharacters: (characters: CharacterToken[]) => void
  setPendingCharacters: (characters: PendingCharacter[]) => void
  addPendingCharacter: (character: Omit<PendingCharacter, 'id' | 'createdAt' | 'updatedAt'>) => void
  removePendingCharacter: (id: string) => void
  placeCharacter: (pendingCharacterId: string, x: number, y: number) => void
  setSelectedCharacter: (characterId: string | null) => void
  setCharacterPanelCollapsed: (collapsed: boolean) => void
  setInfoPanelCollapsed: (collapsed: boolean) => void
  setMeasurementSettings: (settings: DMGameSession['measurementSettings']) => void
  setFogOfWarEnabled: (enabled: boolean) => void
  setCharacterVisionRange: (characterId: string, range: number) => void
  setSessionActive: (active: boolean) => void
  clearSession: () => void
  restoreSession: () => DMGameSession
}

const initialState: DMGameSession = {
  mapData: null,
  mapInfo: null,
  characters: [],
  pendingCharacters: [],
  selectedCharacterId: null,
  isCharacterPanelCollapsed: false,
  isInfoPanelCollapsed: false,
  measurementSettings: {
    gridSize: 32,
    distancePerCell: 5,
    units: 'ft'
  },
  fogOfWarEnabled: false,
  isActive: false,
  lastActiveAt: null
}

export const useDMGameStore = create<DMGameState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setMapData: (mapData) => {
        set({ 
          mapData, 
          isActive: mapData !== null,
          lastActiveAt: mapData ? new Date().toISOString() : null
        })
      },
      
      setMapInfo: (mapInfo) => {
        set({ mapInfo })
      },
      
      setCharacters: (characters) => {
        set({ characters })
      },
      
      setPendingCharacters: (pendingCharacters) => {
        set({ pendingCharacters })
      },
      
      addPendingCharacter: (characterData) => {
        const newCharacter: PendingCharacter = {
          ...characterData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        set(state => ({ 
          pendingCharacters: [...state.pendingCharacters, newCharacter] 
        }))
      },
      
      removePendingCharacter: (id) => {
        set(state => ({
          pendingCharacters: state.pendingCharacters.filter(char => char.id !== id)
        }))
      },
      
      placeCharacter: (pendingCharacterId, x, y) => {
        const state = get()
        const pendingCharacter = state.pendingCharacters.find(char => char.id === pendingCharacterId)
        if (!pendingCharacter) return
        
        // Create placed character from pending character
        const placedCharacter: CharacterToken = {
          ...pendingCharacter,
          x,
          y,
          updatedAt: new Date().toISOString()
        }
        
        const newCharacters = [...state.characters, placedCharacter]
        
        // Add to placed characters and remove from pending
        set({
          characters: newCharacters,
          pendingCharacters: state.pendingCharacters.filter(char => char.id !== pendingCharacterId)
        })
        
      },
      
      setSelectedCharacter: (characterId) => {
        set({ selectedCharacterId: characterId })
      },
      
      setCharacterPanelCollapsed: (collapsed) => {
        set({ isCharacterPanelCollapsed: collapsed })
      },
      
      setInfoPanelCollapsed: (collapsed) => {
        set({ isInfoPanelCollapsed: collapsed })
      },
      
      setMeasurementSettings: (settings) => {
        set({ measurementSettings: settings })
      },
      
      setFogOfWarEnabled: (enabled) => {
        set({ fogOfWarEnabled: enabled })
      },
      
      setCharacterVisionRange: (characterId, range) => {
        set(state => ({
          // Update pending characters
          pendingCharacters: state.pendingCharacters.map(char => 
            char.id === characterId 
              ? { ...char, visionRange: range, updatedAt: new Date().toISOString() }
              : char
          ),
          // Update placed characters
          characters: state.characters.map(char => 
            char.id === characterId 
              ? { ...char, visionRange: range, updatedAt: new Date().toISOString() }
              : char
          )
        }))
      },
      
      setSessionActive: (active) => {
        set({ 
          isActive: active,
          lastActiveAt: active ? new Date().toISOString() : get().lastActiveAt
        })
      },
      
      clearSession: () => {
        set(initialState)
      },
      
      restoreSession: () => {
        const state = get()
        return {
          mapData: state.mapData,
          mapInfo: state.mapInfo,
          characters: state.characters,
          pendingCharacters: state.pendingCharacters,
          selectedCharacterId: state.selectedCharacterId,
          isCharacterPanelCollapsed: state.isCharacterPanelCollapsed,
          isInfoPanelCollapsed: state.isInfoPanelCollapsed,
          measurementSettings: state.measurementSettings,
          fogOfWarEnabled: state.fogOfWarEnabled,
          isActive: state.isActive,
          lastActiveAt: state.lastActiveAt
        }
      }
    }),
    {
      name: 'dm-game-session',
      version: 2
    }
  )
)

// Convenience selectors
export const useDMGameMapData = () => useDMGameStore(state => state.mapData)
export const useDMGameCharacters = () => useDMGameStore(state => state.characters)
export const useDMGamePendingCharacters = () => useDMGameStore(state => state.pendingCharacters)
export const useDMGameSelectedCharacter = () => {
  const characters = useDMGameCharacters()
  const selectedId = useDMGameStore(state => state.selectedCharacterId)
  return characters.find(char => char.id === selectedId) || null
}
export const useDMGameSession = () => useDMGameStore(state => state.isActive)
