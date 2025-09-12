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
  // First render the base tile
  const baseRendered = renderTile(ctx, palette, x, y, size)
  
  // Analyze blending requirements
  const blendInfo = analyzeTileBlending(tileX, tileY, tiles, layer)
  
  if (!blendInfo || blendInfo.blends.length === 0) {
    return baseRendered // No blending needed
  }
  
  // Create an off-screen canvas for blend compositing
  const blendCanvas = document.createElement('canvas')
  blendCanvas.width = size
  blendCanvas.height = size
  const blendCtx = blendCanvas.getContext('2d')!
  
  // Draw base tile to blend canvas
  const baseImg = getCachedTileImage(palette)
  if (baseImg) {
    blendCtx.drawImage(baseImg, 0, 0, size, size)
  } else {
    // Fallback color
    blendCtx.fillStyle = getTileFallbackColor(palette)
    blendCtx.fillRect(0, 0, size, size)
  }
  
  // Apply blends for each neighboring tile that should blend over this one
  for (const blend of blendInfo.blends) {
    const neighborImg = getCachedTileImage(blend.neighborTile)
    
    if (!neighborImg) {
      continue // Skip if neighbor image not loaded
    }
    
    // Get blend mask for this direction and strength
    const blendMask = getCachedBlendMask(
      blend.direction,
      blend.blendStrength,
      size
    )
    
    // Create temporary canvas for masked neighbor tile
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = size
    maskCanvas.height = size
    const maskCtx = maskCanvas.getContext('2d')!
    
    // Draw neighbor tile
    maskCtx.drawImage(neighborImg, 0, 0, size, size)
    
    // Apply mask using composite operation
    maskCtx.globalCompositeOperation = 'destination-in'
    maskCtx.drawImage(blendMask, 0, 0, size, size)
    
    // Composite the masked neighbor onto the blend canvas
    blendCtx.globalCompositeOperation = 'source-over'
    blendCtx.drawImage(maskCanvas, 0, 0, size, size)
  }
  
  // Draw the final blended result to the main canvas
  ctx.drawImage(blendCanvas, x, y, size, size)
  
  return baseRendered
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
