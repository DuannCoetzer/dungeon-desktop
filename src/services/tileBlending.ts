// Tile blending service for smooth transitions between different floor tile types
// Creates seamless blends by analyzing adjacent tiles and applying edge masks

import type { Palette, Layer, TileMap } from '../store'
import { BlendDirection } from './tileBlendingTypes'
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
  // Check default priorities first
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
    
    console.log(`Checking blend: ${baseTile} vs ${neighborTile} (${dir})`)
    
    // Check if tiles can blend
    if (canTilesBlend(baseTile, neighborTile)) {
      const basePriority = getTileBlendPriority(baseTile)
      const neighborPriority = getTileBlendPriority(neighborTile)
      
      console.log(`  Can blend! Base priority: ${basePriority}, Neighbor priority: ${neighborPriority}`)
      
      // Only blend if neighbor has higher priority (neighbor dominates)
      if (neighborPriority > basePriority) {
        // Calculate blend strength based on priority difference
        const priorityDiff = neighborPriority - basePriority
        const maxPriorityDiff = 10 // Reasonable max difference
        const blendStrength = Math.min(priorityDiff / maxPriorityDiff, 1.0)
        
        console.log(`  Adding blend: ${dir} with strength ${blendStrength}`)
        
        blends.push({
          direction: dir,
          neighborTile,
          blendStrength
        })
      } else {
        console.log(`  Skipping: neighbor priority not higher`)
      }
    } else {
      console.log(`  Cannot blend these tile types`)
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
  
  // Set random seed for consistent patterns per direction+size combination
  // This ensures the same blend mask is generated consistently
  const seed = hashString(`${direction}-${size}`)
  seedRandom(seed)
  
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
  // Create organic, curved edge using path drawing
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, size, size)
  
  ctx.globalCompositeOperation = 'destination-out'
  
  // Generate organic curved path based on direction
  const path = new Path2D()
  const waveCount = 3 + seededRandom() * 2 // 3-5 waves
  const amplitude = size * 0.15 // Wave amplitude
  
  switch (direction) {
    case BlendDirection.NORTH:
      createOrganicHorizontalEdge(path, size, 0, amplitude, waveCount, true)
      break
    case BlendDirection.SOUTH:
      createOrganicHorizontalEdge(path, size, size, amplitude, waveCount, false)
      break
    case BlendDirection.EAST:
      createOrganicVerticalEdge(path, size, size, amplitude, waveCount, false)
      break
    case BlendDirection.WEST:
      createOrganicVerticalEdge(path, size, 0, amplitude, waveCount, true)
      break
    case BlendDirection.NORTHEAST:
      createOrganicDiagonalEdge(path, size, 'ne', amplitude)
      break
    case BlendDirection.NORTHWEST:
      createOrganicDiagonalEdge(path, size, 'nw', amplitude)
      break
    case BlendDirection.SOUTHEAST:
      createOrganicDiagonalEdge(path, size, 'se', amplitude)
      break
    case BlendDirection.SOUTHWEST:
      createOrganicDiagonalEdge(path, size, 'sw', amplitude)
      break
  }
  
  // Create soft gradient fill
  const gradient = createSoftGradient(ctx, direction, size)
  ctx.fillStyle = gradient
  ctx.fill(path)
}

/**
 * Create organic horizontal edge (for north/south blending)
 */
function createOrganicHorizontalEdge(
  path: Path2D, 
  size: number, 
  baseY: number, 
  amplitude: number, 
  waveCount: number, 
  isTop: boolean
): void {
  path.moveTo(0, baseY)
  
  // Create wavy edge with organic curves
  for (let x = 0; x <= size; x += 2) {
    const progress = x / size
    const wave1 = Math.sin(progress * Math.PI * waveCount) * amplitude
    const wave2 = Math.sin(progress * Math.PI * waveCount * 1.7) * amplitude * 0.3
    const noise = (seededRandom() - 0.5) * amplitude * 0.2
    
    let y = baseY
    if (isTop) {
      y += wave1 + wave2 + noise
    } else {
      y -= wave1 + wave2 + noise
    }
    
    path.lineTo(x, y)
  }
  
  // Close the path
  if (isTop) {
    path.lineTo(size, 0)
    path.lineTo(0, 0)
  } else {
    path.lineTo(size, size)
    path.lineTo(0, size)
  }
  path.closePath()
}

