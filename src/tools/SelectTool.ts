import type { Tool, PointerEventContext, RenderContext } from './Tool'

export class SelectTool implements Tool {
  readonly name = 'select'

  onDown(_context: PointerEventContext): void {
    // SelectTool doesn't currently implement selection functionality
    // This is a placeholder for future selection features
  }

  onMove(_context: PointerEventContext): void {
    // SelectTool doesn't currently implement selection functionality
  }

  onUp(_context: PointerEventContext): void {
    // SelectTool doesn't currently implement selection functionality
  }

  onWheel(_context: PointerEventContext & { deltaX: number; deltaY: number }): void {
    // SelectTool doesn't handle wheel events
  }

  renderPreview(_renderContext: RenderContext): void {
    // SelectTool doesn't need preview rendering yet
  }
}
