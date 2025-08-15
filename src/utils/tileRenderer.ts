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
import type { Palette } from '../store'

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

    // Get image source
    const src = TILE_IMAGE_MAP[palette]
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

// Preload all tile images
export function preloadAllTileImages(): Promise<void> {
  const promises = Object.keys(TILE_IMAGE_MAP).map(palette => 
    loadTileImage(palette as Palette).catch(err => {
      console.warn(`Failed to preload tile image for ${palette}:`, err)
      return null
    })
  )
  
  return Promise.all(promises).then(() => {
    console.log('All tile images preloaded')
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

// Fallback colors for tiles when images aren't loaded
function getTileFallbackColor(palette: Palette): string {
  switch (palette) {
    case 'grass':
      return '#243219'
    case 'wall':
    case 'wall-brick':
    case 'wall-stone': 
    case 'wall-wood':
      return '#3a3f4a'
    case 'floor-stone-rough':
    case 'floor-stone-smooth':
      return '#4a4a4a'
    case 'floor-wood-planks':
      return '#6b4423'
    case 'floor-cobblestone':
      return '#5a5a5a'
    default:
      return '#243219' // Default to grass color
  }
}
