import { useMapStore } from '../mapStore'
import { setTile, eraseTile } from '../protocol'
import type { Palette, Layer } from '../store'
import { getWallForFloor } from './wallSelection'

// Helper to check if a tile is a floor tile
export function isFloorTile(palette: Palette): boolean {
  return palette === 'grass' || 
         palette === 'floor-stone-rough' || 
         palette === 'floor-stone-smooth' || 
         palette === 'floor-wood-planks' || 
         palette === 'floor-cobblestone'
}

// Helper to check if a tile is a wall tile
export function isWallTile(palette: Palette): boolean {
  return palette === 'wall' ||
         palette === 'wall-brick' ||
         palette === 'wall-stone' ||
         palette === 'wall-wood'
}

// Get tile at position (returns undefined if empty)
function getTileAt(x: number, y: number, layer: Layer): Palette | undefined {
  const mapData = useMapStore.getState().mapData
  const key = `${x},${y}`
  return mapData.tiles[layer][key] as Palette
}

// Check if a position is empty (no floor or wall)
function isEmpty(x: number, y: number): boolean {
  const floorTile = getTileAt(x, y, 'floor')
  const wallTile = getTileAt(x, y, 'walls')
  return !floorTile && !wallTile
}

// Check if a position is suitable for wall placement (empty or has existing wall)
function canPlaceWall(x: number, y: number): boolean {
  const floorTile = getTileAt(x, y, 'floor')
  return !floorTile // Can place wall if there's no floor (regardless of existing walls)
}

// Get all connected floor positions using flood fill
function getConnectedFloorPositions(startX: number, startY: number): Set<string> {
  const visited = new Set<string>()
  const queue = [{x: startX, y: startY}]
  const floorPositions = new Set<string>()
  
  while (queue.length > 0) {
    const pos = queue.shift()!
    const key = `${pos.x},${pos.y}`
    
    if (visited.has(key)) continue
    visited.add(key)
    
    // Check if this position has a floor
    if (hasFloor(pos.x, pos.y)) {
      floorPositions.add(key)
      
      // Add adjacent positions to queue
      const adjacent = getAdjacentPositions(pos.x, pos.y)
      for (const adjPos of adjacent) {
        const adjKey = `${adjPos.x},${adjPos.y}`
        if (!visited.has(adjKey)) {
          queue.push(adjPos)
        }
      }
    }
  }
  
  return floorPositions
}

// Check if a position has a floor tile
function hasFloor(x: number, y: number): boolean {
  const floorTile = getTileAt(x, y, 'floor')
  return floorTile ? isFloorTile(floorTile) : false
}

// Remove a tile from a layer
function removeTile(layer: Layer, x: number, y: number): void {
  eraseTile(layer, x, y)
}

// Get all adjacent positions (4-directional)
function getAdjacentPositions(x: number, y: number): Array<{x: number, y: number}> {
  return [
    { x: x - 1, y }, // Left
    { x: x + 1, y }, // Right
    { x, y: y - 1 }, // Up
    { x, y: y + 1 }, // Down
  ]
}

// Get all surrounding positions (8-directional) for surrounding mode
function getSurroundingPositions(x: number, y: number): Array<{x: number, y: number}> {
  return [
    { x: x - 1, y: y - 1 }, // Top-left
    { x, y: y - 1 },        // Top
    { x: x + 1, y: y - 1 }, // Top-right
    { x: x - 1, y },        // Left
    { x: x + 1, y },        // Right
    { x: x - 1, y: y + 1 }, // Bottom-left
    { x, y: y + 1 },        // Bottom
    { x: x + 1, y: y + 1 }, // Bottom-right
  ]
}

// Place walls around a single floor tile
export function placeWallsAroundFloor(
  floorX: number, 
  floorY: number, 
  wallType: Palette = 'wall',
  placement: 'adjacent' | 'surrounding' = 'adjacent'
): void {
  if (!isWallTile(wallType)) {
    console.warn(`Invalid wall type: ${wallType}`)
    return
  }

  const positions = placement === 'surrounding' 
    ? getSurroundingPositions(floorX, floorY)
    : getAdjacentPositions(floorX, floorY)

  for (const pos of positions) {
    // Only place walls in empty spots (no floor and no existing wall)
    if (isEmpty(pos.x, pos.y)) {
      setTile('walls', pos.x, pos.y, wallType)
    }
  }
}

