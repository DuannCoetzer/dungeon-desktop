import React from 'react'
import { useMapStore } from '../mapStore'
import { useUIStore } from '../uiStore'
import type { AssetInstance } from '../store'

// Custom hook for drag preview functionality
export const useDragPreview = () => {
  // This could be expanded to provide drag preview functionality
  return null
}

function ResizeHandle({ type, position, onMouseDown }: {
  type: string
  position: string
  onMouseDown: (e: React.MouseEvent, type: string, position: string) => void
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '8px',
    backgroundColor: '#007acc',
    border: '1px solid white',
    cursor: getCursor(type, position),
    zIndex: 1000,
  }

  // Position the handles around the asset
  switch (position) {
    case 'nw':
      style.top = '-4px'
      style.left = '-4px'
      break
    case 'ne':
      style.top = '-4px'
      style.right = '-4px'
      break
    case 'sw':
      style.bottom = '-4px'
      style.left = '-4px'
      break
    case 'se':
      style.bottom = '-4px'
      style.right = '-4px'
      break
    case 'n':
      style.top = '-4px'
      style.left = '50%'
      style.transform = 'translateX(-50%)'
      break
    case 's':
      style.bottom = '-4px'
      style.left = '50%'
      style.transform = 'translateX(-50%)'
      break
    case 'w':
      style.left = '-4px'
      style.top = '50%'
      style.transform = 'translateY(-50%)'
      break
    case 'e':
      style.right = '-4px'
      style.top = '50%'
      style.transform = 'translateY(-50%)'
      break
    case 'rotate':
      style.top = '-20px'
      style.left = '50%'
      style.transform = 'translateX(-50%)'
      break
  }

  return (
    <div
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown(e, type, position)
      }}
    />
  )
}

function getCursor(type: string, position: string): string {
  if (type === 'rotate') return 'grab'
  
  switch (position) {
    case 'nw':
    case 'se':
      return 'nw-resize'
    case 'ne':
    case 'sw':
      return 'ne-resize'
    case 'n':
    case 's':
      return 'n-resize'
    case 'w':
    case 'e':
      return 'w-resize'
    default:
      return 'default'
  }
}

interface AssetInstanceComponentProps {
  instance: AssetInstance
  asset?: { src: string; name: string }
  worldToScreen: (x: number, y: number) => { sx: number; sy: number }
  screenToTile: (px: number, py: number) => { x: number; y: number }
  scale: number
  tileSize: number
}

export function AssetInstanceComponent({
  instance,
  asset,
  worldToScreen,
  screenToTile,
  scale,
  tileSize,
}: AssetInstanceComponentProps) {
  const { selectedAssetInstances, selectAssetInstance, updateAssetInstance, deleteAssetInstance } = useMapStore()
  const isSelected = selectedAssetInstances.includes(instance.id)
  const isSnapToGrid = useUIStore(state => state.isSnapToGrid)

  const { sx, sy } = worldToScreen(instance.x, instance.y)
  const displayWidth = instance.width * scale
  const displayHeight = instance.height * scale

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSelected) {
      selectAssetInstance(instance.id)
    }
  }
  
  // Dragging functionality for moving assets
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSelected) {
      selectAssetInstance(instance.id)
    }
    
    const startX = e.clientX
    const startY = e.clientY
    const startInstancePos = { x: instance.x, y: instance.y }
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Calculate the mouse movement in screen coordinates
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      // Convert the delta to world coordinates based on scale
      const worldDeltaX = deltaX / (tileSize * scale)
      const worldDeltaY = deltaY / (tileSize * scale)
      
      // Calculate new position
      let newX = startInstancePos.x + worldDeltaX
      let newY = startInstancePos.y + worldDeltaY
      
      // Snap to grid if enabled
      if (isSnapToGrid) {
        newX = Math.round(newX)
        newY = Math.round(newY)
      }
      
      // Update the asset position
      updateAssetInstance(instance.id, { x: newX, y: newY })
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleTransformStart = (e: React.MouseEvent, type: string, position: string) => {
    e.stopPropagation()
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Only handle rotation since resize is disabled
      if (type === 'rotate') {
        const centerX = sx + displayWidth / 2
        const centerY = sy + displayHeight / 2
        const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX)
        const degrees = (angle * 180) / Math.PI
        updateAssetInstance(instance.id, { rotation: degrees })
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && isSelected) {
      deleteAssetInstance(instance.id)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: sx,
        top: sy,
        width: displayWidth,
        height: displayHeight,
        transform: `rotate(${instance.rotation}deg)`,
        transformOrigin: 'center',
        border: isSelected ? '2px solid #007acc' : '1px solid transparent',
        cursor: isSelected ? 'move' : 'pointer',
        zIndex: 100,
        pointerEvents: 'auto' // Enable pointer events for the asset
      }}
      onClick={handleSelect}
      onMouseDown={handleDragStart} // Add drag start handler
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {asset && (
        <img
          src={asset.src}
          alt={asset.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      )}
      
      {isSelected && (
        <>
          {/* Grid footprint visualization */}
          <div style={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: displayWidth + 4,
            height: displayHeight + 4,
            pointerEvents: 'none',
            zIndex: 99
          }}>
            {/* Grid cells overlay with asset image */}
            <div style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: displayWidth,
              height: displayHeight,
              display: 'grid',
              gridTemplateColumns: `repeat(${instance.gridWidth || 1}, 1fr)`,
              gridTemplateRows: `repeat(${instance.gridHeight || 1}, 1fr)`,
              gap: '1px',
              opacity: 0.7
            }}>
              {Array.from({ length: (instance.gridWidth || 1) * (instance.gridHeight || 1) }).map((_, i) => {
                const gridWidth = instance.gridWidth || 1
                const col = i % gridWidth
                const row = Math.floor(i / gridWidth)
                
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: '#007acc20',
                      border: '1px solid #4a9eff',
                      borderRadius: '2px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Show portion of asset image in this grid cell */}
                    {asset && (
                      <img
                        src={asset.src}
                        alt={asset.name}
                        style={{
                          position: 'absolute',
                          width: `${gridWidth * 100}%`,
                          height: `${(instance.gridHeight || 1) * 100}%`,
                          left: `-${col * 100}%`,
                          top: `-${row * 100}%`,
                          objectFit: 'contain',
                          opacity: 0.6
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Grid size indicator */}
            <div style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              border: '1px solid #007acc'
            }}>
              {instance.gridWidth || 1}×{instance.gridHeight || 1} cells
            </div>
          </div>
          
          {/* Rotation handle only - no resize handles */}
          <ResizeHandle type="rotate" position="rotate" onMouseDown={handleTransformStart} />
        </>
      )}
    </div>
  )
}
