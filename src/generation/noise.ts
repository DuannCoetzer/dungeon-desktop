import { createNoise2D } from 'simplex-noise';
import type { MapData } from '../protocol';
import type { TileType, Layer, TileMap } from '../store';

// Biome definitions based on height and moisture
export const BiomeType = {
  DEEP_WATER: 'deep_water',
  SHALLOW_WATER: 'shallow_water',
  BEACH: 'beach',
  DESERT: 'desert',
  GRASSLAND: 'grassland',
  FOREST: 'forest',
  HILLS: 'hills',
  MOUNTAIN: 'mountain',
  SNOW: 'snow'
} as const;

export type BiomeType = (typeof BiomeType)[keyof typeof BiomeType];

// Generation parameters interface
export interface GenerationParams {
  width: number;
  height: number;
  seed?: number;
  
  // Height generation parameters
  heightOctaves?: number;
  heightFrequency?: number;
  heightAmplitude?: number;
  heightPersistence?: number;
  
  // Moisture generation parameters
  moistureOctaves?: number;
  moistureFrequency?: number;
  moistureAmplitude?: number;
  moisturePersistence?: number;
  
  // Biome thresholds
  waterLevel?: number;
  beachLevel?: number;
  hillLevel?: number;
  mountainLevel?: number;
  
  // Moisture thresholds
  dryThreshold?: number;
  wetThreshold?: number;
}

// Default parameters for terrain generation
const DEFAULT_PARAMS: Required<GenerationParams> = {
  width: 100,
  height: 100,
  seed: Math.random(),
  
  heightOctaves: 4,
  heightFrequency: 0.02,
  heightAmplitude: 1.0,
  heightPersistence: 0.5,
  
  moistureOctaves: 3,
  moistureFrequency: 0.015,
  moistureAmplitude: 1.0,
  moisturePersistence: 0.6,
  
  waterLevel: 0.3,
  beachLevel: 0.35,
  hillLevel: 0.6,
  mountainLevel: 0.8,
  
  dryThreshold: 0.3,
  wetThreshold: 0.7
};

// 2D heightmap data structure
export interface Heightmap {
  width: number;
  height: number;
  data: number[][];
}

// 2D moisture map data structure
export interface MoistureMap {
  width: number;
  height: number;
  data: number[][];
}

// Biome map data structure
export interface BiomeMap {
  width: number;
  height: number;
  data: BiomeType[][];
}

/**
 * Generates a heightmap using multiple octaves of Simplex noise
 */
export function generateHeightmap(params: GenerationParams): Heightmap {
  const config = { ...DEFAULT_PARAMS, ...params };
  const noise2D = createNoise2D(() => config.seed);
  
  const heightmap: Heightmap = {
    width: config.width,
    height: config.height,
    data: Array(config.height).fill(null).map(() => Array(config.width).fill(0))
  };
  
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      let height = 0;
      let amplitude = config.heightAmplitude;
      let frequency = config.heightFrequency;
      
      // Generate multiple octaves of noise
      for (let octave = 0; octave < config.heightOctaves; octave++) {
        height += noise2D(x * frequency, y * frequency) * amplitude;
        amplitude *= config.heightPersistence;
        frequency *= 2;
      }
      
      // Normalize to 0-1 range
      heightmap.data[y][x] = Math.max(0, Math.min(1, (height + 1) / 2));
    }
  }
  
  return heightmap;
}

/**
 * Generates a moisture map using multiple octaves of Simplex noise
 */
export function generateMoistureMap(params: GenerationParams): MoistureMap {
  const config = { ...DEFAULT_PARAMS, ...params };
  // Use a different seed offset for moisture to ensure variation
  const noise2D = createNoise2D(() => config.seed + 12345);
  
  const moistureMap: MoistureMap = {
    width: config.width,
    height: config.height,
    data: Array(config.height).fill(null).map(() => Array(config.width).fill(0))
  };
  
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      let moisture = 0;
      let amplitude = config.moistureAmplitude;
      let frequency = config.moistureFrequency;
      
      // Generate multiple octaves of noise
      for (let octave = 0; octave < config.moistureOctaves; octave++) {
        moisture += noise2D(x * frequency, y * frequency) * amplitude;
        amplitude *= config.moisturePersistence;
        frequency *= 2;
      }
      
      // Normalize to 0-1 range
      moistureMap.data[y][x] = Math.max(0, Math.min(1, (moisture + 1) / 2));
    }
  }
  
  return moistureMap;
}

/**
 * Assigns biomes based on height and moisture values
 */
