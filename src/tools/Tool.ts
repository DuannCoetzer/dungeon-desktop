export interface PointerEventContext {
  x: number
  y: number
  tileX: number
  tileY: number
  button: number
  buttons: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  worldToScreen: (x: number, y: number) => { sx: number; sy: number }
  screenToTile: (px: number, py: number) => { x: number; y: number }
  scale: number
  tileSize: number
}

export interface Tool {
  /**
   * Called when pointer is pressed down
   * @param context - The pointer event context
   */
  onDown(context: PointerEventContext): void

  /**
   * Called when pointer moves (regardless of whether down or not)
   * @param context - The pointer event context
   */
  onMove(context: PointerEventContext): void

  /**
   * Called when pointer is released
   * @param context - The pointer event context
   */
  onUp(context: PointerEventContext): void

  /**
   * Called on wheel/scroll events
   * @param context - The wheel event context
   */
  onWheel(context: PointerEventContext & { deltaX: number; deltaY: number }): void

  /**
   * Called during rendering to draw tool-specific preview/overlay
   * @param renderContext - The rendering context
   */
  renderPreview(renderContext: RenderContext): void

  /**
   * Tool name for identification
   */
  readonly name: string
}
