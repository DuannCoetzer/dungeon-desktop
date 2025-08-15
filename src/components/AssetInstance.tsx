import React from 'react'
import { useMapStore } from '../mapStore'
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
  // screenToTile,
  scale,
  // tileSize,
}: AssetInstanceComponentProps) {
  const { selectedAssetInstances, selectAssetInstance, updateAssetInstance, deleteAssetInstance } = useMapStore()
  const isSelected = selectedAssetInstances.includes(instance.id)

  const { sx, sy } = worldToScreen(instance.x, instance.y)
  const displayWidth = instance.width * scale
  const displayHeight = instance.height * scale

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSelected) {
      selectAssetInstance(instance.id)
    }
  }

  const handleTransformStart = (e: React.MouseEvent, type: string, position: string) => {
    e.stopPropagation()
    
    const startX = e.clientX
    // const startY = e.clientY
    const startInstance = { ...instance }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      // const deltaY = moveEvent.clientY - startY

      if (type === 'resize') {
        const aspectRatio = startInstance.width / startInstance.height
        let newWidth = startInstance.width
        let newHeight = startInstance.height

        // Calculate new size based on handle position
        switch (position) {
          case 'se':
            newWidth = Math.max(8, startInstance.width + deltaX / scale)
            newHeight = newWidth / aspectRatio
            break
          case 'nw':
            newWidth = Math.max(8, startInstance.width - deltaX / scale)
            newHeight = newWidth / aspectRatio
            updateAssetInstance(instance.id, {
              x: startInstance.x + (startInstance.width - newWidth),
              y: startInstance.y + (startInstance.height - newHeight),
              width: newWidth,
              height: newHeight,
            })
            return
          case 'ne':
            newWidth = Math.max(8, startInstance.width + deltaX / scale)
            newHeight = newWidth / aspectRatio
            updateAssetInstance(instance.id, {
              y: startInstance.y + (startInstance.height - newHeight),
              width: newWidth,
              height: newHeight,
            })
            return
          case 'sw':
            newWidth = Math.max(8, startInstance.width - deltaX / scale)
            newHeight = newWidth / aspectRatio
            updateAssetInstance(instance.id, {
              x: startInstance.x + (startInstance.width - newWidth),
              width: newWidth,
              height: newHeight,
            })
            return
          case 'e':
            newWidth = Math.max(8, startInstance.width + deltaX / scale)
            newHeight = newWidth / aspectRatio
            break
          case 'w':
            newWidth = Math.max(8, startInstance.width - deltaX / scale)
            newHeight = newWidth / aspectRatio
            updateAssetInstance(instance.id, {
              x: startInstance.x + (startInstance.width - newWidth),
              width: newWidth,
              height: newHeight,
            })
            return
        }

        updateAssetInstance(instance.id, { width: newWidth, height: newHeight })
      } else if (type === 'rotate') {
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
        cursor: 'pointer',
        zIndex: 100,
      }}
      onClick={handleSelect}
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
          {/* Resize handles */}
          <ResizeHandle type="resize" position="nw" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="ne" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="sw" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="se" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="n" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="s" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="w" onMouseDown={handleTransformStart} />
          <ResizeHandle type="resize" position="e" onMouseDown={handleTransformStart} />
          
          {/* Rotation handle */}
          <ResizeHandle type="rotate" position="rotate" onMouseDown={handleTransformStart} />
        </>
      )}
    </div>
  )
}