// Place walls around multiple floor tiles (for shape tools)
export function placeWallsAroundFloors(
  floorPositions: Array<{x: number, y: number}>,
  wallType: Palette = 'wall',
  placement: 'adjacent' | 'surrounding' = 'adjacent'
): void {
  if (!isWallTile(wallType)) {
    console.warn(`Invalid wall type: ${wallType}`)
    return
  }

  // Create a set of floor positions for quick lookup
  const floorSet = new Set(floorPositions.map(pos => `${pos.x},${pos.y}`))
  
  // Collect all potential wall positions
  const wallPositions = new Set<string>()
  
  for (const floorPos of floorPositions) {
    const positions = placement === 'surrounding'
      ? getSurroundingPositions(floorPos.x, floorPos.y)
      : getAdjacentPositions(floorPos.x, floorPos.y)
    
    for (const pos of positions) {
      const posKey = `${pos.x},${pos.y}`
      // Only add if it's not a floor position and is empty
      if (!floorSet.has(posKey) && isEmpty(pos.x, pos.y)) {
        wallPositions.add(posKey)
      }
    }
  }
  
  // Place walls at all collected positions
  for (const posKey of wallPositions) {
    const [x, y] = posKey.split(',').map(Number)
    setTile('walls', x, y, wallType)
  }
}

// Auto-wall placement for a single tile placement
export function autoPlaceWallsForTile(
  x: number,
  y: number,
  tileType: Palette,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled and the tile is a floor tile
  if (!autoWallSettings.enabled || !isFloorTile(tileType)) {
    return
  }
  
  // Validate wall type
  if (!isWallTile(autoWallSettings.defaultWallType as Palette)) {
    console.warn(`Invalid auto-wall type: ${autoWallSettings.defaultWallType}`)
    return
  }
  
  placeWallsAroundFloor(
    x, 
    y, 
    autoWallSettings.defaultWallType as Palette, 
    autoWallSettings.placement
  )
}

// Auto-wall placement for multiple tiles (for shape tools)
export function autoPlaceWallsForTiles(
  positions: Array<{x: number, y: number, tileType: Palette}>,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled
  if (!autoWallSettings.enabled) {
    return
  }
  
  // Filter to only floor tiles
  const floorPositions = positions.filter(pos => isFloorTile(pos.tileType))
  
  if (floorPositions.length === 0) {
    return
  }
  
  // Validate wall type
  if (!isWallTile(autoWallSettings.defaultWallType as Palette)) {
    console.warn(`Invalid auto-wall type: ${autoWallSettings.defaultWallType}`)
    return
  }
  
  placeWallsAroundFloors(
    floorPositions,
    autoWallSettings.defaultWallType as Palette,
    autoWallSettings.placement
  )
}

// Smart auto-wall placement that chooses wall type based on floor type
export function smartAutoPlaceWallsForTile(
  x: number,
  y: number,
  tileType: Palette,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled and the tile is a floor tile
  if (!autoWallSettings.enabled || !isFloorTile(tileType)) {
    return
  }
  
  // Use smart wall selection to pick the best wall type for this floor
  const smartWallType = getWallForFloor(tileType, autoWallSettings.defaultWallType)
  
  placeWallsAroundFloor(
    x, 
    y, 
    smartWallType, 
    autoWallSettings.placement
  )
}

// Smart auto-wall placement for multiple tiles with intelligent wall selection
export function smartAutoPlaceWallsForTiles(
  positions: Array<{x: number, y: number, tileType: Palette}>,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled
  if (!autoWallSettings.enabled) {
    return
  }
  
  // Filter to only floor tiles
  const floorPositions = positions.filter(pos => isFloorTile(pos.tileType))
  
  if (floorPositions.length === 0) {
    return
  }
  
  // Group floor positions by their tile type for smart wall selection
  const floorGroups = floorPositions.reduce((groups, pos) => {
    const group = groups[pos.tileType] || []
    group.push(pos)
    groups[pos.tileType] = group
    return groups
  }, {} as Record<string, Array<{x: number, y: number, tileType: Palette}>>)
  
  // Process each floor type group with its appropriate wall type
  for (const [floorType, positions] of Object.entries(floorGroups)) {
    const smartWallType = getWallForFloor(floorType as Palette, autoWallSettings.defaultWallType)
    
    placeWallsAroundFloors(
      positions,
      smartWallType,
      autoWallSettings.placement
    )
  }
}

