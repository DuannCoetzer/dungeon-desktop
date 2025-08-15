/**
 * Core map creation and manipulation functions.
 * 
 * These are pure functions that create and manipulate map data structures
 * without side effects or direct UI references.
 */

import { 
  MapData, 
  MapLayer, 
  Tile, 
  AssetInstance, 
  LayerType, 
  TileType, 
  BiomeType 
} from './types.js';
import { generateId, cloneDeep } from './utils.js';

/**
 * Creates an empty map with default layers and no tiles.
 * 
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @param mapId - Optional map ID, will generate one if not provided
 * @returns A new empty MapData structure
 */
export function createEmptyMap(
  width: number, 
  height: number, 
  mapId?: string
): MapData {
  if (width <= 0 || height <= 0) {
    throw new Error('Map dimensions must be positive');
  }

  const id = mapId || generateId();
  
  // Create default layers
  const layers: MapLayer[] = [
    createEmptyLayer(LayerType.BACKGROUND, 'Background', width, height, 0),
    createEmptyLayer(LayerType.TERRAIN, 'Terrain', width, height, 1),
    createEmptyLayer(LayerType.OBJECTS, 'Objects', width, height, 2),
  ];

  return {
    width,
    height,
    mapId: id,
    name: 'Untitled Map',
    description: '',
    layers,
    defaultBiome: BiomeType.DUNGEON,
    tileWidth: 32,
    tileHeight: 32,
    spawnPoints: [],
    exitPoints: [],
    properties: {}
  };
}

/**
 * Creates an empty layer with the specified parameters.
 * 
 * @param layerType - Type of the layer
 * @param name - Name of the layer
 * @param width - Layer width in tiles
 * @param height - Layer height in tiles
 * @param zIndex - Z-index for layer ordering
 * @returns A new empty MapLayer structure
 */
export function createEmptyLayer(
  layerType: LayerType,
  name: string,
  width: number,
  height: number,
  zIndex: number = 0
): MapLayer {
  // Initialize 2D array with null values
  const tiles: (Tile | null)[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = null;
    }
  }

  return {
    layerType,
    name,
    width,
    height,
    tiles,
    isVisible: true,
    opacity: 1.0,
    zIndex,
    properties: {}
  };
}

/**
 * Updates a tile at the specified position in a map.
 * Returns a new map with the updated tile without modifying the original.
 * 
 * @param map - The original map data
 * @param x - X coordinate of the tile
 * @param y - Y coordinate of the tile
 * @param type - The new tile type
 * @param layerName - Name of the layer to update (defaults to 'Terrain')
 * @returns A new MapData with the updated tile
 */
export function updateTile(
  map: MapData,
  x: number,
  y: number,
  type: TileType,
  layerName: string = 'Terrain'
): MapData {
  if (!isValidPosition(map, x, y)) {
    throw new Error(`Invalid position: (${x}, ${y})`);
  }

  // Deep clone the map to avoid mutations
  const newMap = cloneDeep(map);
  
  // Find the target layer
  const layerIndex = newMap.layers.findIndex(layer => layer.name === layerName);
  if (layerIndex === -1) {
    throw new Error(`Layer '${layerName}' not found`);
  }

  const layer = newMap.layers[layerIndex];
  const existingTile = layer.tiles[y][x];

  // Create a new tile or update the existing one
  const newTile: Tile = existingTile ? {
    ...existingTile,
    tileType: type
  } : createDefaultTile(x, y, type, map.defaultBiome);

  // Set default properties based on tile type
  updateTileDefaults(newTile);

  // Update the tile in the layer
  layer.tiles[y][x] = newTile;

  return newMap;
}

/**
 * Places an asset instance on the map at the specified coordinates.
 * Returns a new map with the asset placed without modifying the original.
 * 
 * @param map - The original map data
 * @param assetInstance - The asset instance to place
 * @param layerName - Name of the layer to place the asset on (defaults to 'Objects')
 * @returns A new MapData with the asset placed
 */
