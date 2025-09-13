import {
  TileGrass,
  TileWall,
  TileFloorStoneRough,
  TileFloorStoneSmooth,
  TileFloorWoodPlanks,
  TileFloorCobblestone,
  TileWallBrick,
  TileWallStone,
  TileWallWood
} from '../assets'
import type { Palette, Layer, TileMap } from '../store'
import { useTileStore } from '../store/tileStore'
import { useUIStore } from '../uiStore'
import { isDebugLoggingEnabled } from '../store/settingsStore'
import { 
  analyzeTileBlending, 
  getCachedBlendMask, 
  type TileBlendInfo 
} from '../services/tileBlending'

// Map of palette types to tile image sources
export const TILE_IMAGE_MAP: Record<string, string> = {
  'grass': TileGrass,
  'wall': TileWall,
  'floor-stone-rough': TileFloorStoneRough,
  'floor-stone-smooth': TileFloorStoneSmooth,
  'floor-wood-planks': TileFloorWoodPlanks,
  'floor-cobblestone': TileFloorCobblestone,
  'wall-brick': TileWallBrick,
  'wall-stone': TileWallStone,
  'wall-wood': TileWallWood,
  // Fog uses a semi-transparent black overlay, no specific image needed
  'fog': '', // Will use fallback color
}

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>()

// Comprehensive caching system for performance
interface RenderCacheEntry {
  canvas: HTMLCanvasElement
  lastUsed: number
  dataHash: string // Hash of tile data to detect changes
}

interface BackgroundCacheEntry {
  canvas: HTMLCanvasElement
  width: number
  height: number
  pattern: CanvasPattern | null
}

// Tile section cache for expensive blending operations
const tileSectionCache = new Map<string, RenderCacheEntry>()
const backgroundCache = new Map<string, BackgroundCacheEntry>()
const blendedTileCache = new Map<string, RenderCacheEntry>() // Cache for individual blended tiles

const CACHE_LIFETIME = 300000 // 5 minutes for better persistence
const MAX_CACHE_SIZE = 200 // Increased cache size for better performance
const TILE_SECTION_SIZE = 8 // Cache 8x8 tile sections
const BACKGROUND_CACHE_KEY = 'parchment_bg'

// Load and cache an image
export function loadTileImage(palette: Palette): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Check if already cached
    if (imageCache.has(palette)) {
      resolve(imageCache.get(palette)!)
      return
    }

    // Try to get image source from predefined tiles first
    let src = TILE_IMAGE_MAP[palette]
    
    // If not found, check the tile store for imported tiles
    if (!src) {
      const tileStore = useTileStore.getState()
      const tile = tileStore.getTileById(palette)
      if (tile) {
        src = tile.src
      }
    }
    
    if (!src) {
      reject(new Error(`No image found for palette: ${palette}`))
      return
    }

    // Create and load image
    const img = new Image()
    img.onload = () => {
      imageCache.set(palette, img)
      resolve(img)
    }
    img.onerror = () => {
      reject(new Error(`Failed to load image for palette: ${palette}`))
    }
    img.src = src
  })
}

// Get cached image (returns null if not loaded)
export function getCachedTileImage(tileId: string): HTMLImageElement | null {
  return imageCache.get(tileId) || null
}

// Cache management utilities
export function cleanupAllCaches(): void {
  const now = Date.now()
  
  // Clean tile section cache
  for (const [key, entry] of tileSectionCache.entries()) {
    if (now - entry.lastUsed > CACHE_LIFETIME) {
      tileSectionCache.delete(key)
    }
  }
  
  // Clean blended tile cache
  for (const [key, entry] of blendedTileCache.entries()) {
    if (now - entry.lastUsed > CACHE_LIFETIME) {
      blendedTileCache.delete(key)
    }
  }
  
  // If caches are still too large, remove oldest entries
  cleanupCacheBySize(tileSectionCache)
  cleanupCacheBySize(blendedTileCache)
}

