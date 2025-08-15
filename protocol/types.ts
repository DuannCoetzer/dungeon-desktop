/**
 * Type definitions for the protocol layer.
 * 
 * These types are based on the Python model layer but adapted for TypeScript
 * and designed to work with pure functions without side effects.
 */

// Enum definitions
export enum TileType {
  // Terrain types
  FLOOR = 'floor',
  WALL = 'wall',
  DOOR = 'door',
  WATER = 'water',
  LAVA = 'lava',
  PIT = 'pit',
  STAIRS_UP = 'stairs_up',
  STAIRS_DOWN = 'stairs_down',
  
  // Interactive elements
  CHEST = 'chest',
  SWITCH = 'switch',
  PRESSURE_PLATE = 'pressure_plate',
  TRAP = 'trap',
  
  // Special tiles
  SPAWN_POINT = 'spawn_point',
  EXIT = 'exit',
  TELEPORTER = 'teleporter'
}

export enum BiomeType {
  DUNGEON = 'dungeon',
  CAVE = 'cave',
  FOREST = 'forest',
  DESERT = 'desert',
  ICE = 'ice',
  VOLCANIC = 'volcanic',
  SWAMP = 'swamp',
  RUINS = 'ruins',
  UNDERWATER = 'underwater',
  ETHEREAL = 'ethereal'
}

export enum LayerType {
  BACKGROUND = 'background',
  TERRAIN = 'terrain',
  OBJECTS = 'objects',
  ENTITIES = 'entities',
  EFFECTS = 'effects',
  UI = 'ui'
}

// Asset definitions
export interface AssetDefinition {
  id: string;
  name: string;
  assetType: string; // 'sprite', 'animation', 'tileset', 'sound', 'model'
  resourcePath: string;
  resourceFormat: string; // 'png', 'jpg', 'gif', 'wav', 'ogg', 'fbx'
  
  // Dimensions (for visual assets)
  width?: number;
  height?: number;
  
  // Animation data (for animated assets)
  frameCount?: number;
  frameDuration?: number; // Duration per frame in seconds
  animationLoop?: boolean;
  
  // Tileset data (for tileset assets)
  tileWidth?: number;
  tileHeight?: number;
  tilesPerRow?: number;
  
  // Metadata and properties
  tags?: string[];
  properties?: Record<string, any>;
}

export interface AssetInstance {
  instanceId: string;
  assetDefinitionId: string;
  
  // Transform properties
  x?: number;
  y?: number;
  z?: number;
  
  // Rotation (in degrees)
  rotation?: number;
  
  // Scale
  scaleX?: number;
  scaleY?: number;
  
  // Visual properties
  opacity?: number;
  tintColor?: string; // Hex color string like "#FF0000"
  
  // Animation state (for animated assets)
  currentFrame?: number;
  animationSpeed?: number; // Multiplier for animation speed
  isPlaying?: boolean;
  
  // Instance-specific properties
  properties?: Record<string, any>;
  
  // Layer information
  layerIndex?: number;
  zIndex?: number; // For sorting within the same layer
}

// Tile definition
export interface Tile {
  // Position in the map grid
  x: number;
  y: number;
  
  // Tile classification
  tileType: TileType;
  biomeType?: BiomeType;
  
  // Visual representation
  assetInstances?: AssetInstance[];
  
  // Gameplay properties
  isPassable?: boolean;
  isTransparent?: boolean; // For line of sight calculations
  movementCost?: number; // Cost for pathfinding algorithms
  
  // Interactive properties
  isInteractive?: boolean;
  interactionRange?: number;
  
  // State information
  isDiscovered?: boolean; // For fog of war
  isVisible?: boolean; // Currently visible to player
  
  // Tile-specific properties
  properties?: Record<string, any>;
  
  // Health/durability (for destructible tiles)
  maxHealth?: number;
  currentHealth?: number;
}

// Map layer definition
export interface MapLayer {
  layerType: LayerType;
  name: string;
  width: number;
  height: number;
  
  // 2D grid of tiles [y][x] for row-major access
  tiles: (Tile | null)[][];
  
  // Layer properties
  isVisible?: boolean;
  opacity?: number;
  zIndex?: number; // For layer ordering
  
  // Metadata
  properties?: Record<string, any>;
}

// Map data definition
export interface MapData {
  // Map dimensions
  width: number;
  height: number;
  
  // Map identification and metadata
  mapId: string;
  name?: string;
  description?: string;
  
  // Layers (ordered by z_index for rendering)
  layers: MapLayer[];
  
  // Default biome for the map
  defaultBiome?: BiomeType;
  
  // Map-wide properties
  tileWidth?: number; // Width of each tile in pixels (rendering hint)
  tileHeight?: number; // Height of each tile in pixels (rendering hint)
  
  // Spawn and objective information
  spawnPoints?: [number, number][];
  exitPoints?: [number, number][];
  
  // Metadata and custom properties
  properties?: Record<string, any>;
}

// Helper types for function parameters
export interface Position {
  x: number;
  y: number;
}

export interface MapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