export function placeAsset(
  map: MapData,
  assetInstance: AssetInstance,
  layerName: string = 'Objects'
): MapData {
  const x = Math.floor(assetInstance.x || 0);
  const y = Math.floor(assetInstance.y || 0);

  if (!isValidPosition(map, x, y)) {
    throw new Error(`Invalid position for asset: (${x}, ${y})`);
  }

  // Deep clone the map to avoid mutations
  const newMap = cloneDeep(map);
  
  // Find the target layer
  const layerIndex = newMap.layers.findIndex(layer => layer.name === layerName);
  if (layerIndex === -1) {
    throw new Error(`Layer '${layerName}' not found`);
  }

  const layer = newMap.layers[layerIndex];
  let tile = layer.tiles[y][x];

  // Create a tile if none exists
  if (!tile) {
    tile = createDefaultTile(x, y, TileType.FLOOR, map.defaultBiome);
    layer.tiles[y][x] = tile;
  } else {
    // Clone the existing tile
    tile = cloneDeep(tile);
    layer.tiles[y][x] = tile;
  }

  // Add the asset instance to the tile
  if (!tile.assetInstances) {
    tile.assetInstances = [];
  }
  
  tile.assetInstances.push({
    ...assetInstance,
    instanceId: assetInstance.instanceId || generateId()
  });

  return newMap;
}

/**
 * Serializes a map to JSON string.
 * 
 * @param map - The map data to serialize
 * @returns JSON string representation of the map
 */
export function serializeMap(map: MapData): string {
  try {
    return JSON.stringify(map, null, 2);
  } catch (error) {
    throw new Error(`Failed to serialize map: ${error}`);
  }
}

/**
 * Deserializes a map from JSON string.
 * 
 * @param json - JSON string representation of the map
 * @returns MapData structure
 */
export function deserializeMap(json: string): MapData {
  try {
    const data = JSON.parse(json);
    
    // Validate the deserialized data has required properties
    if (!isValidMapData(data)) {
      throw new Error('Invalid map data structure');
    }
    
    return data as MapData;
  } catch (error) {
    throw new Error(`Failed to deserialize map: ${error}`);
  }
}

// Helper functions

/**
 * Checks if a position is valid within the map bounds.
 */
function isValidPosition(map: MapData, x: number, y: number): boolean {
  return x >= 0 && x < map.width && y >= 0 && y < map.height;
}

/**
 * Creates a default tile with basic properties.
 */
function createDefaultTile(
  x: number, 
  y: number, 
  tileType: TileType, 
  biomeType: BiomeType = BiomeType.DUNGEON
): Tile {
  const tile: Tile = {
    x,
    y,
    tileType,
    biomeType,
    assetInstances: [],
    isPassable: true,
    isTransparent: true,
    movementCost: 1.0,
    isInteractive: false,
    interactionRange: 1.0,
    isDiscovered: false,
    isVisible: false,
    properties: {}
  };

  updateTileDefaults(tile);
  return tile;
}

/**
 * Updates tile default properties based on tile type.
 */
function updateTileDefaults(tile: Tile): void {
  // Set default passability based on tile type
  switch (tile.tileType) {
    case TileType.WALL:
    case TileType.PIT:
    case TileType.LAVA:
      tile.isPassable = false;
      break;
    default:
      tile.isPassable = true;
  }

  // Set default transparency based on tile type
  switch (tile.tileType) {
    case TileType.WALL:
      tile.isTransparent = false;
      break;
    default:
      tile.isTransparent = true;
  }

  // Set interactivity for certain tile types
  switch (tile.tileType) {
    case TileType.CHEST:
    case TileType.SWITCH:
    case TileType.PRESSURE_PLATE:
    case TileType.DOOR:
      tile.isInteractive = true;
      break;
    default:
      tile.isInteractive = false;
  }
}

/**
 * Validates that an object has the structure of MapData.
 */
function isValidMapData(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.width === 'number' &&
    typeof data.height === 'number' &&
    typeof data.mapId === 'string' &&
    Array.isArray(data.layers) &&
    data.layers.length > 0 &&
    data.layers.every(isValidLayerData)
  );
}

/**
 * Validates that an object has the structure of MapLayer.
 */
function isValidLayerData(layer: any): boolean {
  return (
    layer &&
    typeof layer === 'object' &&
    typeof layer.name === 'string' &&
    typeof layer.width === 'number' &&
    typeof layer.height === 'number' &&
    Array.isArray(layer.tiles) &&
    layer.tiles.length === layer.height &&
    layer.tiles.every((row: any) => 
      Array.isArray(row) && row.length === layer.width
    )
  );
}