function cleanupCacheBySize(cache: Map<string, RenderCacheEntry>): void {
  if (cache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(cache.entries())
      .sort(([,a], [,b]) => a.lastUsed - b.lastUsed)
    
    while (cache.size > MAX_CACHE_SIZE * 0.8) { // Keep 80% of max
      const [key] = sortedEntries.shift()!
      cache.delete(key)
    }
  }
}

function getCachedRender(key: string, cache: Map<string, RenderCacheEntry>, expectedHash?: string): HTMLCanvasElement | null {
  const entry = cache.get(key)
  if (entry && (!expectedHash || entry.dataHash === expectedHash)) {
    entry.lastUsed = Date.now()
    return entry.canvas
  }
  return null
}

function setCachedRender(key: string, canvas: HTMLCanvasElement, cache: Map<string, RenderCacheEntry>, dataHash: string = ''): void {
  // Clean cache if it's getting too big
  if (cache.size >= MAX_CACHE_SIZE) {
    cleanupAllCaches()
  }
  
  // Clone canvas to prevent external modifications
  const clonedCanvas = document.createElement('canvas')
  clonedCanvas.width = canvas.width
  clonedCanvas.height = canvas.height
  const clonedCtx = clonedCanvas.getContext('2d')!
  clonedCtx.drawImage(canvas, 0, 0)
  
  cache.set(key, {
    canvas: clonedCanvas,
    lastUsed: Date.now(),
    dataHash
  })
}

// Background caching functions
export function getCachedBackground(width: number, height: number): HTMLCanvasElement | null {
  const entry = backgroundCache.get(BACKGROUND_CACHE_KEY)
  if (entry && entry.width === width && entry.height === height) {
    return entry.canvas
  }
  return null
}

export function setCachedBackground(canvas: HTMLCanvasElement, width: number, height: number, pattern: CanvasPattern | null): void {
  // Clone the background canvas
  const clonedCanvas = document.createElement('canvas')
  clonedCanvas.width = canvas.width
  clonedCanvas.height = canvas.height
  const clonedCtx = clonedCanvas.getContext('2d')!
  clonedCtx.drawImage(canvas, 0, 0)
  
  backgroundCache.set(BACKGROUND_CACHE_KEY, {
    canvas: clonedCanvas,
    width,
    height,
    pattern
  })
}

// Utility function to create a hash of tile data
function createTileDataHash(tiles: Record<Layer, TileMap>, bounds: { left: number, top: number, right: number, bottom: number }): string {
  const relevantTiles: string[] = []
  
  for (const layer of ['floor', 'walls', 'objects'] as const) {
    for (const [key, value] of Object.entries(tiles[layer])) {
      const [x, y] = key.split(',').map(Number)
      if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
        relevantTiles.push(`${layer}:${key}:${value}`)
      }
    }
  }
  
  return relevantTiles.sort().join('|')
}

// Cache individual blended tiles for reuse
export function getCachedBlendedTile(tileId: string, tileX: number, tileY: number, size: number, dataHash: string): HTMLCanvasElement | null {
  const key = `${tileId}_${tileX}_${tileY}_${size}`
  return getCachedRender(key, blendedTileCache, dataHash)
}

export function setCachedBlendedTile(tileId: string, tileX: number, tileY: number, size: number, canvas: HTMLCanvasElement, dataHash: string): void {
  const key = `${tileId}_${tileX}_${tileY}_${size}`
  setCachedRender(key, canvas, blendedTileCache, dataHash)
}

// Cache invalidation when tiles change
export function invalidateTileCache(tileX?: number, tileY?: number): void {
  if (tileX !== undefined && tileY !== undefined) {
    // Invalidate specific area
    const affectedKeys = Array.from(blendedTileCache.keys()).filter(key => {
      const parts = key.split('_')
      if (parts.length >= 3) {
        const tx = parseInt(parts[1])
        const ty = parseInt(parts[2])
        // Invalidate the changed tile and its neighbors (for blending)
        return Math.abs(tx - tileX) <= 1 && Math.abs(ty - tileY) <= 1
      }
      return false
    })
    
    affectedKeys.forEach(key => blendedTileCache.delete(key))
    
    if (isDebugLoggingEnabled()) {
      console.log(`🗑️ Invalidated ${affectedKeys.length} cached tiles around (${tileX}, ${tileY})`)
    }
  } else {
    // Invalidate all tile caches
    blendedTileCache.clear()
    tileSectionCache.clear()
    if (isDebugLoggingEnabled()) {
      console.log('🗑️ Cleared all tile caches')
    }
  }
}

