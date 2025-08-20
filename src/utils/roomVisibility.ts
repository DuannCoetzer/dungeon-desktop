// Room visibility system for DM Game fog of war mechanics
// Detects enclosed rooms and manages visibility based on character positions

import type { MapData, CharacterToken } from '../protocol'
import type { Layer, TileMap } from '../store'

export interface Room {
  id: string
  tiles: Set<string> // Set of "x,y" coordinate keys
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  isVisible: boolean
  doors: Array<{ x: number, y: number }> // Door/window positions
}

export interface RoomVisibilityState {
  rooms: Room[]
  visibleTiles: Set<string> // All tiles that should be visible
}

// Asset names that count as doors/windows (openings in walls)
const DOOR_WINDOW_ASSETS = [
  'door',
  'window', 
  'gate',
  'opening',
  'entrance',
  'doorway',
  'portal'
]

/**
 * Check if an asset is considered a door or window
 */
function isDoorOrWindow(assetName: string): boolean {
  const name = assetName.toLowerCase()
  return DOOR_WINDOW_ASSETS.some(keyword => name.includes(keyword))
}

/**
 * Generate room detection from map data
 */
export function detectRooms(mapData: MapData, getAssetById?: (id: string) => { name: string } | undefined): Room[] {
  const floors = mapData.tiles.floor || {}
  const walls = mapData.tiles.walls || {}
  const objects = mapData.tiles.objects || {}
  
  const visited = new Set<string>()
  const rooms: Room[] = []
  
  // Find door/window positions from assets
  const doorPositions = new Set<string>()
  if (mapData.assetInstances && getAssetById) {
    for (const instance of mapData.assetInstances) {
      const asset = getAssetById(instance.assetId)
      if (asset && isDoorOrWindow(asset.name)) {
        const assetKey = `${Math.floor(instance.x)},${Math.floor(instance.y)}`
        doorPositions.add(assetKey)
        // Also check adjacent tiles for doors that might span multiple tiles
        const directions = [
          { dx: 0, dy: 0 },   // Current position
          { dx: 1, dy: 0 },   // East
          { dx: 0, dy: 1 },   // South
          { dx: -1, dy: 0 },  // West
          { dx: 0, dy: -1 }   // North
        ]
        for (const { dx, dy } of directions) {
          const adjacentKey = `${Math.floor(instance.x) + dx},${Math.floor(instance.y) + dy}`
          if (walls[adjacentKey]) {
            doorPositions.add(adjacentKey)
          }
        }
      }
    }
  }
  
  // Flood fill from each unvisited floor tile
  for (const [floorKey, _] of Object.entries(floors)) {
    if (visited.has(floorKey)) continue
    
    const [x, y] = floorKey.split(',').map(Number)
    const room = floodFillRoom(floors, walls, x, y, visited, doorPositions)
    
    if (room.tiles.size > 0) {
      rooms.push(room)
    }
  }
  
  return rooms
}

/**
 * Flood fill algorithm to detect a room starting from a floor tile
 */
function floodFillRoom(
  floors: TileMap, 
  walls: TileMap, 
  startX: number, 
  startY: number, 
  visited: Set<string>,
  doorPositions: Set<string>
): Room {
  const roomTiles = new Set<string>()
  const doors: Array<{ x: number, y: number }> = []
  const stack: Array<{ x: number, y: number }> = [{ x: startX, y: startY }]
  
  let minX = startX, maxX = startX
  let minY = startY, maxY = startY
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    const key = `${x},${y}`
    
    if (visited.has(key) || roomTiles.has(key)) continue
    if (!floors[key]) continue // Not a floor tile
    
    visited.add(key)
    roomTiles.add(key)
    
    // Update bounds
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    
    // Check adjacent tiles
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 },  // East
      { dx: 0, dy: 1 },  // South
      { dx: -1, dy: 0 }  // West
    ]
    
    for (const { dx, dy } of directions) {
      const newX = x + dx
      const newY = y + dy
      const newKey = `${newX},${newY}`
      
      // If there's a wall here, check if it's a door
      if (walls[newKey]) {
        if (doorPositions.has(newKey)) {
          doors.push({ x: newX, y: newY })
        }
        continue // Don't flood through walls (unless they're doors)
      }
      
      // If there's a floor tile, continue flood fill
      if (floors[newKey] && !visited.has(newKey)) {
        stack.push({ x: newX, y: newY })
      }
    }
  }
  
  return {
    id: `room_${startX}_${startY}_${Date.now()}`,
    tiles: roomTiles,
    bounds: { minX, maxX, minY, maxY },
    isVisible: false,
    doors
  }
}

/**
 * Calculate room visibility based on character positions
 */
export function calculateRoomVisibility(
  rooms: Room[], 
  characters: CharacterToken[]
): RoomVisibilityState {
  const visibleTiles = new Set<string>()
  
  // Make rooms visible based on character positions
  const updatedRooms = rooms.map(room => {
    let isVisible = room.isVisible
    
    // Check if any character is inside this room
    for (const character of characters) {
      if (!character.isVisible) continue
      
      const charKey = `${character.x},${character.y}`
      
      // Character is inside the room
      if (room.tiles.has(charKey)) {
        isVisible = true
        break
      }
      
      // Character is adjacent to a door of this room
      for (const door of room.doors) {
        const distance = Math.abs(character.x - door.x) + Math.abs(character.y - door.y)
        if (distance <= 1) { // Adjacent to door
          isVisible = true
          break
        }
      }
      
      if (isVisible) break
    }
    
    // Add room tiles to visible tiles if room is visible
    if (isVisible) {
      room.tiles.forEach(tile => visibleTiles.add(tile))
    }
    
    return { ...room, isVisible }
  })
  
  return {
    rooms: updatedRooms,
    visibleTiles
  }
}

/**
 * Check if a specific tile should be visible
 */
export function isTileVisible(
  x: number, 
  y: number, 
  roomVisibility: RoomVisibilityState
): boolean {
  const key = `${x},${y}`
  return roomVisibility.visibleTiles.has(key)
}

/**
 * Get all tiles that should have fog of war applied
 */
export function getFogOfWarTiles(
  mapData: MapData, 
  roomVisibility: RoomVisibilityState
): Set<string> {
  const fogTiles = new Set<string>()
  const floors = mapData.tiles.floor || {}
  
  // Add all floor tiles that are not visible
  for (const [key, _] of Object.entries(floors)) {
    if (!roomVisibility.visibleTiles.has(key)) {
      fogTiles.add(key)
    }
  }
  
  return fogTiles
}
