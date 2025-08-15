import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'
import { bresenhamLine } from './algorithms'
import type { Point } from './algorithms'

export class FreehandTool implements Tool {
  readonly name = 'freehand'
  private isDown = false
  private strokePoints: Point[] = []
  private lastTile: { x: number; y: number } | null = null
  private brushSize = 1

  onDown(context: PointerEventContext): void {
    this.isDown = true
    this.strokePoints = []
    this.lastTile = { x: context.tileX, y: context.tileY }
    
    // Set brush size based on modifier keys
    this.brushSize = context.shiftKey ? 3 : context.ctrlKey ? 2 : 1
    
    // Start the stroke with the first point
    this.addStrokePoint(context.tileX, context.tileY)
    this.stampTile(context.tileX, context.tileY)
  }

  onMove(context: PointerEventContext): void {
    if (!this.isDown || !this.lastTile) return
    
    const currentTile = { x: context.tileX, y: context.tileY }
    
    // Only process if we've moved to a different tile
    if (currentTile.x !== this.lastTile.x || currentTile.y !== this.lastTile.y) {
      // Use Bresenham line to fill gaps between rapid mouse movements
      const linePoints = bresenhamLine(
        this.lastTile.x, 
        this.lastTile.y, 
        currentTile.x, 
        currentTile.y
      )
      
      // Add all points in the line to the stroke and stamp them
      linePoints.forEach(point => {
        this.addStrokePoint(point.x, point.y)
        this.stampTile(point.x, point.y)
      })
      
      this.lastTile = currentTile
    }
  }

  onUp(_context: PointerEventContext): void {
    this.isDown = false
    this.strokePoints = []
    this.lastTile = null
    this.brushSize = 1
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // FreehandTool doesn't handle wheel events
  }

  renderPreview(renderContext: RenderContext): void {
    if (this.strokePoints.length === 0) return

    const { ctx, worldToScreen, tileSize } = renderContext
    
    // Save previous state
    const prevAlpha = ctx.globalAlpha
    const prevFillStyle = ctx.fillStyle
    const prevStrokeStyle = ctx.strokeStyle
    const prevLineWidth = ctx.lineWidth
    
    // Draw stroke path as a connected line for visual feedback
    if (this.strokePoints.length > 1) {
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = '#7c8cff'
      ctx.lineWidth = Math.max(1, this.brushSize)
      ctx.beginPath()
      
      const firstPoint = this.strokePoints[0]
      const { sx: firstSx, sy: firstSy } = worldToScreen(firstPoint.x + 0.5, firstPoint.y + 0.5)
      ctx.moveTo(firstSx, firstSy)
      
      for (let i = 1; i < this.strokePoints.length; i++) {
        const point = this.strokePoints[i]
        const { sx, sy } = worldToScreen(point.x + 0.5, point.y + 0.5)
        ctx.lineTo(sx, sy)
      }
      
      ctx.stroke()
    }
    
    // Draw brush preview at current stroke points
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#7c8cff'
    
    this.strokePoints.forEach(point => {
      this.getBrushTiles(point.x, point.y).forEach(brushTile => {
        const { sx, sy } = worldToScreen(brushTile.x, brushTile.y)
        const size = Math.ceil(tileSize * renderContext.scale)
        ctx.fillRect(sx, sy, size, size)
      })
    })
    
    // Restore previous state
    ctx.globalAlpha = prevAlpha
    ctx.fillStyle = prevFillStyle
    ctx.strokeStyle = prevStrokeStyle
    ctx.lineWidth = prevLineWidth
  }

  private addStrokePoint(x: number, y: number): void {
    // Avoid adding duplicate consecutive points
    const lastPoint = this.strokePoints[this.strokePoints.length - 1]
    if (!lastPoint || lastPoint.x !== x || lastPoint.y !== y) {
      this.strokePoints.push({ x, y })
    }
  }

  private stampTile(centerX: number, centerY: number): void {
    const state = useMapStore.getState()
    
    // Get all tiles affected by the brush
    const brushTiles = this.getBrushTiles(centerX, centerY)
    
    // Apply action for all brush tiles
    brushTiles.forEach(tile => {
      if (state.selected === 'delete') {
        // Delete mode - erase tiles
        state.eraseTile(tile.x, tile.y)
      } else {
        // Draw mode - place tiles
        const tileType = state.selected === 'wall' ? 'wall' : 'floor'
        setTile(state.currentLayer, tile.x, tile.y, tileType)
      }
    })
  }

  private getBrushTiles(centerX: number, centerY: number): Point[] {
    const tiles: Point[] = []
    const radius = Math.floor(this.brushSize / 2)
    
    if (this.brushSize === 1) {
      // Single tile
      tiles.push({ x: centerX, y: centerY })
    } else {
      // Circular brush
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            tiles.push({ x: centerX + dx, y: centerY + dy })
          }
        }
      }
    }
    
    return tiles
  }
}
