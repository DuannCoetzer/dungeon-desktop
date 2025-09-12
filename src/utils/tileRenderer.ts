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
export function getCachedTileImage(tileId: string): HTMLImageElement | null {
  return imageCache.get(tileId) || null
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
  // Analyze blending requirements first
  const blendInfo = analyzeTileBlending(tileX, tileY, tiles, layer)
  
  // If no blending needed, use regular rendering
  if (!blendInfo || blendInfo.blends.length === 0) {
    return renderTile(ctx, tileId, x, y, size)
  }
  
  
  // Get the base tile image
  const baseImg = getCachedTileImage(tileId)
  if (!baseImg) {
    console.warn('Base tile image not found for:', tileId)
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
      console.warn('Neighbor tile image not found for:', blend.neighborTile)
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
