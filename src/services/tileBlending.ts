// Tile blending service for smooth transitions between different floor tile types
// Creates seamless blends by analyzing adjacent tiles and applying edge masks

import type { Palette, Layer, TileMap } from '../store'
import { useTileStore } from '../store/tileStore'
// Direction constants for edge detection
export const BlendDirection = {
  NORTH: 'north',
  SOUTH: 'south', 
  EAST: 'east',
  WEST: 'west',
  NORTHEAST: 'northeast',
  NORTHWEST: 'northwest',
  SOUTHEAST: 'southeast',
  SOUTHWEST: 'southwest'
} as const

export type BlendDirection = typeof BlendDirection[keyof typeof BlendDirection]

// Tile compatibility groups - tiles within same group blend naturally
export const TILE_COMPATIBILITY_GROUPS = {
  // Natural terrain group
  natural: ['grass'],
  
  // Stone-based floors 
  stone: ['floor-stone-rough', 'floor-stone-smooth', 'floor-cobblestone'],
  
  // Wood-based floors
  wood: ['floor-wood-planks'],
  
  // Walls (don't blend with floors, but can blend with each other)
  walls: ['wall', 'wall-brick', 'wall-stone', 'wall-wood'],
  
  // Special tiles that don't blend
  special: ['delete', 'fog']
} as const

// Reverse lookup: tile -> compatibility group
export const TILE_TO_GROUP: Record<string, keyof typeof TILE_COMPATIBILITY_GROUPS | null> = {}
Object.entries(TILE_COMPATIBILITY_GROUPS).forEach(([group, tiles]) => {
  tiles.forEach(tile => {
    TILE_TO_GROUP[tile] = group as keyof typeof TILE_COMPATIBILITY_GROUPS
  })
})

// Blending priority - higher priority tiles blend over lower priority ones
export const TILE_BLEND_PRIORITY: Record<string, number> = {
  'grass': 1,
  'floor-stone-rough': 2,  
  'floor-stone-smooth': 3,
  'floor-cobblestone': 4,
  'floor-wood-planks': 5,
  
  // Walls have high priority
  'wall': 10,
  'wall-brick': 10,
  'wall-stone': 10, 
  'wall-wood': 10,
  
  // Special tiles
  'fog': 100,
  'delete': 0
}

// Blend edge information for a tile
export interface TileBlendInfo {
  baseTile: string  // Can be Palette enum or imported tile ID
  blends: {
    direction: BlendDirection
    neighborTile: string  // Can be Palette enum or imported tile ID
    blendStrength: number // 0.0 to 1.0
  }[]
}

/**
 * Get tile info from either default palette or tile store
 */
function getTileInfo(tileId: string) {
  // Check if it's a default palette tile
  const defaultTiles = ['grass', 'floor-stone-rough', 'floor-stone-smooth', 'floor-wood-planks', 'floor-cobblestone', 'wall', 'wall-brick', 'wall-stone', 'wall-wood', 'fog', 'delete']
  if (defaultTiles.includes(tileId)) {
    return { id: tileId, category: getDefaultTileCategory(tileId), isFloor: isFloorTile(tileId) }
  }
  
  // Check if it's an imported tile
  const tileStore = useTileStore.getState()
  const tile = tileStore.getTileById(tileId)
  if (tile) {
    return { id: tileId, category: tile.category, isFloor: tile.category === 'floors' }
  }
  
  return null
}

/**
 * Get category for default tiles
 */
function getDefaultTileCategory(tileId: string): string {
  if (['grass', 'floor-stone-rough', 'floor-stone-smooth', 'floor-wood-planks', 'floor-cobblestone'].includes(tileId)) {
    return 'floors'
  }
  if (['wall', 'wall-brick', 'wall-stone', 'wall-wood'].includes(tileId)) {
    return 'walls'
  }
  return 'special'
}

/**
 * Check if default tile is a floor tile
 */
function isFloorTile(tileId: string): boolean {
  return ['grass', 'floor-stone-rough', 'floor-stone-smooth', 'floor-wood-planks', 'floor-cobblestone'].includes(tileId)
}

/**
 * Check if two tiles can blend together
 * Now allows all floor tiles to blend with organic curves
 */
export function canTilesBlend(tile1: string, tile2: string): boolean {
  // Same tiles don't need blending
  if (tile1 === tile2) return false
  
  // Get tile information
  const tile1Info = getTileInfo(tile1)
  const tile2Info = getTileInfo(tile2)
  
  // If we can't get info for either tile, don't blend
  if (!tile1Info || !tile2Info) return false
  
  // Only blend floor tiles with other floor tiles
  if (tile1Info.isFloor && tile2Info.isFloor) {
    return true
  }
  
  return false
}

