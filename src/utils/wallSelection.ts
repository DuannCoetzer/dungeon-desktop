import type { Palette } from '../store'

// Mapping of floor tiles to appropriate wall types
export const FLOOR_TO_WALL_MAPPING: Record<string, Palette> = {
  'grass': 'wall', // Default stone wall for grass
  'floor-stone-rough': 'wall-stone', // Stone wall for stone floors
  'floor-stone-smooth': 'wall-stone', // Stone wall for stone floors  
  'floor-wood-planks': 'wall-wood', // Wood wall for wood floors
  'floor-cobblestone': 'wall-brick', // Brick wall for cobblestone (both are masonry)
}

// Alternative wall mappings for variety
export const ALTERNATIVE_WALL_MAPPING: Record<string, Palette[]> = {
  'grass': ['wall', 'wall-stone', 'wall-brick'], // Various walls work with grass
  'floor-stone-rough': ['wall-stone', 'wall', 'wall-brick'], // Stone variations
  'floor-stone-smooth': ['wall-stone', 'wall', 'wall-brick'], // Stone variations
  'floor-wood-planks': ['wall-wood', 'wall'], // Wood or basic stone
  'floor-cobblestone': ['wall-brick', 'wall-stone', 'wall'], // Masonry variations
}

/**
 * Get the most appropriate wall type for a given floor type
 * @param floorType The floor tile type
 * @param userPreference Optional user preference for wall type
 * @returns The recommended wall type
 */
export function getWallForFloor(floorType: Palette, userPreference?: string): Palette {
  // If user has a specific preference and it's valid, use that
  if (userPreference && isValidWallType(userPreference as Palette)) {
    return userPreference as Palette
  }
  
  // Use the mapping to find the best wall type
  const recommendedWall = FLOOR_TO_WALL_MAPPING[floorType]
  if (recommendedWall) {
    return recommendedWall
  }
  
  // Fallback to basic wall
  return 'wall'
}

/**
 * Get alternative wall options for a floor type
 * @param floorType The floor tile type
 * @returns Array of alternative wall types
 */
export function getAlternativeWalls(floorType: Palette): Palette[] {
  return ALTERNATIVE_WALL_MAPPING[floorType] || ['wall']
}

/**
 * Check if a palette type is a valid wall type
 * @param palette The palette type to check
 * @returns True if it's a wall type
 */
function isValidWallType(palette: Palette): boolean {
  return palette === 'wall' ||
         palette === 'wall-brick' ||
         palette === 'wall-stone' ||
         palette === 'wall-wood'
}

/**
 * Get a smart wall recommendation based on context
 * This could be extended to consider surrounding tiles, themes, etc.
 * @param floorType The floor type being placed
 * @param context Additional context (unused for now, but ready for future expansion)
 * @returns The recommended wall type
 */
export function getSmartWallRecommendation(
  floorType: Palette, 
  context?: {
    surroundingFloors?: Palette[],
    existingWalls?: Palette[],
    theme?: 'dungeon' | 'castle' | 'house' | 'cave'
  }
): Palette {
  // For now, just use the basic floor-to-wall mapping
  // This could be enhanced later to consider context
  
  if (context?.theme) {
    // Theme-based recommendations
    switch (context.theme) {
      case 'dungeon':
        return floorType.includes('stone') ? 'wall-stone' : 'wall'
      case 'castle':  
        return 'wall-brick'
      case 'house':
        return floorType.includes('wood') ? 'wall-wood' : 'wall'
      case 'cave':
        return 'wall-stone'
    }
  }
  
  // If there are existing walls nearby, try to match them
  if (context?.existingWalls && context.existingWalls.length > 0) {
    // Find the most common existing wall type
    const wallCounts = context.existingWalls.reduce((counts, wall) => {
      counts[wall] = (counts[wall] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    const mostCommonWall = Object.keys(wallCounts).reduce((a, b) => 
      wallCounts[a] > wallCounts[b] ? a : b
    ) as Palette
    
    // Use the most common wall type if it makes sense with the floor
    const alternatives = getAlternativeWalls(floorType)
    if (alternatives.includes(mostCommonWall)) {
      return mostCommonWall
    }
  }
  
  return getWallForFloor(floorType)
}