// Preload all tile images (default and imported)
export function preloadAllTileImages(): Promise<void> {
  // Preload default tiles
  const defaultPromises = Object.keys(TILE_IMAGE_MAP).map(palette => 
    loadTileImage(palette as Palette).catch(err => {
      console.warn(`Failed to preload default tile image for ${palette}:`, err)
      return null
    })
  )
  
  // Preload imported tiles from tile store
  const tileStore = useTileStore.getState()
  const importedPromises = tileStore.importedTiles
    .map(tile => 
      loadTileImage(tile.id as Palette).catch(err => {
        console.warn(`Failed to preload imported tile image for ${tile.name}:`, err)
        return null
      })
    )
  
  const allPromises = [...defaultPromises, ...importedPromises]
  
  return Promise.all(allPromises).then(() => {
    console.log(`Preloaded ${defaultPromises.length} default and ${importedPromises.length} imported tile images`)
  })
}

// Render a tile on canvas context
export function renderTile(
  ctx: CanvasRenderingContext2D, 
  tileId: string, 
  x: number, 
  y: number, 
  size: number
): boolean {
  const img = getCachedTileImage(tileId)
  
  if (img) {
    ctx.drawImage(img, x, y, size, size)
    return true
  } else {
    // Fallback to color if image not loaded
    ctx.fillStyle = getTileFallbackColor(tileId)
    ctx.fillRect(x, y, size, size)
    return false
  }
}

// Smart tile renderer that automatically applies blending when appropriate
export function renderSmartTile(
  ctx: CanvasRenderingContext2D,
  tileId: string,
  x: number,
  y: number,
  size: number,
  tileX?: number,
  tileY?: number,
  tiles?: Record<Layer, TileMap>,
  layer: Layer = 'floor',
  forceBlending: boolean = false
): boolean {
  // Check global blending setting from UI store
  const globalBlendingEnabled = useUIStore?.getState?.()?.isTileBlendingEnabled ?? true
  
  // Only apply blending if:
  // 1. Global blending is enabled OR forced
  // 2. We have tile coordinates and tile data
  // 3. It's a floor layer (blending primarily for floors)
  const shouldBlend = (globalBlendingEnabled || forceBlending) && 
                     tileX !== undefined && 
                     tileY !== undefined && 
                     tiles && 
                     layer === 'floor'
  
  if (shouldBlend) {
    return renderTileWithBlending(ctx, tileX!, tileY!, tileId, x, y, size, tiles, layer)
  } else {
    return renderTile(ctx, tileId, x, y, size)
  }
}

