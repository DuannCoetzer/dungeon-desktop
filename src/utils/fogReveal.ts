// Fog of war reveal mechanics
// Handles clearing fog tiles when characters move

import type { MapData, CharacterToken } from '../protocol'
import type { TileMap } from '../store'

/**
 * Calculate which fog tiles should be revealed based on character positions
 */
export function calculateRevealedFogTiles(mapData: MapData): Set<string> {
  const revealedTiles = new Set<string>()
  
  if (!mapData.characters || !mapData.tiles.fog) {
    return revealedTiles
  }
  
  // For each visible character, reveal fog tiles within their range
  for (const character of mapData.characters) {
    if (!character.isVisible) continue
    
    const range = character.revealRange || 2 // Default reveal range of 2 tiles
    
    // Reveal tiles in a square around the character
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const x = character.x + dx
        const y = character.y + dy
        const key = `${x},${y}`
        
        // Calculate distance (Manhattan distance for performance)
        const distance = Math.abs(dx) + Math.abs(dy)
        
        // Only reveal tiles within range
        if (distance <= range) {
          revealedTiles.add(key)
        }
      }
    }
  }
  
  return revealedTiles
}

/**
 * Remove revealed fog tiles from the fog layer
 */
export function clearRevealedFogTiles(fogTiles: TileMap, revealedTiles: Set<string>): TileMap {
  const newFogTiles = { ...fogTiles }
  
  // Remove revealed tiles from fog layer
  for (const tileKey of revealedTiles) {
    delete newFogTiles[tileKey]
  }
  
  return newFogTiles
}

/**
 * Get all fog tiles that should currently be visible (not revealed)
 */
export function getVisibleFogTiles(mapData: MapData): TileMap {
  if (!mapData.tiles.fog) {
    return {}
  }
  
  const revealedTiles = calculateRevealedFogTiles(mapData)
  return clearRevealedFogTiles(mapData.tiles.fog, revealedTiles)
}

/**
 * Add fog tiles to a specific area
 */
export function addFogTiles(x: number, y: number, brushSize: number = 1): TileMap {
  const fogTiles: TileMap = {}
  
  const halfSize = Math.floor(brushSize / 2)
  
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      const tileX = x + dx
      const tileY = y + dy
      const key = `${tileX},${tileY}`
      
      // Use 'grass' as the fog tile type (we'll render it as fog visually)
      fogTiles[key] = 'grass'
    }
  }
  
  return fogTiles
}

/**
 * Remove fog tiles from a specific area
 */
export function removeFogTiles(currentFog: TileMap, x: number, y: number, brushSize: number = 1): TileMap {
  const newFogTiles = { ...currentFog }
  const halfSize = Math.floor(brushSize / 2)
  
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      const tileX = x + dx
      const tileY = y + dy
      const key = `${tileX},${tileY}`
      
      delete newFogTiles[key]
    }
  }
  
  return newFogTiles
}
