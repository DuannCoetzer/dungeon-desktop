/**
 * Shared canvas utility functions for consistent rendering
 * across the main game view and export functionality
 */

/**
 * Creates a parchment texture pattern for canvas backgrounds
 * This function creates the same pattern used in the main game view
 */
export function createParchmentPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  try {
    // Create pattern canvas with simple noise like DM game
    const patternCanvas = document.createElement('canvas')
    patternCanvas.width = 50
    patternCanvas.height = 50
    const patternCtx = patternCanvas.getContext('2d')
    if (!patternCtx) return null
    
    // Create a subtle noise pattern for parchment texture
    const imageData = patternCtx.createImageData(50, 50)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 30 - 15
      const baseColor = 240 + noise
      data[i] = Math.max(220, Math.min(255, baseColor - 5))     // R
      data[i + 1] = Math.max(220, Math.min(255, baseColor - 15))  // G
      data[i + 2] = Math.max(220, Math.min(255, baseColor - 40))  // B
      data[i + 3] = 255 // A
    }
    
    patternCtx.putImageData(imageData, 0, 0)
    return ctx.createPattern(patternCanvas, 'repeat')
  } catch (error) {
    console.error('Error creating parchment pattern:', error)
    return null
  }
}

/**
 * Applies the parchment background to a canvas context
 * First applies the base color, then the texture pattern
 * Now uses caching for better performance during zoom operations
 */
export function applyParchmentBackground(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number,
  useCache: boolean = true
): void {
  // Try to use cached background if available and requested
  if (useCache) {
    const { getCachedBackground, setCachedBackground } = require('./tileRenderer')
    const cached = getCachedBackground(width, height)
    if (cached) {
      ctx.drawImage(cached, 0, 0)
      return
    }
  }
  
  // Create background from scratch
  const needsCache = useCache
  let targetCtx = ctx
  let cacheCanvas: HTMLCanvasElement | null = null
  
  if (needsCache) {
    // Render to offscreen canvas for caching
    cacheCanvas = document.createElement('canvas')
    cacheCanvas.width = width
    cacheCanvas.height = height
    targetCtx = cacheCanvas.getContext('2d')!
  }
  
  // Apply base parchment color
  targetCtx.fillStyle = '#fffef0'
  targetCtx.fillRect(0, 0, width, height)
  
  // Apply parchment texture pattern
  const pattern = createParchmentPattern(targetCtx)
  if (pattern) {
    targetCtx.fillStyle = pattern
    targetCtx.fillRect(0, 0, width, height)
  }
  
  // Cache and draw to main context if needed
  if (needsCache && cacheCanvas) {
    const { setCachedBackground } = require('./tileRenderer')
    setCachedBackground(cacheCanvas, width, height, pattern)
    ctx.drawImage(cacheCanvas, 0, 0)
  }
}
