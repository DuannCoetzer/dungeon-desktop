import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'
import { bresenhamLine } from './algorithms'

export class LineTool implements Tool {
  readonly name = 'line'
  private isDown = false
  private startTile: { x: number; y: number } | null = null
  private currentTile: { x: number; y: number } | null = null

  onDown(context: PointerEventContext): void {
    this.isDown = true
    this.startTile = { x: context.tileX, y: context.tileY }
    this.currentTile = { x: context.tileX, y: context.tileY }
  }

  onMove(context: PointerEventContext): void {
    if (!this.isDown || !this.startTile) return
    this.currentTile = { x: context.tileX, y: context.tileY }
  }

  onUp(_context: PointerEventContext): void {
    if (this.isDown && this.startTile && this.currentTile) {
      this.drawLine()
    }
    this.isDown = false
    this.startTile = null
    this.currentTile = null
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // LineTool doesn't handle wheel events
  }

  renderPreview(renderContext: RenderContext): void {
    if (!this.startTile || !this.currentTile) return

    const { ctx, worldToScreen, tileSize } = renderContext
    
    // Get line points using Bresenham algorithm
    const linePoints = bresenhamLine(
      this.startTile.x, 
      this.startTile.y, 
      this.currentTile.x, 
      this.currentTile.y
    )
    
    // Save previous state
    const prevAlpha = ctx.globalAlpha
    const prevFillStyle = ctx.fillStyle
    
    // Draw preview tiles
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#7c8cff'
    
    linePoints.forEach(point => {
      const { sx, sy } = worldToScreen(point.x, point.y)
      const size = Math.ceil(tileSize * renderContext.scale)
      ctx.fillRect(sx, sy, size, size)
    })
    
    // Restore previous state
    ctx.globalAlpha = prevAlpha
    ctx.fillStyle = prevFillStyle
  }

  private drawLine(): void {
    if (!this.startTile || !this.currentTile) return
    
    const state = useMapStore.getState()
    
    // Get all points on the line using Bresenham algorithm
    const linePoints = bresenhamLine(
      this.startTile.x, 
      this.startTile.y, 
      this.currentTile.x, 
      this.currentTile.y
    )
    
    // Apply action for all points
    linePoints.forEach(point => {
      if (state.selected === 'delete') {
        // Delete mode - erase tiles
        state.eraseTile(point.x, point.y)
      } else {
        // Draw mode - place tiles
        setTile(state.currentLayer, point.x, point.y, state.selected)
      }
    })
  }
}
