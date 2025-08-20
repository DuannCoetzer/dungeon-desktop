import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'
import { midpointCircle } from './algorithms'

export class CircleTool implements Tool {
  readonly name = 'circle'
  private isDown = false
  private centerTile: { x: number; y: number } | null = null
  private currentTile: { x: number; y: number } | null = null
  private filled = false

  onDown(context: PointerEventContext): void {
    this.isDown = true
    this.centerTile = { x: context.tileX, y: context.tileY }
    this.currentTile = { x: context.tileX, y: context.tileY }
    
    // Toggle fill mode with Shift key
    this.filled = context.shiftKey
  }

  onMove(context: PointerEventContext): void {
    if (!this.isDown || !this.centerTile) return
    this.currentTile = { x: context.tileX, y: context.tileY }
  }

  onUp(_context: PointerEventContext): void {
    if (this.isDown && this.centerTile && this.currentTile) {
      this.drawCircle()
    }
    this.isDown = false
    this.centerTile = null
    this.currentTile = null
    this.filled = false
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // CircleTool doesn't handle wheel events
  }

  renderPreview(renderContext: RenderContext): void {
    if (!this.centerTile || !this.currentTile) return

    const { ctx, worldToScreen, tileSize } = renderContext
    
    // Calculate radius from center to current position
    const dx = this.currentTile.x - this.centerTile.x
    const dy = this.currentTile.y - this.centerTile.y
    const radius = Math.round(Math.sqrt(dx * dx + dy * dy))
    
    // Get circle points using midpoint circle algorithm
    const circlePoints = midpointCircle(
      this.centerTile.x,
      this.centerTile.y,
      radius,
      this.filled
    )
    
    // Save previous state
    const prevAlpha = ctx.globalAlpha
    const prevFillStyle = ctx.fillStyle
    const prevStrokeStyle = ctx.strokeStyle
    const prevLineWidth = ctx.lineWidth
    
    // Draw preview tiles
    ctx.globalAlpha = 0.5
    ctx.fillStyle = this.filled ? '#7c8cff' : 'transparent'
    
    if (this.filled) {
      circlePoints.forEach(point => {
        const { sx, sy } = worldToScreen(point.x, point.y)
        const size = Math.ceil(tileSize * renderContext.scale)
        ctx.fillRect(sx, sy, size, size)
      })
    } else {
      // Draw outline
      ctx.fillStyle = '#7c8cff'
      circlePoints.forEach(point => {
        const { sx, sy } = worldToScreen(point.x, point.y)
        const size = Math.ceil(tileSize * renderContext.scale)
        ctx.fillRect(sx, sy, size, size)
      })
    }
    
    // Draw radius line for reference
    ctx.globalAlpha = 0.8
    ctx.strokeStyle = '#ff7c7c'
    ctx.lineWidth = 2
    const { sx: centerSx, sy: centerSy } = worldToScreen(this.centerTile.x + 0.5, this.centerTile.y + 0.5)
    const { sx: currentSx, sy: currentSy } = worldToScreen(this.currentTile.x + 0.5, this.currentTile.y + 0.5)
    ctx.beginPath()
    ctx.moveTo(centerSx, centerSy)
    ctx.lineTo(currentSx, currentSy)
    ctx.stroke()
    
    // Restore previous state
    ctx.globalAlpha = prevAlpha
    ctx.fillStyle = prevFillStyle
    ctx.strokeStyle = prevStrokeStyle
    ctx.lineWidth = prevLineWidth
  }

  private drawCircle(): void {
    if (!this.centerTile || !this.currentTile) return
    
    const state = useMapStore.getState()
    
    // Calculate radius from center to current position
    const dx = this.currentTile.x - this.centerTile.x
    const dy = this.currentTile.y - this.centerTile.y
    const radius = Math.round(Math.sqrt(dx * dx + dy * dy))
    
    // Get all points on the circle using midpoint circle algorithm
    const circlePoints = midpointCircle(
      this.centerTile.x,
      this.centerTile.y,
      radius,
      this.filled
    )
    
    // Apply action for all points
    circlePoints.forEach(point => {
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