export function assignBiomes(heightmap: Heightmap, moistureMap: MoistureMap, params?: GenerationParams): BiomeMap {
  const config = { ...DEFAULT_PARAMS, ...params };
  
  if (heightmap.width !== moistureMap.width || heightmap.height !== moistureMap.height) {
    throw new Error('Heightmap and moisture map dimensions must match');
  }
  
  const biomeMap: BiomeMap = {
    width: heightmap.width,
    height: heightmap.height,
    data: Array(heightmap.height).fill(null).map(() => Array(heightmap.width).fill(BiomeType.GRASSLAND))
  };
  
  for (let y = 0; y < heightmap.height; y++) {
    for (let x = 0; x < heightmap.width; x++) {
      const height = heightmap.data[y][x];
      const moisture = moistureMap.data[y][x];
      
      // Assign biome based on height and moisture thresholds
      let biome: BiomeType = BiomeType.GRASSLAND; // default
      
      if (height < config.waterLevel) {
        biome = height < config.waterLevel * 0.7 ? BiomeType.DEEP_WATER : BiomeType.SHALLOW_WATER;
      } else if (height < config.beachLevel) {
        biome = BiomeType.BEACH;
      } else if (height > config.mountainLevel) {
        biome = height > 0.9 ? BiomeType.SNOW : BiomeType.MOUNTAIN;
      } else if (height > config.hillLevel) {
        biome = BiomeType.HILLS;
      } else {
        // Mid-level terrain - use moisture to determine biome
        if (moisture < config.dryThreshold) {
          biome = BiomeType.DESERT;
        } else if (moisture > config.wetThreshold) {
          biome = BiomeType.FOREST;
        } else {
          biome = BiomeType.GRASSLAND;
        }
      }
      
      biomeMap.data[y][x] = biome;
    }
  }
  
  return biomeMap;
}

/**
 * Converts a biome type to a TileType for the game engine
 */
function biomeToTileType(biome: BiomeType): TileType {
  switch (biome) {
    case BiomeType.DEEP_WATER:
    case BiomeType.SHALLOW_WATER:
      return 'floor'; // Water tiles could be floor type with different styling
    case BiomeType.BEACH:
    case BiomeType.DESERT:
    case BiomeType.GRASSLAND:
      return 'floor';
    case BiomeType.FOREST:
      return 'floor'; // Trees could be objects layer
    case BiomeType.HILLS:
    case BiomeType.MOUNTAIN:
      return 'wall'; // Higher terrain as walls
    case BiomeType.SNOW:
      return 'wall';
    default:
      return 'floor';
  }
}

/**
 * Determines which layer a biome should be placed on
 */
function biomeToLayer(biome: BiomeType): Layer {
  switch (biome) {
    case BiomeType.FOREST:
      return 'objects'; // Trees as objects
    case BiomeType.HILLS:
    case BiomeType.MOUNTAIN:
    case BiomeType.SNOW:
      return 'walls'; // Higher terrain as walls
    default:
      return 'floor'; // Most terrain as floor
  }
}

/**
 * Extended generation parameters with asset placement options
 */
export interface ExtendedGenerationParams extends GenerationParams {
  includeAssets?: boolean; // Whether to place assets automatically
  assetDefinitions?: any[]; // Import type will be resolved at runtime
  placementRules?: any[]; // Import type will be resolved at runtime
}

/**
 * Generates a complete MapData structure from terrain generation parameters
 */