/**
 * Get the blending priority of a tile (higher = dominates blend)
 */
export function getTileBlendPriority(tile: string): number {
  // Try to get priority from tile store first
  const { useTileStore } = require('../store/tileStore')
  const tileStore = useTileStore.getState()
  const tileData = tileStore.getTileById(tile)
  
  if (tileData && tileData.blendPriority !== undefined) {
    return tileData.blendPriority
  }
  
  // Fallback to hardcoded priorities for legacy compatibility
  if (TILE_BLEND_PRIORITY[tile] !== undefined) {
    return TILE_BLEND_PRIORITY[tile]
  }
  
  // For imported tiles, assign priority based on category
  const tileInfo = getTileInfo(tile)
  if (tileInfo) {
    switch (tileInfo.category) {
      case 'floors': return 2
      case 'walls': return 10
      case 'special': return 1
      default: return 1
    }
  }
  
  return 0
}

/**
 * Analyze a tile's neighbors and determine blending information
 */
export function analyzeTileBlending(
  x: number, 
  y: number, 
  tiles: Record<Layer, TileMap>,
  layer: Layer = 'floor'
): TileBlendInfo | null {
  const tileMap = tiles[layer]
  const baseTileKey = `${x},${y}`
  const baseTile = tileMap[baseTileKey] as string
  
  if (!baseTile || baseTile === 'delete') {
    return null
  }
  
  const blends: TileBlendInfo['blends'] = []
  
  // Check all 8 directions for neighbors
  const directions = [
    { dir: BlendDirection.NORTH, dx: 0, dy: -1 },
    { dir: BlendDirection.SOUTH, dx: 0, dy: 1 },
    { dir: BlendDirection.EAST, dx: 1, dy: 0 },
    { dir: BlendDirection.WEST, dx: -1, dy: 0 },
    { dir: BlendDirection.NORTHEAST, dx: 1, dy: -1 },
    { dir: BlendDirection.NORTHWEST, dx: -1, dy: -1 },
    { dir: BlendDirection.SOUTHEAST, dx: 1, dy: 1 },
    { dir: BlendDirection.SOUTHWEST, dx: -1, dy: 1 }
  ]
  
  for (const { dir, dx, dy } of directions) {
    const neighborKey = `${x + dx},${y + dy}`
    const neighborTile = tileMap[neighborKey] as string
    
    if (!neighborTile || neighborTile === 'delete') continue
    
    // Skip if tiles are the same
    if (baseTile === neighborTile) continue
    
    // Check if tiles can blend
    if (canTilesBlend(baseTile, neighborTile)) {
      const basePriority = getTileBlendPriority(baseTile)
      const neighborPriority = getTileBlendPriority(neighborTile)
      
      // Natural blend direction: Higher priority tiles blend into lower priority ones
      // This creates the expected visual hierarchy (e.g., cobblestone blends into grass)
      
      if (neighborPriority > basePriority) {
        // Neighbor has higher priority - it blends into this base tile
        const blendStrength = 1.5
        
        blends.push({
          direction: dir,
          neighborTile,
          blendStrength
        })
      } else if (neighborPriority === basePriority) {
        // Same priority tiles: use consistent direction to avoid double-blending
        const shouldBlend = baseTile.localeCompare(neighborTile) < 0
        if (shouldBlend) {
          const blendStrength = 1.2
          
          blends.push({
            direction: dir,
            neighborTile,
            blendStrength
          })
        }
      }
      // Lower priority neighbors don't blend into higher priority base tiles
    }
  }
  
  return blends.length > 0 ? {
    baseTile,
    blends
  } : null
}

/**
 * Create an edge mask canvas for blending two tiles with organic curved edges
 * Returns a canvas with alpha mask for the blend
 */
export function createBlendMask(
  direction: BlendDirection,
  blendStrength: number = 1.0,
  size: number = 64
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  
  // Create deterministic blend masks for tilable patterns
  // No random seeding needed - patterns are now mathematically consistent
  
  // Create organic curved blend mask
  createOrganicBlendMask(ctx, direction, size)
  
  // Apply blend strength
  if (blendStrength < 1.0) {
    ctx.globalAlpha = blendStrength
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = `rgba(255, 255, 255, ${blendStrength})`
    ctx.fillRect(0, 0, size, size)
  }
  
  return canvas
}

/**
 * Simple hash function for consistent randomness
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded random number generator for consistent patterns
 */
let randomSeed = 1
function seedRandom(seed: number): void {
  randomSeed = seed
}

