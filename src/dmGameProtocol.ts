// Isolated protocol for DM Game that doesn't interfere with Map Builder
import type { TileType, Layer, TileMap, AssetInstance } from './store'
import type { CharacterToken, MapData } from './protocol'

export class DMGameProtocol {
  private static instance: DMGameProtocol
  private mapData: MapData
  private subscribers: Set<(mapData: MapData) => void> = new Set()

  private constructor() {
    this.mapData = this.createEmptyMapData()
  }

  static getInstance(): DMGameProtocol {
    if (!DMGameProtocol.instance) {
      DMGameProtocol.instance = new DMGameProtocol()
    }
    return DMGameProtocol.instance
  }

  // Subscription management
  subscribe(callback: (mapData: MapData) => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback({ ...this.mapData }))
  }

  // Core data operations
  private createEmptyMapData(): MapData {
    return {
      tiles: {
        floor: {},
        walls: {},
        objects: {},
        assets: {}
      },
      assetInstances: [],
      characters: [],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  // Getters
  getMapData(): MapData {
    return { ...this.mapData }
  }

  getCharacters(): CharacterToken[] {
    return [...this.mapData.characters]
  }

  getCharacter(id: string): CharacterToken | undefined {
    return this.mapData.characters.find(character => character.id === id)
  }

  // Character token operations
  addCharacter(character: CharacterToken): void {
    this.mapData.characters = [
      ...this.mapData.characters,
      { ...character }
    ]
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  updateCharacter(id: string, updates: Partial<CharacterToken>): void {
    this.mapData.characters = this.mapData.characters.map(character =>
      character.id === id ? { ...character, ...updates, updatedAt: new Date().toISOString() } : character
    )
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  deleteCharacter(id: string): void {
    this.mapData.characters = this.mapData.characters.filter(
      character => character.id !== id
    )
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  moveCharacter(id: string, x: number, y: number): void {
    this.updateCharacter(id, { x, y })
  }

  // Bulk operations
  setMapData(mapData: MapData): void {
    this.mapData = {
      ...mapData,
      updatedAt: new Date().toISOString()
    }
    this.notify()
  }

  reset(): void {
    this.mapData = this.createEmptyMapData()
    this.notify()
  }

  // Map deserialization for file operations  
  deserializeMap(json: string): boolean {
    try {
      const data = JSON.parse(json)
      
      // Validate that this looks like map data
      if (!data || typeof data !== 'object') {
        console.error('Invalid map data: not an object')
        return false
      }
      
      if (!data.tiles || typeof data.tiles !== 'object') {
        console.error('Invalid map data: missing or invalid tiles')
        return false
      }
      
      // Ensure all required layers exist
      const requiredLayers = ['floor', 'walls', 'objects', 'assets']
      for (const layer of requiredLayers) {
        if (!data.tiles[layer]) {
          data.tiles[layer] = {}
        }
      }
      
      // Ensure assetInstances exists
      if (!Array.isArray(data.assetInstances)) {
        data.assetInstances = []
      }
      
      // Ensure characters exists
      if (!Array.isArray(data.characters)) {
        data.characters = []
      }
      
      // Set default values for missing metadata
      const mapData: MapData = {
        tiles: data.tiles,
        assetInstances: data.assetInstances,
        characters: data.characters,
        version: data.version || '1.0.0',
        id: data.id,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      this.setMapData(mapData)
      return true
    } catch (error) {
      console.error('Failed to deserialize map data:', error)
      return false
    }
  }
}

// Convenience functions for external use
export const dmGameProtocol = DMGameProtocol.getInstance()

// DM Game specific functions that don't interfere with Map Builder
export function dmAddCharacter(character: CharacterToken): void {
  dmGameProtocol.addCharacter(character)
}

export function dmUpdateCharacter(id: string, updates: Partial<CharacterToken>): void {
  dmGameProtocol.updateCharacter(id, updates)
}

export function dmDeleteCharacter(id: string): void {
  dmGameProtocol.deleteCharacter(id)
}

export function dmMoveCharacter(id: string, x: number, y: number): void {
  dmGameProtocol.moveCharacter(id, x, y)
}

export function dmGetCharacters(): CharacterToken[] {
  return dmGameProtocol.getCharacters()
}

export function dmGetCharacter(id: string): CharacterToken | undefined {
  return dmGameProtocol.getCharacter(id)
}

export function dmGetMapData(): MapData {
  return dmGameProtocol.getMapData()
}

export function dmSetMapData(mapData: MapData): void {
  dmGameProtocol.setMapData(mapData)
}

export function dmResetMap(): void {
  dmGameProtocol.reset()
}

export function dmSubscribeToMapChanges(callback: (mapData: MapData) => void): () => void {
  return dmGameProtocol.subscribe(callback)
}

export function dmDeserializeMap(json: string): boolean {
  return dmGameProtocol.deserializeMap(json)
}
