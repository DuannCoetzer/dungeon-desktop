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

// Simple render cache for performance during zoom operations
interface RenderCacheEntry {
  canvas: HTMLCanvasElement
  lastUsed: number
}
const renderCache = new Map<string, RenderCacheEntry>()
const CACHE_LIFETIME = 30000 // 30 seconds
const MAX_CACHE_SIZE = 100 // Limit cache size to prevent memory issues

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
function cleanupRenderCache(): void {
  const now = Date.now()
  for (const [key, entry] of renderCache.entries()) {
    if (now - entry.lastUsed > CACHE_LIFETIME) {
      renderCache.delete(key)
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (renderCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(renderCache.entries())
      .sort(([,a], [,b]) => a.lastUsed - b.lastUsed)
    
    while (renderCache.size > MAX_CACHE_SIZE * 0.8) { // Keep 80% of max
      const [key] = sortedEntries.shift()!
      renderCache.delete(key)
    }
  }
}

function getCachedRender(key: string, size: number): HTMLCanvasElement | null {
  const entry = renderCache.get(key)
  if (entry) {
    entry.lastUsed = Date.now()
    return entry.canvas
  }
  return null
}

function setCachedRender(key: string, canvas: HTMLCanvasElement): void {
  // Clean cache if it's getting too big
  if (renderCache.size >= MAX_CACHE_SIZE) {
    cleanupRenderCache()
  }
  
  renderCache.set(key, {
    canvas: canvas.cloneNode(true) as HTMLCanvasElement,
    lastUsed: Date.now()
  })
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
  
  // Analyze blending requirements first
  const blendInfo = analyzeTileBlending(tileX, tileY, tiles, layer)
  
  // If no blending needed, use regular rendering
  if (!blendInfo || blendInfo.blends.length === 0) {
    return renderTile(ctx, tileId, x, y, size)
  }
  
  // Get the base tile image
  const baseImg = getCachedTileImage(tileId)
  if (!baseImg) {
    if (isDebugLoggingEnabled()) {
      console.warn('Base tile image not found for:', tileId)
    }
    return renderTile(ctx, tileId, x, y, size) // Fallback
  }
  
  // Save context state
  ctx.save()
  
  // First, render the base tile normally
  ctx.drawImage(baseImg, x, y, size, size)
  
  // Apply each blend
  for (const blend of blendInfo.blends) {
    const neighborImg = getCachedTileImage(blend.neighborTile)
    
    if (!neighborImg) {
      if (isDebugLoggingEnabled()) {
        console.warn('Neighbor tile image not found for:', blend.neighborTile)
      }
      continue
    }
    
    // Use the existing blend mask from the blending service
    const blendMask = getCachedBlendMask(blend.direction as any, blend.blendStrength, size)
    
    // Save state for this blend
    ctx.save()
    
    // Create a temporary canvas for the masked neighbor tile
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = size
    tempCanvas.height = size
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Draw neighbor tile
    tempCtx.drawImage(neighborImg, 0, 0, size, size)
    
    // Apply organic mask using destination-in composite operation
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.drawImage(blendMask, 0, 0, size, size)
    
    // Draw the masked result with high visibility for testing
    ctx.globalAlpha = 0.8 // Make blending very visible
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(tempCanvas, x, y, size, size)
    
    ctx.restore()
  }
  
  // Performance monitoring for blending operations
  if (isDebugLoggingEnabled() && startTime > 0) {
    const endTime = performance.now()
    const blendTime = endTime - startTime
    if (blendTime > 5) { // Log if blending takes longer than 5ms
      console.log(`🌨️ Slow blend: ${blendTime.toFixed(2)}ms for tile ${tileId} with ${blendInfo?.blends.length || 0} blends`)
    }
  }
  
  ctx.restore()
  return true
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
