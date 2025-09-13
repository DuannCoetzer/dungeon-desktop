import type { Tool, PointerEventContext, RenderContext } from './Tool'
import { useMapStore } from '../mapStore'
import { useUIStore } from '../uiStore'
import { setTile } from '../protocol'
import { enhancedSmartAutoPlaceWallsForTile } from '../utils/autoWall'
import { useAssetStore } from '../store/assetStore'
import type { AssetInstance } from '../store'

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
      // Check if an asset is selected for placement
      if (state.selectedAssetForPlacement) {
        this.placeAsset(context, state.selectedAssetForPlacement)
      } else {
        this.drawTile(context)
      }
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

  private placeAsset(context: PointerEventContext, assetId: string): void {
    const mapState = useMapStore.getState()
    const assetStore = useAssetStore.getState()
    
    // Get the asset data
    const asset = assetStore.getAssetById(assetId)
    if (!asset) {
      console.error('Asset not found:', assetId)
      return
    }
    
    // Check if an asset already exists at this position
    const existingAsset = Object.values(mapState.mapData.assetInstances).find(
      instance => 
        Math.floor(instance.x / 32) === context.tileX && 
        Math.floor(instance.y / 32) === context.tileY
    )
    
    if (existingAsset) {
      // Don't place overlapping assets
      return
    }
    
    // Create a new asset instance
    const assetInstance: AssetInstance = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId: assetId,
      x: context.tileX * 32,
      y: context.tileY * 32,
      width: asset.width,
      height: asset.height,
      rotation: 0,
      gridWidth: asset.gridWidth || 1,
      gridHeight: asset.gridHeight || 1
    }
    
    // Add the asset instance to the map
    mapState.addAssetInstance(assetInstance)
  }
}