/**
 * Create organic vertical edge (for east/west blending)
 */
function createOrganicVerticalEdge(
  path: Path2D, 
  size: number, 
  baseX: number, 
  amplitude: number, 
  waveCount: number, 
  isLeft: boolean
): void {
  path.moveTo(baseX, 0)
  
  // Create wavy edge with organic curves
  for (let y = 0; y <= size; y += 2) {
    const progress = y / size
    const wave1 = Math.sin(progress * Math.PI * waveCount) * amplitude
    const wave2 = Math.sin(progress * Math.PI * waveCount * 1.7) * amplitude * 0.3
    const noise = (seededRandom() - 0.5) * amplitude * 0.2
    
    let x = baseX
    if (isLeft) {
      x += wave1 + wave2 + noise
    } else {
      x -= wave1 + wave2 + noise
    }
    
    path.lineTo(x, y)
  }
  
  // Close the path
  if (isLeft) {
    path.lineTo(0, size)
    path.lineTo(0, 0)
  } else {
    path.lineTo(size, size)
    path.lineTo(size, 0)
  }
  path.closePath()
}

/**
 * Create organic diagonal edge (for corner blending)
 */
function createOrganicDiagonalEdge(
  path: Path2D, 
  size: number, 
  corner: 'ne' | 'nw' | 'se' | 'sw',
  amplitude: number
): void {
  const center = size / 2
  const radius = size * 0.4
  
  // Create curved corner transition
  const steps = 32
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 0.5
    const noise1 = Math.sin(angle * 6) * amplitude * 0.5
    const noise2 = (seededRandom() - 0.5) * amplitude * 0.3
    const r = radius + noise1 + noise2
    
    let x, y
    switch (corner) {
      case 'ne':
        x = center + r * Math.cos(angle)
        y = center - r * Math.sin(angle)
        break
      case 'nw':
        x = center - r * Math.cos(angle)
        y = center - r * Math.sin(angle)
        break
      case 'se':
        x = center + r * Math.cos(angle)
        y = center + r * Math.sin(angle)
        break
      case 'sw':
        x = center - r * Math.cos(angle)
        y = center + r * Math.sin(angle)
        break
    }
    
    if (i === 0) {
      path.moveTo(x, y)
    } else {
      path.lineTo(x, y)
    }
  }
  
  // Close with corner area
  switch (corner) {
    case 'ne':
      path.lineTo(size, 0)
      path.lineTo(size, size)
      break
    case 'nw':
      path.lineTo(0, 0)
      path.lineTo(size, 0)
      break
    case 'se':
      path.lineTo(size, size)
      path.lineTo(0, size)
      break
    case 'sw':
      path.lineTo(0, size)
      path.lineTo(0, 0)
      break
  }
  path.closePath()
}

/**
 * Create soft gradient for smooth blending
 */
function createSoftGradient(
  ctx: CanvasRenderingContext2D,
  direction: BlendDirection,
  size: number
): CanvasGradient {
  let gradient: CanvasGradient
  const center = size / 2
  
  // Use radial gradients for smoother, more organic blending
  switch (direction) {
    case BlendDirection.NORTH:
      gradient = ctx.createLinearGradient(0, 0, 0, center)
      break
    case BlendDirection.SOUTH:
      gradient = ctx.createLinearGradient(0, size, 0, center)
      break
    case BlendDirection.EAST:
      gradient = ctx.createLinearGradient(size, 0, center, 0)
      break
    case BlendDirection.WEST:
      gradient = ctx.createLinearGradient(0, 0, center, 0)
      break
    default:
      // Use radial gradient for diagonal directions
      gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
      break
  }
  
  // Softer gradient stops for organic blending
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')      // Full cutout
  gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)')   // Strong cutout
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)')   // Light cutout
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')       // No cutout
  
  return gradient
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