/**
 * Shared canvas utility functions for consistent rendering
 * across the main game view and export functionality
 */

import { getCachedBackground, setCachedBackground } from './tileRenderer'

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
 * Uses caching to improve performance on repeated draws
 */
export function applyParchmentBackground(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number,
  useCache: boolean = true
): void {
  try {
    // Try to get cached background if enabled
    if (useCache) {
      const cachedBackground = getCachedBackground(width, height)
      if (cachedBackground) {
        ctx.drawImage(cachedBackground, 0, 0)
        console.log('📋 Using cached parchment background', width + 'x' + height)
        return
      }
    }
    
    // Create new background (either not cached or cache miss)
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = width
    offscreenCanvas.height = height
    const offscreenCtx = offscreenCanvas.getContext('2d')!
    
    // Apply base parchment color
    offscreenCtx.fillStyle = '#fffef0'
    offscreenCtx.fillRect(0, 0, width, height)
    
    // Apply parchment texture pattern
    const pattern = createParchmentPattern(offscreenCtx)
    if (pattern) {
      offscreenCtx.fillStyle = pattern
      offscreenCtx.fillRect(0, 0, width, height)
    }
    
    // Cache the result if caching is enabled
    if (useCache) {
      setCachedBackground(offscreenCanvas, width, height, pattern)
      console.log('💾 Cached new parchment background', width + 'x' + height)
    }
    
    // Draw to main canvas
    ctx.drawImage(offscreenCanvas, 0, 0)
    
  } catch (error) {
    console.error('Error applying parchment background:', error)
    // Fallback to solid color
    ctx.fillStyle = '#fffef0'
    ctx.fillRect(0, 0, width, height)
  }
}
