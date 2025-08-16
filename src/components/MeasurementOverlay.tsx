import React, { useState, useCallback, useEffect } from 'react'

interface MeasurementLine {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  distance: number
}

interface MeasurementOverlayProps {
  viewport: {
    x: number
    y: number
    scale: number
  }
  canvasWidth: number
  canvasHeight: number
  gridSize: number // pixels per grid cell
  distancePerCell: number // real-world distance per cell (e.g., 5 for 5ft)
  units: string // e.g., "ft"
}

export function MeasurementOverlay({ 
  viewport, 
  canvasWidth, 
  canvasHeight,
  gridSize = 32,
  distancePerCell = 5,
  units = "ft"
}: MeasurementOverlayProps) {
  const [lines, setLines] = useState<MeasurementLine[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLine, setCurrentLine] = useState<{
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - viewport.x) / viewport.scale,
      y: (screenY - viewport.y) / viewport.scale
    }
  }, [viewport])

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX * viewport.scale + viewport.x,
      y: worldY * viewport.scale + viewport.y
    }
  }, [viewport])

  // Snap to grid center
  const snapToGrid = useCallback((worldX: number, worldY: number) => {
    const gridX = Math.floor(worldX / gridSize)
    const gridY = Math.floor(worldY / gridSize)
    return {
      x: gridX * gridSize + gridSize / 2,
      y: gridY * gridSize + gridSize / 2
    }
  }, [gridSize])

  // Calculate distance in real-world units
  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) / gridSize
    const dy = (y2 - y1) / gridSize
    const gridDistance = Math.sqrt(dx * dx + dy * dy)
    return gridDistance * distancePerCell
  }, [gridSize, distancePerCell])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only respond to right-click
    if (e.button !== 2) return
    
    e.preventDefault()
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = screenToWorld(screenX, screenY)
    const snappedPos = snapToGrid(worldPos.x, worldPos.y)

    setIsDrawing(true)
    setCurrentLine({
      startX: snappedPos.x,
      startY: snappedPos.y,
      endX: snappedPos.x,
      endY: snappedPos.y
    })
  }, [screenToWorld, snapToGrid])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentLine) return

    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = screenToWorld(screenX, screenY)
    const snappedPos = snapToGrid(worldPos.x, worldPos.y)

    setCurrentLine(prev => prev ? {
      ...prev,
      endX: snappedPos.x,
      endY: snappedPos.y
    } : null)
  }, [isDrawing, currentLine, screenToWorld, snapToGrid])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentLine || e.button !== 2) return

    e.preventDefault()
    e.stopPropagation()

    const distance = calculateDistance(
      currentLine.startX, currentLine.startY,
      currentLine.endX, currentLine.endY
    )

    // Only add line if it has meaningful distance
    if (distance > 0.1) {
      const newLine: MeasurementLine = {
        id: crypto.randomUUID(),
        startX: currentLine.startX,
        startY: currentLine.startY,
        endX: currentLine.endX,
        endY: currentLine.endY,
        distance
      }
      setLines(prev => [...prev, newLine])
    }

    setIsDrawing(false)
    setCurrentLine(null)
  }, [isDrawing, currentLine, calculateDistance])

  // Clear all measurements with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault()
        setLines([])
        setCurrentLine(null)
        setIsDrawing(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const formatDistance = (distance: number) => distance.toFixed(1)

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none', // Let events pass through by default
        zIndex: 10
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Invisible overlay that only captures right-click events */}
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill="transparent"
        style={{ pointerEvents: 'auto' }} // Only this rect captures events
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      {/* Render completed measurement lines */}
      {lines.map((line) => {
        const start = worldToScreen(line.startX, line.startY)
        const end = worldToScreen(line.endX, line.endY)
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2

        return (
          <g key={line.id}>
            {/* Measurement line */}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#ffd700"
              strokeWidth={Math.max(2, 3 / viewport.scale)}
              strokeDasharray="8,4"
              opacity={0.9}
            />
            
            {/* Start point */}
            <circle
              cx={start.x}
              cy={start.y}
              r={Math.max(3, 4 / viewport.scale)}
              fill="#22c55e"
              stroke="#ffffff"
              strokeWidth={Math.max(1, 1.5 / viewport.scale)}
              opacity={0.9}
            />
            
            {/* End point */}
            <circle
              cx={end.x}
              cy={end.y}
              r={Math.max(3, 4 / viewport.scale)}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={Math.max(1, 1.5 / viewport.scale)}
              opacity={0.9}
            />
            
            {/* Distance label */}
            <g>
              <rect
                x={midX - 35}
                y={midY - 20}
                width={70}
                height={18}
                fill="rgba(0, 0, 0, 0.8)"
                stroke="#ffd700"
                strokeWidth={1}
                rx={3}
                ry={3}
                opacity={0.9}
              />
              <text
                x={midX}
                y={midY - 7}
                fill="#ffd700"
                fontSize={Math.max(11, 12 / viewport.scale)}
                fontWeight="600"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {formatDistance(line.distance)} {units}
              </text>
            </g>
          </g>
        )
      })}

      {/* Render current line being drawn */}
      {isDrawing && currentLine && (
        <g>
          <line
            x1={worldToScreen(currentLine.startX, currentLine.startY).x}
            y1={worldToScreen(currentLine.startX, currentLine.startY).y}
            x2={worldToScreen(currentLine.endX, currentLine.endY).x}
            y2={worldToScreen(currentLine.endX, currentLine.endY).y}
            stroke="#60a5fa"
            strokeWidth={Math.max(2, 3 / viewport.scale)}
            strokeDasharray="4,2"
            opacity={0.8}
          />
          
          <circle
            cx={worldToScreen(currentLine.startX, currentLine.startY).x}
            cy={worldToScreen(currentLine.startX, currentLine.startY).y}
            r={Math.max(3, 4 / viewport.scale)}
            fill="#22c55e"
            stroke="#ffffff"
            strokeWidth={Math.max(1, 1.5 / viewport.scale)}
            opacity={0.9}
          />
          
          <circle
            cx={worldToScreen(currentLine.endX, currentLine.endY).x}
            cy={worldToScreen(currentLine.endX, currentLine.endY).y}
            r={Math.max(3, 4 / viewport.scale)}
            fill="#60a5fa"
            stroke="#ffffff"
            strokeWidth={Math.max(1, 1.5 / viewport.scale)}
            opacity={0.9}
          />
          
          {/* Preview distance */}
          {(() => {
            const start = worldToScreen(currentLine.startX, currentLine.startY)
            const end = worldToScreen(currentLine.endX, currentLine.endY)
            const midX = (start.x + end.x) / 2
            const midY = (start.y + end.y) / 2
            const distance = calculateDistance(currentLine.startX, currentLine.startY, currentLine.endX, currentLine.endY)
            
            return (
              <text
                x={midX}
                y={midY - 8}
                fill="#60a5fa"
                fontSize={Math.max(10, 11 / viewport.scale)}
                fontWeight="600"
                textAnchor="middle"
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              >
                {formatDistance(distance)} {units}
              </text>
            )
          })()}
        </g>
      )}
    </svg>
  )
}
