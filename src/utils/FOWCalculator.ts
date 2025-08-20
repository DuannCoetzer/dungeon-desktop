// Fog of War Calculator - Ray-casting algorithm for line-of-sight
// Determines which tiles are visible to characters based on vision range and obstacles

import type { MapData, CharacterToken } from '../protocol'
import type { TileMap, Layer } from '../store'

export interface VisibleTilesResult {
  visibleTiles: Set<string>
  characterVision: Map<string, Set<string>> // character id -> visible tile keys
}

/**
 * Computes visible tiles for all characters using circular vision with line-of-sight
 */
export function computeVisibleTiles(mapData: MapData, characters: CharacterToken[]): VisibleTilesResult {
  const visibleTiles = new Set<string>()
  const characterVision = new Map<string, Set<string>>()
  
  const wallTiles = mapData.tiles.walls || {}
  
  for (const character of characters) {
    if (!character.isVisible) continue
    
    const characterVisibleTiles = new Set<string>()
    const visionRange = character.visionRange || 8
    
    // Start with all tiles in circular range
    for (let dx = -visionRange; dx <= visionRange; dx++) {
      for (let dy = -visionRange; dy <= visionRange; dy++) {
        const targetX = character.x + dx
        const targetY = character.y + dy
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Only include tiles within the circular vision range
        if (distance <= visionRange) {
          const tileKey = getTileKey(targetX, targetY)
          
          // Check line of sight to this tile
          if (hasLineOfSight(character.x, character.y, targetX, targetY, wallTiles)) {
            characterVisibleTiles.add(tileKey)
            visibleTiles.add(tileKey)
          }
        }
      }
    }
    
    characterVision.set(character.id, characterVisibleTiles)
  }
  
  return { visibleTiles, characterVision }
}

/**
 * Check if there's a clear line of sight between two points
 */
function hasLineOfSight(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  wallTiles: TileMap
): boolean {
  // If start and end are the same, always have line of sight
  if (startX === endX && startY === endY) {
    return true
  }
  
  const dx = endX - startX
  const dy = endY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Normalize direction
  const stepX = dx / distance
  const stepY = dy / distance
  
  // Step size for line checking - smaller for more accuracy
  const stepSize = 0.3
  
  // Check each step along the line
  for (let step = stepSize; step < distance; step += stepSize) {
    const checkX = Math.floor(startX + stepX * step)
    const checkY = Math.floor(startY + stepY * step)
    const tileKey = getTileKey(checkX, checkY)
    
    // If there's a wall in the path, line of sight is blocked
    if (wallTiles[tileKey]) {
      return false
    }
  }
  
  return true
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