function seededRandom(): number {
  randomSeed = (randomSeed * 9301 + 49297) % 233280
  return randomSeed / 233280
}

/**
 * Create an organic, curved blend mask based on direction using noise patterns
 */
function createOrganicBlendMask(
  ctx: CanvasRenderingContext2D,
  direction: BlendDirection,
  size: number
): void {
  // Start with transparent canvas
  ctx.clearRect(0, 0, size, size)
  
  // Generate organic curved path for blend zone with tilable patterns
  const path = new Path2D()
  const waveCount = 4 // Fixed wave count for tilable patterns
  const amplitude = size * 0.06 // Reduced amplitude for more subtle, tilable blending
  
  switch (direction) {
    case BlendDirection.NORTH:
      createOrganicBlendZone(path, size, direction, amplitude, waveCount)
      break
    case BlendDirection.SOUTH:
      createOrganicBlendZone(path, size, direction, amplitude, waveCount)
      break
    case BlendDirection.EAST:
      createOrganicBlendZone(path, size, direction, amplitude, waveCount)
      break
    case BlendDirection.WEST:
      createOrganicBlendZone(path, size, direction, amplitude, waveCount)
      break
    case BlendDirection.NORTHEAST:
      createOrganicDiagonalBlendZone(path, size, 'ne', amplitude)
      break
    case BlendDirection.NORTHWEST:
      createOrganicDiagonalBlendZone(path, size, 'nw', amplitude)
      break
    case BlendDirection.SOUTHEAST:
      createOrganicDiagonalBlendZone(path, size, 'se', amplitude)
      break
    case BlendDirection.SOUTHWEST:
      createOrganicDiagonalBlendZone(path, size, 'sw', amplitude)
      break
  }
  
  // Fill the organic blend zone with solid white (full blend)
  ctx.fillStyle = 'white'
  ctx.fill(path)
}

/**
 * Create organic blend zone that extends from the edge where neighbor is located
 */
function createOrganicBlendZone(
  path: Path2D,
  size: number,
  direction: BlendDirection,
  amplitude: number,
  waveCount: number
): void {
  const blendDepth = size * 0.25 // How deep into tile the blend extends
  
  switch (direction) {
    case BlendDirection.NORTH: {
      // Neighbor is above, blend from top edge downward
      path.moveTo(0, 0)
      path.lineTo(size, 0)
      
      // Create tilable wavy bottom boundary - start and end at same heights for seamless tiling
      for (let x = size; x >= 0; x -= 2) {
        const progress = x / size
        // Use sine waves that complete full cycles for tilable patterns
        const wave1 = Math.sin(progress * Math.PI * 2 * waveCount) * amplitude
        const wave2 = Math.sin(progress * Math.PI * 2 * waveCount * 1.5) * amplitude * 0.3
        const y = blendDepth + wave1 + wave2
        path.lineTo(x, Math.max(blendDepth * 0.5, Math.min(blendDepth * 1.5, y)))
      }
      break
    }
    
    case BlendDirection.SOUTH: {
      // Neighbor is below, blend from bottom edge upward
      path.moveTo(0, size)
      path.lineTo(size, size)
      
      // Create tilable wavy top boundary - mirror pattern from north for seamless tiling
      for (let x = size; x >= 0; x -= 2) {
        const progress = x / size
        // Use complementary sine waves for tilable patterns
        const wave1 = Math.sin(progress * Math.PI * 2 * waveCount) * amplitude
        const wave2 = Math.sin(progress * Math.PI * 2 * waveCount * 1.5) * amplitude * 0.3
        const y = size - blendDepth - wave1 - wave2
        path.lineTo(x, Math.max(size - blendDepth * 1.5, Math.min(size - blendDepth * 0.5, y)))
      }
      break
    }
    
    case BlendDirection.EAST: {
      // Neighbor is to the right, blend from right edge leftward
      path.moveTo(size, 0)
      path.lineTo(size, size)
      
      // Create tilable wavy left boundary for seamless tiling
      for (let y = size; y >= 0; y -= 2) {
        const progress = y / size
        // Use tilable sine waves that complete full cycles
        const wave1 = Math.sin(progress * Math.PI * 2 * waveCount) * amplitude
        const wave2 = Math.sin(progress * Math.PI * 2 * waveCount * 1.5) * amplitude * 0.3
        const x = size - blendDepth - wave1 - wave2
        path.lineTo(Math.max(size - blendDepth * 1.5, Math.min(size - blendDepth * 0.5, x)), y)
      }
      break
    }
    
    case BlendDirection.WEST: {
      // Neighbor is to the left, blend from left edge rightward
      path.moveTo(0, 0)
      path.lineTo(0, size)
      
      // Create tilable wavy right boundary - complement to east pattern
      for (let y = size; y >= 0; y -= 2) {
        const progress = y / size
        // Use complementary tilable sine waves
        const wave1 = Math.sin(progress * Math.PI * 2 * waveCount) * amplitude
        const wave2 = Math.sin(progress * Math.PI * 2 * waveCount * 1.5) * amplitude * 0.3
        const x = blendDepth + wave1 + wave2
        path.lineTo(Math.max(blendDepth * 0.5, Math.min(blendDepth * 1.5, x)), y)
      }
      break
    }
  }
  
  path.closePath()
}

