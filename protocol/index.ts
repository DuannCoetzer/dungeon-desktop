/**
 * Protocol Layer - Main Entry Point
 * 
 * This module exports all the pure functions needed for map manipulation
 * without side effects or direct UI references.
 * 
 * The protocol layer serves as a bridge between the data model and the UI,
 * providing predictable, testable functions for all map operations.
 */

// Export all types
export * from './types.js';

// Export core map functions
export {
  createEmptyMap,
  createEmptyLayer,
  updateTile,
  placeAsset,
  serializeMap,
  deserializeMap
} from './map.js';

// Export utility functions
export {
  generateId,
  cloneDeep,
  deepEqual,
  merge,
  getNestedProperty,
  setNestedProperty,
  clamp,
  inRange,
  distance,
  manhattanDistance
} from './utils.js';

// Re-export commonly used enums for convenience
export { TileType, BiomeType, LayerType } from './types.js';

/**
 * Protocol Layer Overview:
 * 
 * This protocol layer implements pure functions for map data manipulation:
 * 
 * Core Functions:
 * - createEmptyMap(width, height, mapId?) - Creates a new empty map
 * - updateTile(map, x, y, type, layerName?) - Updates a tile at coordinates
 * - placeAsset(map, assetInstance, layerName?) - Places an asset on the map
 * - serializeMap(map) - Converts map to JSON string
 * - deserializeMap(json) - Creates map from JSON string
 * 
 * Key Principles:
 * - All functions are pure (no side effects)
 * - Input data is never mutated
 * - New objects are returned for all modifications
 * - No direct UI references or dependencies
 * - Predictable and testable behavior
 * 
 * Usage Example:
 * 
 * ```typescript
 * import { createEmptyMap, updateTile, TileType } from './protocol';
 * 
 * // Create a new map
 * let map = createEmptyMap(10, 10);
 * 
 * // Add some tiles
 * map = updateTile(map, 5, 5, TileType.WALL);
 * map = updateTile(map, 3, 3, TileType.CHEST);
 * 
 * // Serialize for storage
 * const json = serializeMap(map);
 * ```
 */
