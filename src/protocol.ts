// Protocol functions for persistent map data operations
// This module provides a clean interface for manipulating map data
// while abstracting the underlying storage and state management

import type { TileType, Layer, TileMap, AssetInstance } from './store'
import type { GenerationParameters } from './uiStore'
import { generateMapData, type GenerationParams } from './generation'

export interface CharacterToken {
  id: string
  name: string
  x: number
  y: number
  color: string
  size: number // Multiplier for token size (0.5 = small, 1 = normal, 2 = large)
  isVisible: boolean // For DM to hide/show tokens
  avatarAssetId?: string // Optional character avatar from Asset Manager
  notes?: string // Optional notes for DM
  createdAt: string
  updatedAt: string
}

export interface MapData {
  tiles: Record<Layer, TileMap>
  assetInstances: AssetInstance[]
  characters?: CharacterToken[] // Make optional for backward compatibility
  version: string
  createdAt: string
  updatedAt: string
}

export interface LayerSettings {
  visible: boolean
  opacity: number
}

export interface Position {
  x: number
  y: number
}

// Core map data management
export class MapProtocol {
  private static instance: MapProtocol
  private mapData: MapData
  private subscribers: Set<(mapData: MapData) => void> = new Set()

  private constructor() {
    this.mapData = this.createEmptyMapData()
  }

