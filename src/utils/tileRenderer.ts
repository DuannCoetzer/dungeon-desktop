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
export function getCachedTileImage(palette: Palette): HTMLImageElement | null {
  return imageCache.get(palette) || null
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
  palette: Palette, 
  x: number, 
  y: number, 
  size: number
): boolean {
  const img = getCachedTileImage(palette)
  
  if (img) {
    ctx.drawImage(img, x, y, size, size)
    return true
  } else {
    // Fallback to color if image not loaded
    ctx.fillStyle = getTileFallbackColor(palette)
    ctx.fillRect(x, y, size, size)
    return false
  }
}

// Render a tile with blending support
export function renderTileWithBlending(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  palette: Palette,
  x: number,
  y: number,
  size: number,
  tiles: Record<Layer, TileMap>,
  layer: Layer = 'floor'
): boolean {
  // Analyze blending requirements first
  const blendInfo = analyzeTileBlending(tileX, tileY, tiles, layer)
  
  // If no blending needed, use regular rendering
  if (!blendInfo || blendInfo.blends.length === 0) {
    return renderTile(ctx, palette, x, y, size)
  }
  
  console.log(`Blending tile ${palette} at (${tileX},${tileY}) with ${blendInfo.blends.length} neighbors`)
  
  // Get the base tile image
  const baseImg = getCachedTileImage(palette)
  if (!baseImg) {
    console.warn('Base tile image not found for:', palette)
    return renderTile(ctx, palette, x, y, size) // Fallback
  }
  
  // Save context state
  ctx.save()
  
  // First, render the base tile normally
  ctx.drawImage(baseImg, x, y, size, size)
  
  // Apply each blend
  for (const blend of blendInfo.blends) {
    const neighborImg = getCachedTileImage(blend.neighborTile)
    
    if (!neighborImg) {
      console.warn('Neighbor tile image not found for:', blend.neighborTile)
      continue
    }
    
    console.log(`  Blending with ${blend.neighborTile} from ${blend.direction} (strength: ${blend.blendStrength})`)
    
    // Create a simple gradient mask for now (debugging)
    const gradient = createSimpleBlendGradient(ctx, blend.direction, x, y, size)
    
    // Save state for this blend
    ctx.save()
    
    // Set up clipping with gradient
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = gradient
    ctx.globalAlpha = blend.blendStrength * 0.5 // Make blend more subtle
    
    // Draw the neighbor tile with the gradient mask
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = size
    tempCanvas.height = size
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Draw neighbor tile
    tempCtx.drawImage(neighborImg, 0, 0, size, size)
    
    // Apply gradient mask
    tempCtx.globalCompositeOperation = 'destination-in'
    tempCtx.fillStyle = gradient
    tempCtx.fillRect(0, 0, size, size)
    
    // Draw the masked result
    ctx.drawImage(tempCanvas, x, y, size, size)
    
    ctx.restore()
  }
  
  ctx.restore()
  return true
}

// Simple gradient for debugging blends
function createSimpleBlendGradient(
  ctx: CanvasRenderingContext2D,
  direction: string,
  x: number,
  y: number,
  size: number
): CanvasGradient {
  let gradient: CanvasGradient
  
  switch (direction) {
    case 'north':
      gradient = ctx.createLinearGradient(0, 0, 0, size)
      break
    case 'south':
      gradient = ctx.createLinearGradient(0, size, 0, 0)
      break
    case 'east':
      gradient = ctx.createLinearGradient(size, 0, 0, 0)
      break
    case 'west':
      gradient = ctx.createLinearGradient(0, 0, size, 0)
      break
    default:
      gradient = ctx.createLinearGradient(0, 0, size, size)
      break
  }
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  
  return gradient
}

// Fallback colors for tiles when images aren't loaded
function getTileFallbackColor(palette: Palette): string {
  switch (palette) {
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
      return '#4a7c2a' // Default to grass color
  }
}