export function generateMapData(params: GenerationParams): MapData {
  // Generate heightmap and moisture map
  const heightmap = generateHeightmap(params);
  const moistureMap = generateMoistureMap(params);
  
  // Assign biomes based on height and moisture
  const biomeMap = assignBiomes(heightmap, moistureMap, params);
  
  // Initialize empty tile maps for each layer
  const tiles: Record<Layer, TileMap> = {
    floor: {},
    walls: {},
    objects: {},
    assets: {},
    fog: {},
  }
  
  // Convert biomes to tiles
  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      const biome = biomeMap.data[y][x];
      const tileType = biomeToTileType(biome);
      const layer = biomeToLayer(biome);
      const key = `${x},${y}`;
      
      tiles[layer][key] = tileType;
      
      // Add floor tiles under walls and objects for completeness
      if (layer !== 'floor') {
        tiles.floor[key] = 'floor';
      }
    }
  }
  
  // Return complete MapData structure
  return {
    tiles,
    assetInstances: [],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Generates a complete MapData structure with asset placement
 */
export function generateMapDataWithAssets(
  params: ExtendedGenerationParams
): MapData {
  // First generate the base map
  let mapData = generateMapData(params);
  
  // If assets should be included, place them
  if (params.includeAssets) {
    // Dynamic import to avoid circular dependency
    import('./assetPlacement').then(({ 
      placeAssetsByBiome,
      defaultAssetDefinitions,
      defaultPlacementRules
    }) => {
      // Generate the data needed for asset placement
      const heightmap = generateHeightmap(params);
      const moistureMap = generateMoistureMap(params);
      const biomeMap = assignBiomes(heightmap, moistureMap, params);
      
      // Place assets using the provided or default definitions and rules
      mapData = placeAssetsByBiome(
        mapData,
        params.assetDefinitions || defaultAssetDefinitions,
        params.placementRules || defaultPlacementRules,
        biomeMap,
        heightmap.data,
        moistureMap.data
      );
    });
  }
  
  return mapData;
}

/**
 * Generates terrain with custom noise functions for advanced control
 */
export function generateAdvancedTerrain(params: GenerationParams & {
  customHeightFunction?: (x: number, y: number, noise2D: ReturnType<typeof createNoise2D>) => number;
  customMoistureFunction?: (x: number, y: number, noise2D: ReturnType<typeof createNoise2D>) => number;
}): MapData {
  const config = { ...DEFAULT_PARAMS, ...params };
  const heightNoise = createNoise2D(() => config.seed);
  const moistureNoise = createNoise2D(() => config.seed + 12345);
  
  // Generate heightmap with custom function if provided
  const heightmap: Heightmap = {
    width: config.width,
    height: config.height,
    data: Array(config.height).fill(null).map(() => Array(config.width).fill(0))
  };
  
  // Generate moisture map with custom function if provided
  const moistureMap: MoistureMap = {
    width: config.width,
    height: config.height,
    data: Array(config.height).fill(null).map(() => Array(config.width).fill(0))
  };
  
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      if (params.customHeightFunction) {
        heightmap.data[y][x] = Math.max(0, Math.min(1, params.customHeightFunction(x, y, heightNoise)));
      } else {
        // Default height generation
        let height = 0;
        let amplitude = config.heightAmplitude;
        let frequency = config.heightFrequency;
        
        for (let octave = 0; octave < config.heightOctaves; octave++) {
          height += heightNoise(x * frequency, y * frequency) * amplitude;
          amplitude *= config.heightPersistence;
          frequency *= 2;
        }
        
        heightmap.data[y][x] = Math.max(0, Math.min(1, (height + 1) / 2));
      }
      
      if (params.customMoistureFunction) {
        moistureMap.data[y][x] = Math.max(0, Math.min(1, params.customMoistureFunction(x, y, moistureNoise)));
      } else {
        // Default moisture generation
        let moisture = 0;
        let amplitude = config.moistureAmplitude;
        let frequency = config.moistureFrequency;
        
        for (let octave = 0; octave < config.moistureOctaves; octave++) {
          moisture += moistureNoise(x * frequency, y * frequency) * amplitude;
          amplitude *= config.moisturePersistence;
          frequency *= 2;
        }
        
        moistureMap.data[y][x] = Math.max(0, Math.min(1, (moisture + 1) / 2));
      }
    }
  }
  
  // Assign biomes and convert to MapData
  const biomeMap = assignBiomes(heightmap, moistureMap, params);
  
  const tiles: Record<Layer, TileMap> = {
    floor: {},
    walls: {},
    objects: {},
    assets: {},
    fog: {}
  };
  
  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      const biome = biomeMap.data[y][x];
      const tileType = biomeToTileType(biome);
      const layer = biomeToLayer(biome);
      const key = `${x},${y}`;
      
      tiles[layer][key] = tileType;
      
      if (layer !== 'floor') {
        tiles.floor[key] = 'floor';
      }
    }
  }
  
  return {
    tiles,
    assetInstances: [],
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Helper function to get height value at coordinates with bounds checking
 */
export function getHeightAt(heightmap: Heightmap, x: number, y: number): number {
  if (x < 0 || x >= heightmap.width || y < 0 || y >= heightmap.height) {
    return 0;
  }
  return heightmap.data[y][x];
}

/**
 * Helper function to get moisture value at coordinates with bounds checking
 */
export function getMoistureAt(moistureMap: MoistureMap, x: number, y: number): number {
  if (x < 0 || x >= moistureMap.width || y < 0 || y >= moistureMap.height) {
    return 0;
  }
  return moistureMap.data[y][x];
}

/**
 * Helper function to get biome at coordinates with bounds checking
 */
export function getBiomeAt(biomeMap: BiomeMap, x: number, y: number): BiomeType {
  if (x < 0 || x >= biomeMap.width || y < 0 || y >= biomeMap.height) {
    return BiomeType.GRASSLAND;
  }
  return biomeMap.data[y][x];
}

// Export default generation parameters
export { DEFAULT_PARAMS as defaultGenerationParams };