// Enhanced smart auto-wall placement that creates complete boundaries around connected floor areas
export function enhancedSmartAutoPlaceWallsForTile(
  x: number,
  y: number,
  tileType: Palette,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled and the tile is a floor tile
  if (!autoWallSettings.enabled || !isFloorTile(tileType)) {
    return
  }
  
  // If placing a floor where there's already a wall, remove the wall first
  const existingWall = getTileAt(x, y, 'walls')
  if (existingWall && isWallTile(existingWall)) {
    removeTile('walls', x, y) // Remove the wall
  }
  
  // Get all connected floor positions including the new one
  const connectedFloors = getConnectedFloorPositions(x, y)
  
  // Convert to position array for wall placement
  const floorPositions = Array.from(connectedFloors).map(key => {
    const [fx, fy] = key.split(',').map(Number)
    return { x: fx, y: fy }
  })
  
  // Use smart wall selection to pick the best wall type for this floor
  const smartWallType = getWallForFloor(tileType, autoWallSettings.defaultWallType)
  
  // Create complete boundary around all connected floors
  createCompleteBoundary(floorPositions, smartWallType, autoWallSettings.placement)
}

// Enhanced smart auto-wall placement for multiple tiles that creates complete boundaries
export function enhancedSmartAutoPlaceWallsForTiles(
  positions: Array<{x: number, y: number, tileType: Palette}>,
  autoWallSettings: { enabled: boolean; defaultWallType: string; placement: 'adjacent' | 'surrounding' }
): void {
  // Only auto-place walls if enabled
  if (!autoWallSettings.enabled) {
    return
  }
  
  // Filter to only floor tiles
  const floorPositions = positions.filter(pos => isFloorTile(pos.tileType))
  
  if (floorPositions.length === 0) {
    return
  }
  
  // Remove any walls that are being replaced by floors
  for (const pos of floorPositions) {
    const existingWall = getTileAt(pos.x, pos.y, 'walls')
    if (existingWall && isWallTile(existingWall)) {
      removeTile('walls', pos.x, pos.y) // Remove the wall
    }
  }
  
  // Find all connected floor areas that are affected
  const processedPositions = new Set<string>()
  
  for (const pos of floorPositions) {
    const posKey = `${pos.x},${pos.y}`
    if (processedPositions.has(posKey)) continue
    
    // Get all connected floors for this area
    const connectedFloors = getConnectedFloorPositions(pos.x, pos.y)
    
    // Mark all as processed
    for (const floorKey of connectedFloors) {
      processedPositions.add(floorKey)
    }
    
    // Convert to position array
    const areaFloorPositions = Array.from(connectedFloors).map(key => {
      const [fx, fy] = key.split(',').map(Number)
      return { x: fx, y: fy }
    })
    
    // Use smart wall selection - get the predominant floor type in this area
    const floorTypes = areaFloorPositions.map(p => getTileAt(p.x, p.y, 'floor')).filter(Boolean)
    const predominantFloorType = floorTypes[0] || pos.tileType // Fallback to the placed tile type
    const smartWallType = getWallForFloor(predominantFloorType, autoWallSettings.defaultWallType)
    
    // Create complete boundary around this connected area
    createCompleteBoundary(areaFloorPositions, smartWallType, autoWallSettings.placement)
  }
}

// Create a complete boundary around a connected floor area
function createCompleteBoundary(
  floorPositions: Array<{x: number, y: number}>,
  wallType: Palette,
  placement: 'adjacent' | 'surrounding' = 'adjacent'
): void {
  if (!isWallTile(wallType)) {
    console.warn(`Invalid wall type: ${wallType}`)
    return
  }
  
  // Create a set of floor positions for quick lookup
  const floorSet = new Set(floorPositions.map(pos => `${pos.x},${pos.y}`))
  
  // Collect all boundary positions
  const boundaryPositions = new Set<string>()
  
  for (const floorPos of floorPositions) {
    const positions = placement === 'surrounding'
      ? getSurroundingPositions(floorPos.x, floorPos.y)
      : getAdjacentPositions(floorPos.x, floorPos.y)
    
    for (const pos of positions) {
      const posKey = `${pos.x},${pos.y}`
      // Add to boundary if it's not a floor position and can place wall
      if (!floorSet.has(posKey) && canPlaceWall(pos.x, pos.y)) {
        boundaryPositions.add(posKey)
      }
    }
  }
  
  // Place walls at all boundary positions
  for (const posKey of boundaryPositions) {
    const [x, y] = posKey.split(',').map(Number)
    setTile('walls', x, y, wallType)
  }
}