  static getInstance(): MapProtocol {
    if (!MapProtocol.instance) {
      MapProtocol.instance = new MapProtocol()
    }
    return MapProtocol.instance
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

  getTiles(): Record<Layer, TileMap> {
    return { ...this.mapData.tiles }
  }

  getLayer(layer: Layer): TileMap {
    return { ...this.mapData.tiles[layer] }
  }

  getTile(layer: Layer, x: number, y: number): TileType | undefined {
    const key = this.getTileKey(x, y)
    return this.mapData.tiles[layer][key]
  }

  getAssetInstances(): AssetInstance[] {
    return [...this.mapData.assetInstances]
  }

  getAssetInstance(id: string): AssetInstance | undefined {
    return this.mapData.assetInstances.find(instance => instance.id === id)
  }

  getCharacters(): CharacterToken[] {
    return [...this.mapData.characters]
  }

  getCharacter(id: string): CharacterToken | undefined {
    return this.mapData.characters.find(character => character.id === id)
  }

  getCharacterAt(x: number, y: number): CharacterToken | undefined {
    return this.mapData.characters.find(character => character.x === x && character.y === y && character.isVisible)
  }

  // Tile operations
  setTile(layer: Layer, x: number, y: number, type: TileType): void {
    const key = this.getTileKey(x, y)
    this.mapData.tiles[layer] = {
      ...this.mapData.tiles[layer],
      [key]: type
    }
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  eraseTile(layer: Layer, x: number, y: number): void {
    const key = this.getTileKey(x, y)
    const layerTiles = { ...this.mapData.tiles[layer] }
    delete layerTiles[key]
    this.mapData.tiles[layer] = layerTiles
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  setTiles(layer: Layer, tiles: TileMap): void {
    this.mapData.tiles[layer] = { ...tiles }
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  clearLayer(layer: Layer): void {
    this.mapData.tiles[layer] = {}
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  // Asset instance operations
  addAssetInstance(assetInstance: AssetInstance): void {
    this.mapData.assetInstances = [
      ...this.mapData.assetInstances,
      { ...assetInstance }
    ]
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  updateAssetInstance(id: string, updates: Partial<AssetInstance>): void {
    this.mapData.assetInstances = this.mapData.assetInstances.map(instance =>
      instance.id === id ? { ...instance, ...updates } : instance
    )
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
  }

  deleteAssetInstance(id: string): void {
    this.mapData.assetInstances = this.mapData.assetInstances.filter(
      instance => instance.id !== id
    )
    this.mapData.updatedAt = new Date().toISOString()
    this.notify()
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

  // Serialization
  serialize(): string {
    return JSON.stringify(this.mapData)
  }

  deserialize(json: string): void {
    try {
      const data = JSON.parse(json)
      this.setMapData(data)
    } catch (error) {
      console.error('Failed to deserialize map data:', error)
    }
  }

  // Map serialization for file operations
  serializeMap(): string {
    const exportData = {
      ...this.mapData,
      exportedAt: new Date().toISOString(),
      version: this.mapData.version || '1.0.0'
    }
    return JSON.stringify(exportData, null, 2)
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

  // Utility methods
  private getTileKey(x: number, y: number): string {
    return `${x},${y}`
  }

  // Validation
  isValidPosition(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
  }

  isValidLayer(layer: string): layer is Layer {
    return ['floor', 'walls', 'objects', 'assets'].includes(layer)
  }

  isValidTileType(type: string): type is TileType {
    return ['floor', 'wall', 'door'].includes(type)
  }
}

// Convenience functions for external use
export const mapProtocol = MapProtocol.getInstance()

// High-level protocol functions
export function setTile(layer: Layer, x: number, y: number, type: TileType): void {
  mapProtocol.setTile(layer, x, y, type)
}

export function eraseTile(layer: Layer, x: number, y: number): void {
  mapProtocol.eraseTile(layer, x, y)
}

export function getTile(layer: Layer, x: number, y: number): TileType | undefined {
  return mapProtocol.getTile(layer, x, y)
}

export function addAssetInstance(assetInstance: AssetInstance): void {
  mapProtocol.addAssetInstance(assetInstance)
}

export function updateAssetInstance(id: string, updates: Partial<AssetInstance>): void {
  mapProtocol.updateAssetInstance(id, updates)
}

export function deleteAssetInstance(id: string): void {
  mapProtocol.deleteAssetInstance(id)
}

// Character management functions
export function addCharacter(character: CharacterToken): void {
  mapProtocol.addCharacter(character)
}

export function updateCharacter(id: string, updates: Partial<CharacterToken>): void {
  mapProtocol.updateCharacter(id, updates)
}

export function deleteCharacter(id: string): void {
  mapProtocol.deleteCharacter(id)
}

export function moveCharacter(id: string, x: number, y: number): void {
  mapProtocol.moveCharacter(id, x, y)
}

export function getCharacters(): CharacterToken[] {
  return mapProtocol.getCharacters()
}

export function getCharacter(id: string): CharacterToken | undefined {
  return mapProtocol.getCharacter(id)
}

export function getCharacterAt(x: number, y: number): CharacterToken | undefined {
  return mapProtocol.getCharacterAt(x, y)
}

export function getMapData(): MapData {
  return mapProtocol.getMapData()
}

export function setMapData(mapData: MapData): void {
  mapProtocol.setMapData(mapData)
}

export function resetMap(): void {
  mapProtocol.reset()
}

export function subscribeToMapChanges(callback: (mapData: MapData) => void): () => void {
  return mapProtocol.subscribe(callback)
}

// File operations
export function serializeMap(): string {
  return mapProtocol.serializeMap()
}

export function deserializeMap(json: string): boolean {
  return mapProtocol.deserializeMap(json)
}

/**
 * Converts UI Generation Parameters to Generation Library Parameters
 */
function convertUIParamsToGenerationParams(uiParams: GenerationParameters): GenerationParams {
  // Convert string seed to number if provided
  let seed: number | undefined = undefined
  if (uiParams.seed && uiParams.seed.trim() !== '') {
    // Create a simple hash from the string seed
    let hash = 0
    for (let i = 0; i < uiParams.seed.length; i++) {
      const char = uiParams.seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    seed = Math.abs(hash) / 2147483647 // Normalize to 0-1 range
  }

  return {
    width: 100, // Default map size - could be made configurable
    height: 100,
    seed,
    
    // Map UI complexity and noise scale to generation parameters
    heightOctaves: Math.round(4 + uiParams.complexity * 4), // 4-8 octaves
    heightFrequency: 0.01 + uiParams.noiseScale * 0.02, // 0.01-0.05 frequency
    heightAmplitude: 1.0,
    heightPersistence: 0.4 + uiParams.complexity * 0.3, // 0.4-0.7 persistence
    
    moistureOctaves: Math.round(3 + uiParams.complexity * 3), // 3-6 octaves  
    moistureFrequency: 0.008 + uiParams.noiseScale * 0.015, // 0.008-0.023 frequency
    moistureAmplitude: 1.0,
    moisturePersistence: 0.5 + uiParams.complexity * 0.2, // 0.5-0.7 persistence
    
    // Map biome thresholds
    waterLevel: uiParams.biomeThresholds.water,
    beachLevel: uiParams.biomeThresholds.water + 0.05, // Slight offset for beach
    hillLevel: uiParams.biomeThresholds.grass,
    mountainLevel: uiParams.biomeThresholds.mountain,
    
    // Map asset density to moisture thresholds
    dryThreshold: 0.2 + (1 - uiParams.assetDensity) * 0.3, // 0.2-0.5 based on asset density
    wetThreshold: 0.5 + uiParams.assetDensity * 0.3 // 0.5-0.8 based on asset density
  }
}

/**
 * Generate a new map using parameters from UIStore
 */
export function generateMap(uiParams: GenerationParameters): void {
  const generationParams = convertUIParamsToGenerationParams(uiParams)
  const newMapData = generateMapData(generationParams)
  mapProtocol.setMapData(newMapData)
}
