import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { MapData } from '../protocol'

interface ActionMapViewerProps {
  mapData: MapData
}

interface ViewportState {
  x: number
  y: number
  scale: number
}

const TILE_SIZE = 32
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5.0

export function ActionMapViewer({ mapData }: ActionMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1.0
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })

  // Simple tile colors for rendering (since we don't have tile images in Action mode)
  const getTileColor = (tileType: string): string => {
    switch (tileType) {
      case 'grass': return '#4a7c59'
      case 'floor-stone-rough': return '#8b9dc3'
      case 'floor-stone-smooth': return '#a8b5d1'
      case 'floor-wood-planks': return '#8b6914'
      case 'floor-cobblestone': return '#6b7280'
      case 'wall': return '#4b5563'
      case 'wall-brick': return '#7c2d12'
      case 'wall-stone': return '#64748b'
      case 'wall-wood': return '#92400e'
      default: return '#6b7280'
    }
  }

  const renderMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Save context for transformations
    ctx.save()
    
    // Apply viewport transformations
    ctx.translate(viewport.x, viewport.y)
    ctx.scale(viewport.scale, viewport.scale)
    
    // Render floor tiles
    if (mapData.tiles.floor) {
      for (const [key, tileType] of Object.entries(mapData.tiles.floor)) {
        const [x, y] = key.split(',').map(Number)
        
        ctx.fillStyle = getTileColor(tileType as string)
        ctx.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
        
        // Add subtle border
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 1 / viewport.scale
        ctx.strokeRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
      }
    }
    
    // Render wall tiles
    if (mapData.tiles.walls) {
      for (const [key, tileType] of Object.entries(mapData.tiles.walls)) {
        const [x, y] = key.split(',').map(Number)
        
        ctx.fillStyle = getTileColor(tileType as string)
        ctx.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
        
        // Add wall border
        ctx.strokeStyle = '#1f2937'
        ctx.lineWidth = 2 / viewport.scale
        ctx.strokeRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
      }
    }
    
    // Restore context
    ctx.restore()
  }, [mapData, viewport])

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true)
    setLastMouse({ x: event.clientX, y: event.clientY })
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = event.clientX - lastMouse.x
    const deltaY = event.clientY - lastMouse.y
    
    setViewport(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))
    
    setLastMouse({ x: event.clientX, y: event.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.scale * zoomFactor))
    
    // Zoom towards mouse position
    const scaleChange = newScale / viewport.scale
    const newX = mouseX - (mouseX - viewport.x) * scaleChange
    const newY = mouseY - (mouseY - viewport.y) * scaleChange
    
    setViewport({
      x: newX,
      y: newY,
      scale: newScale
    })
  }

  const handleResetView = () => {
    if (!canvasRef.current || !mapData) return
    
    // Calculate map bounds
    const allKeys = [
      ...Object.keys(mapData.tiles.floor || {}),
      ...Object.keys(mapData.tiles.walls || {})
    ]
    
    if (allKeys.length === 0) return
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    for (const key of allKeys) {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    
    const mapWidth = (maxX - minX + 1) * TILE_SIZE
    const mapHeight = (maxY - minY + 1) * TILE_SIZE
    
    const canvas = canvasRef.current
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    const scaleX = canvasWidth / mapWidth
    const scaleY = canvasHeight / mapHeight
    const scale = Math.min(scaleX, scaleY, 1.0) * 0.8 // Leave some padding
    
    const centerX = (minX + maxX) / 2 * TILE_SIZE
    const centerY = (minY + maxY) / 2 * TILE_SIZE
    
    const viewportX = canvasWidth / 2 - centerX * scale
    const viewportY = canvasHeight / 2 - centerY * scale
    
    setViewport({
      x: viewportX,
      y: viewportY,
      scale
    })
  }

  // Handle canvas resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Trigger re-render
      renderMap()
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [renderMap])

  // Auto-fit map on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      handleResetView()
    }, 100) // Small delay to ensure canvas is ready
    
    return () => clearTimeout(timer)
  }, [mapData])

  // Re-render when viewport changes
  useEffect(() => {
    renderMap()
  }, [renderMap])

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      
      {/* Navigation controls overlay */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#161b22',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #30363d'
      }}>
        <button
          onClick={handleResetView}
          style={{
            padding: '8px 12px',
            backgroundColor: '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Fit map to view"
        >
          🎯 Fit View
        </button>
        
        <div style={{
          fontSize: '11px',
          color: '#7d8590',
          textAlign: 'center'
        }}>
          Zoom: {Math.round(viewport.scale * 100)}%
        </div>
        
        <div style={{
          fontSize: '10px',
          color: '#6e7681',
          textAlign: 'center',
          maxWidth: '120px'
        }}>
          Drag to pan<br/>Scroll to zoom
        </div>
      </div>
    </div>
  )
}
