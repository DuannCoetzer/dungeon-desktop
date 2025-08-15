import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { eraseTile } from '../protocol'

export class EraseTool implements Tool {
  readonly name = 'erase'
  private isDown = false

  onDown(context: PointerEventContext): void {
    this.isDown = true
    this.eraseTile(context)
  }

  onMove(context: PointerEventContext): void {
    if (!this.isDown) return
    this.eraseTile(context)
  }

  onUp(_context: PointerEventContext): void {
    this.isDown = false
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // EraseTool doesn't handle wheel events
  }

  renderPreview(_renderContext: RenderContext): void {
    // EraseTool doesn't need preview rendering
  }

  private eraseTile(context: PointerEventContext): void {
    const state = useMapStore.getState()
    eraseTile(state.currentLayer, context.tileX, context.tileY)
  }
}
