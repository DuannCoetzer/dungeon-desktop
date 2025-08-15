import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { useUIStore } from '../uiStore'
import { setTile } from '../protocol'
import { enhancedSmartAutoPlaceWallsForTile } from '../utils/autoWall'

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
    const mapState = useMapStore.getState()
    const uiState = useUIStore.getState()
    
    // Use the selected palette type directly as the tile type
    setTile(mapState.currentLayer, context.tileX, context.tileY, mapState.selected)
    
    // Auto-place walls if enabled and we're placing on the floor layer
    if (mapState.currentLayer === 'floor') {
      enhancedSmartAutoPlaceWallsForTile(
        context.tileX,
        context.tileY,
        mapState.selected,
        uiState.autoWallSettings
      )
    }
  }
}
