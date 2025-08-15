import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'

export class RectTool implements Tool {
  readonly name = 'rect'
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
      this.drawRectangle()
    }
    this.isDown = false
    this.startTile = null
    this.currentTile = null
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // RectTool doesn't handle wheel events
  }

  renderPreview(renderContext: RenderContext): void {
    if (!this.startTile || !this.currentTile) return

    const { ctx, worldToScreen } = renderContext
    
    const x0 = Math.min(this.startTile.x, this.currentTile.x)
    const x1 = Math.max(this.startTile.x, this.currentTile.x)
    const y0 = Math.min(this.startTile.y, this.currentTile.y)
    const y1 = Math.max(this.startTile.y, this.currentTile.y)
    
    const { sx: sx0, sy: sy0 } = worldToScreen(x0, y0)
    const { sx: sx1, sy: sy1 } = worldToScreen(x1 + 1, y1 + 1)
    
    const w = sx1 - sx0
    const h = sy1 - sy0
    
    // Save previous state
    const prevAlpha = ctx.globalAlpha
    const prevStrokeStyle = ctx.strokeStyle
    const prevFillStyle = ctx.fillStyle
    const prevLineWidth = ctx.lineWidth
    
    // Draw preview rectangle
    ctx.globalAlpha = 0.2
    ctx.fillStyle = '#7c8cff'
    ctx.fillRect(sx0, sy0, w, h)
    
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#7c8cff'
    ctx.lineWidth = 1
    ctx.strokeRect(sx0 + 0.5, sy0 + 0.5, w - 1, h - 1)
    
    // Restore previous state
    ctx.globalAlpha = prevAlpha
    ctx.strokeStyle = prevStrokeStyle
    ctx.fillStyle = prevFillStyle
    ctx.lineWidth = prevLineWidth
  }

  private drawRectangle(): void {
    if (!this.startTile || !this.currentTile) return
    
    const state = useMapStore.getState()
    const tileType = state.selected === 'wall' ? 'wall' : 'floor'
    
    const x0 = Math.min(this.startTile.x, this.currentTile.x)
    const x1 = Math.max(this.startTile.x, this.currentTile.x)
    const y0 = Math.min(this.startTile.y, this.currentTile.y)
    const y1 = Math.max(this.startTile.y, this.currentTile.y)
    
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        setTile(state.currentLayer, x, y, tileType)
      }
    }
  }
}
