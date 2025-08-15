import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { setTile } from '../protocol'

export class DrawTool implements Tool {
  readonly name = 'draw'
  private isDown = false

  onDown(context: PointerEventContext): void {
    this.isDown = true
    this.performAction(context)
  }

  onMove(context: PointerEventContext): void {
    if (!this.isDown) return
    this.performAction(context)
  }

  onUp(_context: PointerEventContext): void {
    this.isDown = false
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // DrawTool doesn't handle wheel events
  }

  renderPreview(_renderContext: RenderContext): void {
    // DrawTool doesn't need preview rendering
  }

  private performAction(context: PointerEventContext): void {
    const state = useMapStore.getState()
    
    if (state.selected === 'delete') {
      // Delete mode - erase tiles on the current layer
      state.eraseTile(context.tileX, context.tileY)
    } else {
      this.drawTile(context)
    }
  }

  private drawTile(context: PointerEventContext): void {
    const state = useMapStore.getState()
    const tileType = state.selected === 'wall' ? 'wall' : 'floor'
    setTile(state.currentLayer, context.tileX, context.tileY, tileType)
  }
}
