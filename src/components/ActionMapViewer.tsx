import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDrop } from 'react-dnd'
import type { MapData } from '../protocol'
import type { PendingCharacter } from '../store/dmGameStore'
import { useAssetStore } from '../store/assetStore'
import { renderTile, preloadAllTileImages } from '../utils/tileRenderer'
import type { Palette } from '../store'
import { computeVisibleTiles, parseTileKey } from '../utils/FOWCalculator'

interface ActionMapViewerProps {
  mapData: MapData
  onMoveCharacter?: (characterId: string, x: number, y: number) => void
  onPlaceCharacter?: (pendingCharacterId: string, x: number, y: number) => void
  selectedCharacterId?: string
  measurementSettings?: {
    gridSize: number
    distancePerCell: number
    units: string
  }
  fogOfWarEnabled?: boolean
}

interface ViewportState {
  x: number
  y: number
  scale: number
}

const TILE_SIZE = 32
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5.0

export function ActionMapViewer({ mapData, onMoveCharacter, onPlaceCharacter, selectedCharacterId, measurementSettings: propMeasurementSettings, fogOfWarEnabled }: ActionMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const assetStore = useAssetStore()
  
  // Set up drop target for pending characters
  const [{ isOver }, drop] = useDrop({
    accept: 'pending-character',
    drop: (item: { character: PendingCharacter }, monitor) => {
      console.log('🎯 Drop detected for character:', item.character.name)
      
      if (!onPlaceCharacter) {
        console.log('⚠️ No onPlaceCharacter handler provided')
        return
      }
      
      const clientOffset = monitor.getClientOffset()
      const canvas = canvasRef.current
      
      if (!clientOffset || !canvas) {
        console.log('⚠️ Missing client offset or canvas')
        return
      }
      
      const rect = canvas.getBoundingClientRect()
      const canvasX = clientOffset.x - rect.left
      const canvasY = clientOffset.y - rect.top
      
      // Convert screen coordinates to world coordinates
      const worldX = (canvasX - viewport.x) / viewport.scale
      const worldY = (canvasY - viewport.y) / viewport.scale
      
      // Convert to grid coordinates
      const gridX = Math.floor(worldX / TILE_SIZE)
      const gridY = Math.floor(worldY / TILE_SIZE)
      
      console.log('🗺 Calculated drop position:', {
        screen: { x: clientOffset.x, y: clientOffset.y },
        canvas: { x: canvasX, y: canvasY },
        world: { x: worldX, y: worldY },
        grid: { x: gridX, y: gridY }
      })
      
      // Check if placement is valid (not on a wall without an object/asset)
      const placementValid = isValidCharacterPlacement(gridX, gridY)
      const tileKey = `${gridX},${gridY}`
      const hasWallType = hasWallAtPosition(gridX, gridY)
      
      // Get tile types at this position for debugging
      const floorTileType = mapData.tiles.floor?.[tileKey] || 'none'
      const wallTileType = mapData.tiles.walls?.[tileKey] || 'none'
      const objectTileType = mapData.tiles.objects?.[tileKey] || 'none'
      
      console.log('🔍 Character placement validation:', {
        gridX, gridY,
        valid: placementValid,
        hasWallType,
        tileTypes: {
          floor: floorTileType,
          wall: wallTileType,
          object: objectTileType
        },
        hasObject: !!(mapData.tiles.objects && mapData.tiles.objects[tileKey]),
        hasAsset: !!(mapData.assetInstances && mapData.assetInstances.some(asset => asset.x === gridX && asset.y === gridY))
      })
      
      if (!placementValid) {
        console.log('❌ Invalid character placement: Cannot place character on wall tile without object/asset')
        return
      }
      
      // Place the character
      console.log('✅ Placing character:', item.character.name, 'at position:', gridX, gridY)
      onPlaceCharacter(item.character.id, gridX, gridY)
      return { success: true } // Return success result
    },
    hover: (item: { character: PendingCharacter }, monitor) => {
      // Optional: Add visual feedback during hover
      console.log('🔍 Hovering over drop zone with character:', item.character.name)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  })
  
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1.0
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingCharacter, setIsDraggingCharacter] = useState(false)
  const [draggedCharacter, setDraggedCharacter] = useState<string | null>(null)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; valid: boolean } | null>(null)

  // Use measurement settings from props, with fallback to defaults
  const measurementSettings = propMeasurementSettings || {
    gridSize: TILE_SIZE,
    distancePerCell: 5,
    units: 'ft'
  }

  // Measurement lines state - store grid distance instead of calculated distance
  const [measurementLines, setMeasurementLines] = useState<{
    id: string
    startX: number
    startY: number
    endX: number
    endY: number
    gridDistance: number // Distance in grid units, will be multiplied by distancePerCell
  }[]>([])
  const [isDrawingMeasurement, setIsDrawingMeasurement] = useState(false)
  const [currentMeasurement, setCurrentMeasurement] = useState<{
    startX: number
    startY: number
    endX: number
    endY: number
  } | null>(null)
  const [isMeasurementSummaryCollapsed, setIsMeasurementSummaryCollapsed] = useState(false)

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

  // Create a ref to track if a render is in progress
  const renderingRef = useRef(false)
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Persistent image cache to avoid reloading images on every render
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>())
  
  // Memoized FOW calculation for performance
  const fogOfWarData = useMemo(() => {
    if (!fogOfWarEnabled || !mapData.characters) {
      return { visibleTiles: new Set<string>(), characterVision: new Map<string, Set<string>>() }
    }
    return computeVisibleTiles(mapData, mapData.characters)
  }, [fogOfWarEnabled, mapData.characters, mapData.tiles.walls])
  
  const renderMap = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !mapData || renderingRef.current) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Prevent concurrent renders
    renderingRef.current = true
    
    try {
      // Clear canvas with parchment background
      ctx.fillStyle = '#fffef0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Add parchment texture pattern
      const patternCanvas = document.createElement('canvas')
      patternCanvas.width = 50
      patternCanvas.height = 50
      const patternCtx = patternCanvas.getContext('2d')
      if (patternCtx) {
        // Create a subtle noise pattern for parchment texture
        const imageData = patternCtx.createImageData(50, 50)
        const data = imageData.data
        
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 30 - 15
          const baseColor = 240 + noise
          data[i] = Math.max(220, Math.min(255, baseColor - 5))     // R
          data[i + 1] = Math.max(220, Math.min(255, baseColor - 15))  // G
          data[i + 2] = Math.max(220, Math.min(255, baseColor - 40))  // B
          data[i + 3] = 255 // A
        }
        
        patternCtx.putImageData(imageData, 0, 0)
        const pattern = ctx.createPattern(patternCanvas, 'repeat')
        if (pattern) {
          ctx.fillStyle = pattern
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
      
      // Save context for transformations
      ctx.save()
      
      // Apply viewport transformations
      ctx.translate(viewport.x, viewport.y)
      ctx.scale(viewport.scale, viewport.scale)
      
      // Render in proper layer order: floor -> objects -> walls -> assets
      
      // Render floor tiles
      if (mapData.tiles.floor) {
        for (const [key, tileType] of Object.entries(mapData.tiles.floor)) {
          const [x, y] = key.split(',').map(Number)
          const size = Math.ceil(TILE_SIZE * viewport.scale)
          
          // Use the proper tile renderer with textures
          const rendered = renderTile(
            ctx,
            tileType as Palette,
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE
          )
          
          // If image didn't render (not loaded), it falls back to color automatically
          if (!rendered) {
            // Add subtle border for fallback color tiles
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
      }
      
      // Render object tiles
      if (mapData.tiles.objects) {
        for (const [key, tileType] of Object.entries(mapData.tiles.objects)) {
          const [x, y] = key.split(',').map(Number)
          
          // Objects get a different color scheme
          ctx.fillStyle = '#8a6f3d' // Bronze/brown color for objects
          ctx.fillRect(
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          )
          
          // Add object border
          ctx.strokeStyle = '#d4a574'
          ctx.lineWidth = 1.5 / viewport.scale
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
          
          // Use the proper tile renderer with textures
          const rendered = renderTile(
            ctx,
            tileType as Palette,
            x * TILE_SIZE,
            y * TILE_SIZE,
            TILE_SIZE
          )
          
          // If image didn't render (not loaded), it falls back to color automatically
          if (!rendered) {
            // Add wall border for fallback color tiles
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
      }
      
      // Render assets using persistent cache
      if (mapData.assetInstances && mapData.assetInstances.length > 0) {
        const imageCache = imageCacheRef.current
        
        // Pre-load any missing images
        const loadPromises: Promise<void>[] = []
        
        for (const instance of mapData.assetInstances) {
          const asset = assetStore.getAssetById(instance.assetId)
          if (!asset || imageCache.has(asset.src)) continue
          
          const loadPromise = new Promise<void>((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
              imageCache.set(asset.src, img)
              resolve()
            }
            img.onerror = () => {
              console.warn(`Failed to load asset image: ${asset.src}`)
              reject(new Error(`Failed to load asset: ${asset.src}`))
            }
            img.src = asset.src
          })
          
          loadPromises.push(loadPromise)
        }
        
        // Wait for any new images to load
        if (loadPromises.length > 0) {
          await Promise.allSettled(loadPromises)
        }
        
        // Now render all assets using cached images
        for (const instance of mapData.assetInstances) {
          try {
            const asset = assetStore.getAssetById(instance.assetId)
            
            if (!asset) {
              console.warn(`Asset not found in store: ${instance.assetId}`)
              // Render a placeholder for missing assets
              ctx.fillStyle = '#ff6b6b'
              ctx.fillRect(
                instance.x * TILE_SIZE,
                instance.y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
              )
              ctx.strokeStyle = '#ff4444'
              ctx.lineWidth = 1 / viewport.scale
              ctx.strokeRect(
                instance.x * TILE_SIZE,
                instance.y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
              )
              continue
            }
            
            const img = imageCache.get(asset.src)
            if (!img) {
              // Render error placeholder
              ctx.fillStyle = '#ff9090'
              ctx.fillRect(
                instance.x * TILE_SIZE,
                instance.y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
              )
              continue
            }
            
            const width = (asset.gridWidth || 1) * TILE_SIZE
            const height = (asset.gridHeight || 1) * TILE_SIZE
            
            // Save context for rotation
            ctx.save()
            ctx.translate(
              instance.x * TILE_SIZE + width / 2,
              instance.y * TILE_SIZE + height / 2
            )
            ctx.rotate((instance.rotation * Math.PI) / 180)
            ctx.drawImage(
              img,
              -width / 2,
              -height / 2,
              width,
              height
            )
            ctx.restore()
          } catch (error) {
            console.warn(`Failed to render asset ${instance.id}:`, error)
            // Render error placeholder
            ctx.fillStyle = '#ff9090'
            ctx.fillRect(
              instance.x * TILE_SIZE,
              instance.y * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE
            )
          }
        }
      }
      
      // Render fog of war overlay after walls but before characters
      if (fogOfWarEnabled && mapData.characters && mapData.characters.length > 0) {
        const { visibleTiles } = fogOfWarData
        
        console.log('🌫️ FOW Debug - Characters:', mapData.characters.length)
        console.log('🌫️ FOW Debug - Visible tiles count:', visibleTiles.size)
        console.log('🌫️ FOW Debug - Wall tiles:', Object.keys(mapData.tiles.walls || {}).length)
        console.log('🌫️ FOW Debug - Floor tiles:', Object.keys(mapData.tiles.floor || {}).length)
        
        // Only render fog if there are actually areas to hide
        if (mapData.tiles.floor || mapData.tiles.objects) {
          ctx.save()
          
          // Set fog color - semi-transparent black
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)' // Semi-transparent black fog
          ctx.globalCompositeOperation = 'source-over' // Ensure we don't interfere with walls
          
          // Get all tiles and identify wall tiles by type (not just layer)
          const allTiles = [
            ...(mapData.tiles.floor ? Object.entries(mapData.tiles.floor) : []),
            ...(mapData.tiles.walls ? Object.entries(mapData.tiles.walls) : []),
            ...(mapData.tiles.objects ? Object.entries(mapData.tiles.objects) : [])
          ]
          
          // Separate tiles into wall tiles and non-wall tiles
          const wallTileKeys = new Set<string>()
          const nonWallTileKeys = new Set<string>()
          
          for (const [tileKey, tileType] of allTiles) {
            if (isWallTileType(tileType)) {
              wallTileKeys.add(tileKey)
            } else {
              nonWallTileKeys.add(tileKey)
            }
          }
          
          console.log('🌫️ FOW Debug - Wall-type tiles found:', wallTileKeys.size)
          console.log('🌫️ FOW Debug - Non-wall tiles to fog:', nonWallTileKeys.size)
          console.log('🌫️ FOW Debug - Wall tile keys:', Array.from(wallTileKeys).slice(0, 10))
          
          // Render fog ONLY on non-wall tiles that are not visible
          for (const tileKey of nonWallTileKeys) {
            if (!visibleTiles.has(tileKey)) {
              const { x, y } = parseTileKey(tileKey)
              
              ctx.fillRect(
                x * TILE_SIZE,
                y * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
              )
            }
          }
          
          ctx.restore()
        }
      }
      
      // Render character tokens
      if (mapData.characters && mapData.characters.length > 0) {
        for (const character of mapData.characters) {
          if (!character.isVisible) continue // Skip hidden characters
          
          const tokenSize = character.size * TILE_SIZE
          const tokenX = character.x * TILE_SIZE + (TILE_SIZE - tokenSize) / 2
          const tokenY = character.y * TILE_SIZE + (TILE_SIZE - tokenSize) / 2
          const centerX = tokenX + tokenSize / 2
          const centerY = tokenY + tokenSize / 2
          const radius = tokenSize / 2
          
          ctx.save()
          
          // Try to render character avatar if available
          let avatarRendered = false
          if (character.avatarAssetId) {
            const avatar = assetStore.getAssetById(character.avatarAssetId)
            if (avatar) {
              const imageCache = imageCacheRef.current
              const avatarImg = imageCache.get(avatar.src)
              if (!avatarImg) {
                // Try to load avatar image if not in cache
                const img = new Image()
                img.onload = () => {
                  imageCache.set(avatar.src, img)
                  // Trigger re-render after image loads
                  setTimeout(() => renderMap(), 50)
                }
                img.onerror = () => console.warn(`Failed to load avatar: ${avatar.src}`)
                img.src = avatar.src
              } else {
                // Draw avatar in a circular clipping path
                ctx.beginPath()
                ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2)
                ctx.clip()
                
                ctx.drawImage(
                  avatarImg,
                  tokenX + 3,
                  tokenY + 3,
                  tokenSize - 6,
                  tokenSize - 6
                )
                avatarRendered = true
              }
            }
          }
          
          // If no avatar or avatar failed to render, draw colored circle with initial
          if (!avatarRendered) {
            ctx.fillStyle = character.color
            ctx.beginPath()
            ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2)
            ctx.fill()
            
            // Character initials (2 letters)
            if (character.name && tokenSize > 16) {
              ctx.fillStyle = '#ffffff'
              ctx.font = `bold ${Math.max(8, tokenSize / 4)}px sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              
              // Get first 2 letters of name, or first letter + first letter of second word
              const words = character.name.trim().split(/\s+/)
              let initials = ''
              
              if (words.length >= 2) {
                // Multiple words: first letter of first two words
                initials = words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase()
              } else if (words[0].length >= 2) {
                // Single word with 2+ letters: first two letters
                initials = words[0].substring(0, 2).toUpperCase()
              } else {
                // Single letter: duplicate it
                initials = words[0].charAt(0).toUpperCase().repeat(2)
              }
              
              ctx.fillText(
                initials,
                centerX,
                centerY
              )
            }
          }
          
          ctx.restore()
          
          // Draw colored ring border around the token
          ctx.save()
          ctx.strokeStyle = character.color
          ctx.lineWidth = 4 / viewport.scale
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.stroke()
          
          // Add a subtle white outline to make the ring more visible
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1 / viewport.scale
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2)
          ctx.stroke()
          
          ctx.restore()
        }
      }
      
      // Render character placement tile overlay (during character dragging)
      if (hoveredTile && (isDraggingCharacter || isOver)) {
        ctx.save()
        
        const overlayColor = hoveredTile.valid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        const borderColor = hoveredTile.valid ? '#22c55e' : '#ef4444'
        
        // Fill the tile with color overlay
        ctx.fillStyle = overlayColor
        ctx.fillRect(
          hoveredTile.x * TILE_SIZE,
          hoveredTile.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
        
        // Draw border around the tile
        ctx.strokeStyle = borderColor
        ctx.lineWidth = 3 / viewport.scale
        ctx.strokeRect(
          hoveredTile.x * TILE_SIZE,
          hoveredTile.y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        )
        
        ctx.restore()
      }
      
      // Render measurement lines on top of everything else
      if (measurementLines.length > 0 || currentMeasurement) {
        ctx.save()
        
        // Render completed measurement lines
        for (const line of measurementLines) {
          ctx.strokeStyle = '#ff6b35'
          ctx.lineWidth = 3 / viewport.scale
          ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale])
          
          ctx.beginPath()
          ctx.moveTo(line.startX, line.startY)
          ctx.lineTo(line.endX, line.endY)
          ctx.stroke()
          
          // Draw start point
          ctx.fillStyle = '#ff6b35'
          ctx.setLineDash([]) // Reset line dash for solid circles
          ctx.beginPath()
          ctx.arc(line.startX, line.startY, 6 / viewport.scale, 0, Math.PI * 2)
          ctx.fill()
          
          // Draw start point border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / viewport.scale
          ctx.stroke()
          
          // Draw end point
          ctx.fillStyle = '#ff6b35'
          ctx.beginPath()
          ctx.arc(line.endX, line.endY, 6 / viewport.scale, 0, Math.PI * 2)
          ctx.fill()
          
          // Draw end point border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / viewport.scale
          ctx.stroke()
          
          // Draw distance label - calculate distance dynamically
          const midX = (line.startX + line.endX) / 2
          const midY = (line.startY + line.endY) / 2
          
          ctx.fillStyle = '#ff6b35'
          ctx.font = `bold ${14 / viewport.scale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          
          // Calculate distance using current settings
          const calculatedDistance = line.gridDistance * measurementSettings.distancePerCell
          const text = `${calculatedDistance.toFixed(1)} ${measurementSettings.units}`
          
          // Draw text background
          const textMetrics = ctx.measureText(text)
          const padding = 4 / viewport.scale
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(
            midX - textMetrics.width / 2 - padding,
            midY - 14 / viewport.scale - padding,
            textMetrics.width + 2 * padding,
            14 / viewport.scale + 2 * padding
          )
          
          // Draw text
          ctx.fillStyle = '#ff6b35'
          ctx.fillText(text, midX, midY)
        }
        
        // Render current measurement being drawn
        if (currentMeasurement) {
          ctx.strokeStyle = '#ff6b35'
          ctx.lineWidth = 3 / viewport.scale
          ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale])
          
          ctx.beginPath()
          ctx.moveTo(currentMeasurement.startX, currentMeasurement.startY)
          ctx.lineTo(currentMeasurement.endX, currentMeasurement.endY)
          ctx.stroke()
          
          // Draw start point for current measurement
          ctx.fillStyle = '#ff6b35'
          ctx.setLineDash([]) // Reset line dash for solid circles
          ctx.beginPath()
          ctx.arc(currentMeasurement.startX, currentMeasurement.startY, 6 / viewport.scale, 0, Math.PI * 2)
          ctx.fill()
          
          // Draw start point border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / viewport.scale
          ctx.stroke()
          
          // Draw end point for current measurement
          ctx.fillStyle = '#ff6b35'
          ctx.beginPath()
          ctx.arc(currentMeasurement.endX, currentMeasurement.endY, 6 / viewport.scale, 0, Math.PI * 2)
          ctx.fill()
          
          // Draw end point border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / viewport.scale
          ctx.stroke()
          
          // Calculate and show distance for current measurement
          const dx = (currentMeasurement.endX - currentMeasurement.startX) / measurementSettings.gridSize
          const dy = (currentMeasurement.endY - currentMeasurement.startY) / measurementSettings.gridSize
          const distance = Math.sqrt(dx * dx + dy * dy) * measurementSettings.distancePerCell
          
          const midX = (currentMeasurement.startX + currentMeasurement.endX) / 2
          const midY = (currentMeasurement.startY + currentMeasurement.endY) / 2
          
          ctx.fillStyle = '#ff6b35'
          ctx.font = `bold ${14 / viewport.scale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          
          const text = `${distance.toFixed(1)} ${measurementSettings.units}`
          
          // Draw text background
          const textMetrics = ctx.measureText(text)
          const padding = 4 / viewport.scale
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(
            midX - textMetrics.width / 2 - padding,
            midY - 14 / viewport.scale - padding,
            textMetrics.width + 2 * padding,
            14 / viewport.scale + 2 * padding
          )
          
          // Draw text
          ctx.fillStyle = '#ff6b35'
          ctx.fillText(text, midX, midY)
        }
        
        ctx.restore()
      }
      
      // Restore context
      ctx.restore()
    } finally {
      // Always reset the rendering flag
      renderingRef.current = false
    }
  }, [mapData, viewport, assetStore, measurementLines, currentMeasurement, measurementSettings, hoveredTile, isDraggingCharacter, isOver, fogOfWarEnabled, fogOfWarData])

  // Helper function to convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - viewport.x) / viewport.scale
    const y = (screenY - rect.top - viewport.y) / viewport.scale
    
    return { x, y }
  }, [viewport])

  // Helper function to check if a tile type is a wall
  const isWallTileType = useCallback((tileType: string) => {
    const wallTypes = [
      'wall', 'wall-brick', 'wall-stone', 'wall-wood',
      'wall-cave', 'wall-metal', 'wall-rough', 'wall-smooth'
    ]
    return wallTypes.some(wallType => tileType.includes(wallType))
  }, [])

  // Helper function to check if there's a wall at a grid position (checking all layers)
  const hasWallAtPosition = useCallback((gridX: number, gridY: number) => {
    const tileKey = `${gridX},${gridY}`
    
    // Check all tile layers for wall-type tiles
    const allTiles = [
      ...(mapData.tiles.floor ? Object.entries(mapData.tiles.floor) : []),
      ...(mapData.tiles.walls ? Object.entries(mapData.tiles.walls) : []),
      ...(mapData.tiles.objects ? Object.entries(mapData.tiles.objects) : [])
    ]
    
    for (const [key, tileType] of allTiles) {
      if (key === tileKey && isWallTileType(tileType)) {
        return true
      }
    }
    
    return false
  }, [mapData.tiles, isWallTileType])
  
  // Helper function to check if a grid position is valid for character placement
  const isValidCharacterPlacement = useCallback((gridX: number, gridY: number) => {
    const tileKey = `${gridX},${gridY}`
    
    // Check if there's a wall-type tile at this position (any layer)
    const hasWall = hasWallAtPosition(gridX, gridY)
    
    // If there's no wall, placement is always valid
    if (!hasWall) {
      return true
    }
    
    // If there's a wall, check if there's an object or asset on the same tile
    const hasObject = mapData.tiles.objects && mapData.tiles.objects[tileKey]
    const hasAsset = mapData.assetInstances && mapData.assetInstances.some(asset => 
      asset.x === gridX && asset.y === gridY
    )
    
    // Character can be placed on a wall only if there's an object or asset there
    return !!(hasObject || hasAsset)
  }, [hasWallAtPosition, mapData.tiles.objects, mapData.assetInstances])

  // Helper function to check if a point is inside a character token
  const getCharacterAtPoint = useCallback((worldX: number, worldY: number) => {
    if (!mapData.characters) return null
    
    for (const character of mapData.characters) {
      if (!character.isVisible) continue
      
      const tokenSize = character.size * TILE_SIZE
      const tokenX = character.x * TILE_SIZE + (TILE_SIZE - tokenSize) / 2
      const tokenY = character.y * TILE_SIZE + (TILE_SIZE - tokenSize) / 2
      const radius = tokenSize / 2
      const centerX = tokenX + radius
      const centerY = tokenY + radius
      
      // Check if point is within the circular token
      const distance = Math.sqrt(
        Math.pow(worldX - centerX, 2) + Math.pow(worldY - centerY, 2)
      )
      
      if (distance <= radius) {
        return character
      }
    }
    
    return null
  }, [mapData.characters])

  // Helper function to snap coordinates to grid centers
  const snapToGridCenter = useCallback((worldX: number, worldY: number) => {
    const gridX = Math.floor(worldX / measurementSettings.gridSize)
    const gridY = Math.floor(worldY / measurementSettings.gridSize)
    return {
      x: gridX * measurementSettings.gridSize + measurementSettings.gridSize / 2,
      y: gridY * measurementSettings.gridSize + measurementSettings.gridSize / 2
    }
  }, [measurementSettings.gridSize])

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    
    // Right mouse button (button 2) for measurement
    if (event.button === 2) {
      const worldPos = screenToWorld(event.clientX, event.clientY)
      const snappedPos = snapToGridCenter(worldPos.x, worldPos.y)
      
      setIsDrawingMeasurement(true)
      setCurrentMeasurement({
        startX: snappedPos.x,
        startY: snappedPos.y,
        endX: snappedPos.x,
        endY: snappedPos.y
      })
      return
    }
    
    // Middle mouse button (button 1) for map panning
    if (event.button === 1) {
      setIsDragging(true)
      setLastMouse({ x: event.clientX, y: event.clientY })
      return
    }
    
    // Left mouse button (button 0) for character interaction
    if (event.button === 0) {
      const worldPos = screenToWorld(event.clientX, event.clientY)
      const characterAtPoint = getCharacterAtPoint(worldPos.x, worldPos.y)
      
      if (characterAtPoint) {
        // Start dragging - character will move to tile under mouse cursor
        setIsDraggingCharacter(true)
        setDraggedCharacter(characterAtPoint.id)
        setLastMouse({ x: event.clientX, y: event.clientY })
        setDragOffset({ x: 0, y: 0 }) // No offset needed - mouse position determines tile
      }
      // If no character at point, do nothing
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDrawingMeasurement && currentMeasurement) {
      // Handle measurement drawing - update end position
      const worldPos = screenToWorld(event.clientX, event.clientY)
      const snappedPos = snapToGridCenter(worldPos.x, worldPos.y)
      
      setCurrentMeasurement(prev => prev ? {
        ...prev,
        endX: snappedPos.x,
        endY: snappedPos.y
      } : null)
    } else if (isDraggingCharacter && draggedCharacter && onMoveCharacter) {
      // Handle character dragging - mouse position determines tile placement
      const worldPos = screenToWorld(event.clientX, event.clientY)
      
      // Convert mouse world position directly to tile coordinates
      const tileX = Math.floor(worldPos.x / TILE_SIZE)
      const tileY = Math.floor(worldPos.y / TILE_SIZE)
      
      // Update hovered tile for visual feedback
      const isValid = isValidCharacterPlacement(tileX, tileY)
      setHoveredTile({ x: tileX, y: tileY, valid: isValid })
      
      // Check if the new position is valid for character placement
      if (!isValid) {
        // Don't move to invalid positions (walls without objects/assets)
        return
      }
      
      // Only update if position actually changed to avoid unnecessary re-renders
      const currentCharacter = mapData.characters?.find(c => c.id === draggedCharacter)
      if (currentCharacter && (currentCharacter.x !== tileX || currentCharacter.y !== tileY)) {
        onMoveCharacter(draggedCharacter, tileX, tileY)
      }
    } else if (isDragging) {
      // Handle map panning (middle mouse button only)
      const deltaX = event.clientX - lastMouse.x
      const deltaY = event.clientY - lastMouse.y
      
      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setLastMouse({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    if (isDrawingMeasurement && currentMeasurement && event.button === 2) {
      // Finish measurement drawing
      const dx = (currentMeasurement.endX - currentMeasurement.startX) / measurementSettings.gridSize
      const dy = (currentMeasurement.endY - currentMeasurement.startY) / measurementSettings.gridSize
      const gridDistance = Math.sqrt(dx * dx + dy * dy)
      
      // Only add if the line has some length
      if (gridDistance > 0.1) {
        const newLine = {
          id: Date.now().toString(),
          startX: currentMeasurement.startX,
          startY: currentMeasurement.startY,
          endX: currentMeasurement.endX,
          endY: currentMeasurement.endY,
          gridDistance
        }
        
        setMeasurementLines(prev => [...prev, newLine])
      }
      
      setIsDrawingMeasurement(false)
      setCurrentMeasurement(null)
      return
    }
    
    if (isDraggingCharacter && draggedCharacter) {
      // Finish character drag
      setIsDraggingCharacter(false)
      setDraggedCharacter(null)
      setDragOffset({ x: 0, y: 0 })
      setHoveredTile(null) // Clear hover state
    }
    
    setIsDragging(false)
  }

  const handleWheel = useCallback((event: WheelEvent) => {
    // Don't zoom while dragging a character
    if (isDraggingCharacter) {
      event.preventDefault()
      return
    }
    
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
  }, [viewport, isDraggingCharacter])

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

  // Handle canvas resize with improved debouncing
  useEffect(() => {
    let resizeTimeoutRef: NodeJS.Timeout | null = null
    let renderTimeoutRef: NodeJS.Timeout | null = null
    
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      
      const rect = container.getBoundingClientRect()
      
      // Only resize if dimensions actually changed significantly (avoid micro-changes)
      const newWidth = Math.floor(rect.width)
      const newHeight = Math.floor(rect.height)
      const currentWidth = canvas.width
      const currentHeight = canvas.height
      
      if (Math.abs(newWidth - currentWidth) > 2 || Math.abs(newHeight - currentHeight) > 2) {
        canvas.width = newWidth
        canvas.height = newHeight
        
        // Render immediately after resize to prevent black canvas
        renderMap()
      }
    }
    
    const debouncedResize = () => {
      // Clear any existing timeout
      if (resizeTimeoutRef) {
        clearTimeout(resizeTimeoutRef)
      }
      
      // Debounce the resize to prevent multiple rapid calls
      resizeTimeoutRef = setTimeout(() => {
        resizeCanvas()
      }, 16) // Shorter debounce for better responsiveness
    }
    
    // Initial resize
    resizeCanvas()
    
    // Use ResizeObserver for better container size tracking
    let resizeObserver: ResizeObserver | null = null
    
    if (containerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(debouncedResize)
      resizeObserver.observe(containerRef.current)
    } else {
      // Fallback to window resize
      window.addEventListener('resize', debouncedResize)
    }
    
    return () => {
      if (resizeTimeoutRef) {
        clearTimeout(resizeTimeoutRef)
      }
      if (renderTimeoutRef) {
        clearTimeout(renderTimeoutRef)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', debouncedResize)
      }
    }
  }, [renderMap]) // Re-add renderMap dependency since we need it for immediate render

  // Auto-fit map on initial load only (not on resize)
  const [hasAutoFitted, setHasAutoFitted] = useState(false)
  
  useEffect(() => {
    // Only auto-fit once when map data first loads
    if (!hasAutoFitted && mapData && mapData.tiles && Object.keys(mapData.tiles.floor || {}).length > 0) {
      // Don't auto-fit if we're currently dragging a character
      if (isDraggingCharacter) return
      
      const timer = setTimeout(() => {
        handleResetView()
        setHasAutoFitted(true)
      }, 200) // Slightly longer delay to ensure everything is ready
      
      return () => clearTimeout(timer)
    }
  }, [mapData, hasAutoFitted, isDraggingCharacter]) // Only run when map data changes or auto-fit status changes

  // Set up native wheel event listener to avoid passive event listener issues
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Add wheel event listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Backtick key to clear measurements
      if (event.key === '`') {
        event.preventDefault()
        setMeasurementLines([])
        setCurrentMeasurement(null)
        setIsDrawingMeasurement(false)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Preload tile images on component mount
  useEffect(() => {
    preloadAllTileImages().catch(err => {
      console.warn('Failed to preload some tile images:', err)
    })
  }, [])

  // Re-render when viewport changes
  useEffect(() => {
    // Clear any pending render
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current)
    }
    
    // Always render immediately - the renderingRef prevents concurrent renders
    renderMap()
    
    // Cleanup timeout on unmount
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current)
      }
    }
  }, [renderMap])

    // Add custom drop event listener for native drag in desktop mode
    useEffect(() => {
      const handleCustomDrop = (e: CustomEvent) => {
        console.log('🎯 Custom drop event received:', e.detail)
        
        if (!onPlaceCharacter) {
          console.log('⚠️ No onPlaceCharacter handler provided')
          return
        }
        
        const { character, clientX, clientY } = e.detail
        const canvas = canvasRef.current
        
        if (!canvas) {
          console.log('⚠️ No canvas found')
          return
        }
        
        const rect = canvas.getBoundingClientRect()
        const canvasX = clientX - rect.left
        const canvasY = clientY - rect.top
        
        // Convert screen coordinates to world coordinates
        const worldX = (canvasX - viewport.x) / viewport.scale
        const worldY = (canvasY - viewport.y) / viewport.scale
        
        // Convert to grid coordinates
        const gridX = Math.floor(worldX / TILE_SIZE)
        const gridY = Math.floor(worldY / TILE_SIZE)
        
        console.log('🗺 Custom drop calculated position:', {
          screen: { x: clientX, y: clientY },
          canvas: { x: canvasX, y: canvasY },
          world: { x: worldX, y: worldY },
          grid: { x: gridX, y: gridY }
        })
        
        // Check if placement is valid
        if (!isValidCharacterPlacement(gridX, gridY)) {
          console.log('❌ Invalid character placement at custom drop location')
          return
        }
        
        // Place the character
        console.log('✅ Placing character from custom drop:', character.name, 'at position:', gridX, gridY)
        onPlaceCharacter(character.id, gridX, gridY)
      }
      
      const container = containerRef.current
      if (container) {
        container.addEventListener('character-drop', handleCustomDrop as EventListener)
        return () => {
          container.removeEventListener('character-drop', handleCustomDrop as EventListener)
        }
      }
    }, [onPlaceCharacter, viewport, isValidCharacterPlacement])
    
    return (
    <div 
      ref={(el) => {
        containerRef.current = el;
        drop(el);
      }}
      data-drop-zone="map"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        cursor: isDraggingCharacter ? 'grabbing' : (isDragging ? 'grabbing' : 'default'),
        backgroundColor: isOver ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
        border: isOver ? '2px dashed #22c55e' : 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />

      
      {/* Measurement summary panel */}
      {measurementLines.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          color: '#e6edf3',
          minWidth: '200px',
          maxWidth: '300px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h3 style={{
              margin: '0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#f0f6fc'
            }}>Measurements</h3>
            
            <button
              onClick={() => setIsMeasurementSummaryCollapsed(!isMeasurementSummaryCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7d8590',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isMeasurementSummaryCollapsed ? "Expand summary" : "Collapse summary"}
            >
              {isMeasurementSummaryCollapsed ? '▶' : '▼'}
            </button>
          </div>
          
          {!isMeasurementSummaryCollapsed && (
            <>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                marginBottom: '8px'
              }}>
                {measurementLines.map((line, index) => {
                  const calculatedDistance = line.gridDistance * measurementSettings.distancePerCell
                  return (
                    <div key={line.id} style={{
                      fontSize: '12px',
                      color: '#7d8590',
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Line {index + 1}:</span>
                      <span style={{ color: '#ff6b35' }}>
                        {calculatedDistance.toFixed(1)} {measurementSettings.units}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              <div style={{
                borderTop: '1px solid #30363d',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: '600'
              }}>
                <span>Total Distance:</span>
                <span style={{ color: '#ff6b35' }}>
                  {measurementLines.reduce((sum, line) => sum + (line.gridDistance * measurementSettings.distancePerCell), 0).toFixed(1)} {measurementSettings.units}
                </span>
              </div>
              
              <div style={{
                fontSize: '10px',
                color: '#888',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Press ` to clear all
              </div>
            </>
          )}
        </div>
      )}
      
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
          Left: Move chars<br/>Middle: Pan<br/>Right: Measure<br/>Scroll: Zoom<br/>`: Clear measures
        </div>
      </div>
    </div>
  )
}
