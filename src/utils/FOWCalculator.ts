// Fog of War Calculator - Ray-casting algorithm for line-of-sight
// Determines which tiles are visible to characters based on vision range and obstacles

import type { MapData, CharacterToken } from '../protocol'
import type { TileMap, Layer } from '../store'

export interface VisibleTilesResult {
  visibleTiles: Set<string>
  characterVision: Map<string, Set<string>> // character id -> visible tile keys
}

/**
 * Computes visible tiles for all characters using ray-casting
 */
export function computeVisibleTiles(mapData: MapData, characters: CharacterToken[]): VisibleTilesResult {
  const visibleTiles = new Set<string>()
  const characterVision = new Map<string, Set<string>>()
  
  const wallTiles = mapData.tiles.walls || {}
  
  for (const character of characters) {
    if (!character.isVisible) continue
    
    const characterVisibleTiles = new Set<string>()
    const visionRange = character.visionRange || 8
    
    // Always include the character's own position
    const charKey = getTileKey(character.x, character.y)
    characterVisibleTiles.add(charKey)
    visibleTiles.add(charKey)
    
    // Cast rays in a circle around the character
    const rayCount = Math.max(16, visionRange * 4) // More rays for larger vision ranges
    
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2
      castRay(
        character.x,
        character.y,
        angle,
        visionRange,
        wallTiles,
        characterVisibleTiles,
        visibleTiles
      )
    }
    
    characterVision.set(character.id, characterVisibleTiles)
  }
  
  return { visibleTiles, characterVision }
}

/**
 * Cast a single ray and mark visible tiles
 */
function castRay(
  startX: number,
  startY: number,
  angle: number,
  maxDistance: number,
  wallTiles: TileMap,
  characterVisibleTiles: Set<string>,
  allVisibleTiles: Set<string>
): void {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  
  // Step size for ray marching
  const stepSize = 0.1
  
  for (let distance = stepSize; distance <= maxDistance; distance += stepSize) {
    const x = Math.floor(startX + dx * distance)
    const y = Math.floor(startY + dy * distance)
    const tileKey = getTileKey(x, y)
    
    // Mark this tile as visible
    characterVisibleTiles.add(tileKey)
    allVisibleTiles.add(tileKey)
    
    // Check if there's a wall at this position
    if (wallTiles[tileKey]) {
      // Wall blocks further vision - stop casting this ray
      break
    }
  }
}

/**
 * Utility function to generate tile key from coordinates
 */
function getTileKey(x: number, y: number): string {
  return `${x},${y}`
}

/**
 * Parse tile key back to coordinates
 */
export function parseTileKey(key: string): { x: number, y: number } {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

/**
 * Check if a tile is within vision range of any character
 */
export function isTileVisible(x: number, y: number, visibleTiles: Set<string>): boolean {
  return visibleTiles.has(getTileKey(x, y))
}

/**
 * Get all tiles within a certain distance (for debugging/testing)
 */
export function getTilesInRange(centerX: number, centerY: number, range: number): Set<string> {
  const tiles = new Set<string>()
  
  for (let x = centerX - range; x <= centerX + range; x++) {
    for (let y = centerY - range; y <= centerY + range; y++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      if (distance <= range) {
        tiles.add(getTileKey(x, y))
      }
    }
  }
  
  return tiles
}