// Render a tile with blending support
export function renderTileWithBlending(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileId: string,
  x: number,
  y: number,
  size: number,
  tiles: Record<Layer, TileMap>,
  layer: Layer = 'floor'
): boolean {
  let startTime = 0
  if (isDebugLoggingEnabled()) {
    startTime = performance.now()
  }
  
  // Analyze blending requirements
  const blendInfo = analyzeTileBlending(tileX, tileY, tiles, layer)
  
  // If no blending needed, use regular rendering
  if (!blendInfo || blendInfo.blends.length === 0) {
    return renderTile(ctx, tileId, x, y, size)
  }
  
  try {
    // Check cache first - make sure cache key includes size for zoom levels
    const neighborBounds = { 
      left: tileX - 1, 
      top: tileY - 1, 
      right: tileX + 1, 
      bottom: tileY + 1 
    }
    const tileDataHash = createTileDataHash(tiles, neighborBounds)
    const cacheKey = `${tileId}_${tileX}_${tileY}_${size}_${tileDataHash}`
    const cachedCanvas = getCachedRender(cacheKey, blendedTileCache, tileDataHash)
    
    if (cachedCanvas) {
      if (isDebugLoggingEnabled()) {
        console.log('🎯 Using cached blended tile at', tileX, tileY)
      }
      ctx.globalAlpha = 1.0
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(cachedCanvas, x, y)
      return true
    }
    
    // Get the base tile image
    const baseImg = getCachedTileImage(tileId)
    if (!baseImg) {
      if (isDebugLoggingEnabled()) {
        console.warn('Base tile image not found for:', tileId)
      }
      return renderTile(ctx, tileId, x, y, size) // Fallback
    }
  
  // Create offscreen canvas for caching the blended result
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = size
  offscreenCanvas.height = size
  const offscreenCtx = offscreenCanvas.getContext('2d')!
  // First, render the base tile to offscreen canvas
  offscreenCtx.drawImage(baseImg, 0, 0, size, size)
  
  // Apply each blend to offscreen canvas
  for (const blend of blendInfo.blends) {
    const neighborImg = getCachedTileImage(blend.neighborTile)
    if (!neighborImg) {
      if (isDebugLoggingEnabled()) {
        console.warn('Neighbor tile image not found for:', blend.neighborTile)
      }
      continue
    }
    
    const blendMask = getCachedBlendMask(blend.direction as any, blend.blendStrength, size)
    
    // Use simple hard blending with composite operations
    offscreenCtx.save()
    
    // Create masked neighbor tile
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = size
    tempCanvas.height = size
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Draw neighbor tile
    tempCtx.drawImage(neighborImg, 0, 0, size, size)
    
    // Apply mask to cut out the blend area
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.drawImage(blendMask, 0, 0, size, size)
    
    // Draw the masked neighbor over the base with full opacity
    offscreenCtx.globalAlpha = 1.0  // Full opacity for hard blend
    offscreenCtx.globalCompositeOperation = 'source-over'
    offscreenCtx.drawImage(tempCanvas, 0, 0, size, size)
    
    offscreenCtx.restore()
  }
  
  // Cache the blended result with the full cache key
  setCachedRender(cacheKey, offscreenCanvas, blendedTileCache, tileDataHash)
  
  // Draw the cached result to main context
  ctx.globalAlpha = 1.0
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(offscreenCanvas, x, y)
  
  if (isDebugLoggingEnabled()) {
    console.log('🎨 Created and cached blended tile at', tileX, tileY, 'with', blendInfo.blends.length, 'blends')
  }
  
    // Performance monitoring for blending operations
    if (isDebugLoggingEnabled() && startTime > 0) {
      const endTime = performance.now()
      const blendTime = endTime - startTime
      if (blendTime > 5) {
        console.log(`🌨️ Slow blend: ${blendTime.toFixed(2)}ms for tile ${tileId} with ${blendInfo?.blends.length || 0} blends`)
      }
    }
    
    return true
  } catch (error) {
    console.error('Error in blending logic:', error)
    // Fallback to simple tile rendering
    return renderTile(ctx, tileId, x, y, size)
  }
}


// Fallback colors for tiles when images aren't loaded
function getTileFallbackColor(tileId: string): string {
  // Handle default palette colors
  switch (tileId) {
    case 'grass':
      return '#4a7c2a'
    case 'wall':
    case 'wall-brick':
    case 'wall-stone': 
    case 'wall-wood':
      return '#5a5a5a'
    case 'floor-stone-rough':
      return '#666666'
    case 'floor-stone-smooth':
      return '#777777'
    case 'floor-wood-planks':
      return '#8b4513'
    case 'floor-cobblestone':
      return '#696969'
    case 'fog':
      return 'rgba(0, 10, 20, 0.8)' // Semi-transparent dark blue-black
    default:
      // For imported tiles, use a generic color based on category if available
      const tileStore = useTileStore.getState()
      const tile = tileStore.getTileById(tileId)
      if (tile) {
        switch (tile.category) {
          case 'floors': return '#8b4513' // Brown for floors
          case 'walls': return '#5a5a5a' // Gray for walls
          case 'roofs': return '#654321' // Dark brown for roofs
          case 'pathing': return '#696969' // Dark gray for paths
          default: return '#4a7c2a' // Green default
        }
      }
      return '#4a7c2a' // Default to grass color
  }
}
