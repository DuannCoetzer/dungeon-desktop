import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'
import { fillPolygon, strokePolygon } from './algorithms'
import type { Point } from './algorithms'

export class PolygonTool implements Tool {
  readonly name = 'polygon'
  private vertices: Point[] = []
  private filled = false
  private lastClickTime = 0
  private readonly doubleClickDelay = 300 // milliseconds

  onDown(context: PointerEventContext): void {
    const currentTime = Date.now()
    const timeSinceLastClick = currentTime - this.lastClickTime
    
    // Check for double-click to close polygon
    if (timeSinceLastClick < this.doubleClickDelay && this.vertices.length >= 3) {
      this.commitPolygon()
      return
    }
    
    // Add vertex
    const newVertex = { x: context.tileX, y: context.tileY }
    
    // Avoid adding duplicate consecutive vertices
    const lastVertex = this.vertices[this.vertices.length - 1]
    if (!lastVertex || lastVertex.x !== newVertex.x || lastVertex.y !== newVertex.y) {
      this.vertices.push(newVertex)
    }
    
    // Set fill mode based on shift key on first click
    if (this.vertices.length === 1) {
      this.filled = context.shiftKey
    }
    
    this.lastClickTime = currentTime
  }

  onMove(_context: PointerEventContext): void {
    // PolygonTool doesn't need to handle move events
  }

  onUp(_context: PointerEventContext): void {
    // PolygonTool doesn't need to handle up events
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // PolygonTool doesn't handle wheel events
  }

  renderPreview(renderContext: RenderContext): void {
    if (this.vertices.length === 0) return

    const { ctx, worldToScreen, tileSize } = renderContext
    
    // Save previous state
    const prevAlpha = ctx.globalAlpha
    const prevFillStyle = ctx.fillStyle
    const prevStrokeStyle = ctx.strokeStyle
    const prevLineWidth = ctx.lineWidth
    
    // Draw vertices
    ctx.globalAlpha = 0.8
    ctx.fillStyle = '#ff7c7c'
    this.vertices.forEach(vertex => {
      const { sx, sy } = worldToScreen(vertex.x + 0.5, vertex.y + 0.5)
      const size = Math.max(4, tileSize * renderContext.scale * 0.2)
      ctx.fillRect(sx - size/2, sy - size/2, size, size)
    })
    
    // Draw lines connecting vertices
    if (this.vertices.length > 1) {
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = '#7c8cff'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const firstVertex = this.vertices[0]
      const { sx: firstSx, sy: firstSy } = worldToScreen(firstVertex.x + 0.5, firstVertex.y + 0.5)
      ctx.moveTo(firstSx, firstSy)
      
      for (let i = 1; i < this.vertices.length; i++) {
        const vertex = this.vertices[i]
        const { sx, sy } = worldToScreen(vertex.x + 0.5, vertex.y + 0.5)
        ctx.lineTo(sx, sy)
      }
      
      // If we have at least 3 vertices, show closing line
      if (this.vertices.length >= 3) {
        ctx.lineTo(firstSx, firstSy)
      }
      
      ctx.stroke()
    }
    
    // Draw preview of filled/stroked polygon if we have enough vertices
    if (this.vertices.length >= 3) {
      const polygonPoints = this.filled ? fillPolygon(this.vertices) : strokePolygon(this.vertices)
      
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#7c8cff'
      
      polygonPoints.forEach(point => {
        const { sx, sy } = worldToScreen(point.x, point.y)
        const size = Math.ceil(tileSize * renderContext.scale)
        ctx.fillRect(sx, sy, size, size)
      })
    }
    
    // Show instruction text
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px sans-serif'
    const instruction = this.vertices.length < 3 ? 
      `Click to add vertices (${this.vertices.length}/3 min)` :
      'Double-click to close polygon'
    ctx.fillText(instruction, 10, 30)
    
    // Restore previous state
    ctx.globalAlpha = prevAlpha
    ctx.fillStyle = prevFillStyle
    ctx.strokeStyle = prevStrokeStyle
    ctx.lineWidth = prevLineWidth
  }

  private commitPolygon(): void {
    if (this.vertices.length < 3) return
    
    const state = useMapStore.getState()
    const tileType = state.selected === 'wall' ? 'wall' : 'floor'
    
    // Get all points for the polygon
    const polygonPoints = this.filled ? fillPolygon(this.vertices) : strokePolygon(this.vertices)
    
    // Set tiles for all points using protocol
    polygonPoints.forEach(point => {
      setTile(state.currentLayer, point.x, point.y, tileType)
    })
    
    // Reset for next polygon
    this.vertices = []
    this.filled = false
  }

  // Public method to reset the current polygon (useful for ESC key or tool switch)
  reset(): void {
    this.vertices = []
    this.filled = false
  }
}