/**
 * Create organic diagonal blend zone (for corner blending)
 */
function createOrganicDiagonalBlendZone(
  path: Path2D,
  size: number,
  corner: 'ne' | 'nw' | 'se' | 'sw',
  amplitude: number
): void {
  const blendDepth = size * 0.25 // Match the edge blend depth
  
  // Create corner blend zones that match the edge blending style
  switch (corner) {
    case 'ne': {
      // Northeast - blend from top-right corner
      path.moveTo(size, 0) // Start at top-right corner
      
      // Create clean wavy edge along top
      for (let x = size; x >= size - blendDepth; x -= 2) {
        const progress = (size - x) / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const y = wave
        path.lineTo(x, Math.max(0, Math.min(blendDepth, y)))
      }
      
      // Create clean wavy edge along right side
      for (let y = 0; y <= blendDepth; y += 2) {
        const progress = y / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const x = size - wave
        path.lineTo(Math.max(size - blendDepth, Math.min(size, x)), y)
      }
      
      path.lineTo(size, 0) // Close back to corner
      break
    }
    
    case 'nw': {
      // Northwest - blend from top-left corner
      path.moveTo(0, 0) // Start at top-left corner
      
      // Create clean wavy edge along top
      for (let x = 0; x <= blendDepth; x += 2) {
        const progress = x / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const y = wave
        path.lineTo(x, Math.max(0, Math.min(blendDepth, y)))
      }
      
      // Create clean wavy edge along left side
      for (let y = 0; y <= blendDepth; y += 2) {
        const progress = y / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const x = wave
        path.lineTo(Math.max(0, Math.min(blendDepth, x)), y)
      }
      
      path.lineTo(0, 0) // Close back to corner
      break
    }
    
    case 'se': {
      // Southeast - blend from bottom-right corner
      path.moveTo(size, size) // Start at bottom-right corner
      
      // Create clean wavy edge along bottom
      for (let x = size; x >= size - blendDepth; x -= 2) {
        const progress = (size - x) / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const y = size - wave
        path.lineTo(x, Math.max(size - blendDepth, Math.min(size, y)))
      }
      
      // Create clean wavy edge along right side
      for (let y = size; y >= size - blendDepth; y -= 2) {
        const progress = (size - y) / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const x = size - wave
        path.lineTo(Math.max(size - blendDepth, Math.min(size, x)), y)
      }
      
      path.lineTo(size, size) // Close back to corner
      break
    }
    
    case 'sw': {
      // Southwest - blend from bottom-left corner
      path.moveTo(0, size) // Start at bottom-left corner
      
      // Create clean wavy edge along bottom
      for (let x = 0; x <= blendDepth; x += 2) {
        const progress = x / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const y = size - wave
        path.lineTo(x, Math.max(size - blendDepth, Math.min(size, y)))
      }
      
      // Create clean wavy edge along left side
      for (let y = size; y >= size - blendDepth; y -= 2) {
        const progress = (size - y) / blendDepth
        const wave = Math.sin(progress * Math.PI * 2.5) * amplitude * 0.8
        const x = wave
        path.lineTo(Math.max(0, Math.min(blendDepth, x)), y)
      }
      
      path.lineTo(0, size) // Close back to corner
      break
    }
  }
  
  path.closePath()
}


// Cache for blend masks to improve performance
const blendMaskCache = new Map<string, HTMLCanvasElement>()

/**
 * Get a cached blend mask or create a new one
 */
export function getCachedBlendMask(
  direction: BlendDirection,
  blendStrength: number,
  size: number
): HTMLCanvasElement {
  const key = `${direction}-${blendStrength}-${size}`
  
  if (blendMaskCache.has(key)) {
    return blendMaskCache.get(key)!
  }
  
  const mask = createBlendMask(direction, blendStrength, size)
  blendMaskCache.set(key, mask)
  return mask
}

/**
 * Clear the blend mask cache (call when tiles change significantly)
 */
export function clearBlendMaskCache(): void {
  blendMaskCache.clear()
}