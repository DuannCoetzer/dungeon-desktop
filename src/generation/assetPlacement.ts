import type { MapData } from '../protocol';
import type { AssetInstance } from '../store';
import { BiomeType, type BiomeMap, getBiomeAt } from './noise';

// Asset definition interface for placement rules
export interface AssetDefinition {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  // Grid dimensions - how many grid cells this asset occupies
  gridWidth?: number;
  gridHeight?: number;
  // Placement constraints
  minSpacing?: number; // Minimum distance between instances of this asset
  maxDensity?: number; // Maximum instances per 100x100 area
  avoidWater?: boolean; // Whether to avoid water tiles
  preferEdges?: boolean; // Whether to prefer biome edges
}

// Placement rule interface
export interface PlacementRule {
  assetId: string;
  biomes: BiomeType[]; // Which biomes this asset can be placed in
  probability: number; // 0-1 probability of placement when conditions are met
  minHeight?: number; // Minimum height requirement (0-1)
  maxHeight?: number; // Maximum height requirement (0-1)
  minMoisture?: number; // Minimum moisture requirement (0-1)
  maxMoisture?: number; // Maximum moisture requirement (0-1)
  clusterProbability?: number; // Probability of placing additional assets nearby
  clusterRadius?: number; // Radius for clustered placement
  clusterSize?: number; // Max additional assets in a cluster
}

// Default asset definitions
export const defaultAssetDefinitions: AssetDefinition[] = [
  {
    id: 'tree',
    name: 'Tree',
    src: 'objects/tree.svg',
    width: 1,
    height: 1,
    minSpacing: 2,
    maxDensity: 30,
    avoidWater: true
  },
  {
    id: 'rock',
    name: 'Rock',
    src: 'objects/rock.svg',
    width: 1,
    height: 1,
    minSpacing: 3,
    maxDensity: 20,
    avoidWater: true
  },
  {
    id: 'chest',
    name: 'Treasure Chest',
    src: 'objects/chest.svg',
    width: 1,
    height: 1,
    minSpacing: 10,
    maxDensity: 5,
    avoidWater: true,
    preferEdges: true
  }
];

// Default placement rules
export const defaultPlacementRules: PlacementRule[] = [
  // Trees in forests with high probability
  {
    assetId: 'tree',
    biomes: [BiomeType.FOREST],
    probability: 0.4,
    minMoisture: 0.6,
    clusterProbability: 0.7,
    clusterRadius: 3,
    clusterSize: 4
  },
  // Sparse trees in grasslands
  {
    assetId: 'tree',
    biomes: [BiomeType.GRASSLAND],
    probability: 0.1,
    minMoisture: 0.4,
    clusterProbability: 0.3,
    clusterRadius: 2,
    clusterSize: 2
  },
  // Rocks in mountains and hills
  {
    assetId: 'rock',
    biomes: [BiomeType.MOUNTAIN, BiomeType.HILLS],
    probability: 0.3,
    minHeight: 0.5,
    clusterProbability: 0.5,
    clusterRadius: 2,
    clusterSize: 3
  },
  // Rocks in desert
  {
    assetId: 'rock',
    biomes: [BiomeType.DESERT],
    probability: 0.15,
    maxMoisture: 0.4,
    clusterProbability: 0.2,
    clusterRadius: 4,
    clusterSize: 2
  },
  // Treasure chests in various biomes (rare)
  {
    assetId: 'chest',
    biomes: [BiomeType.FOREST, BiomeType.HILLS, BiomeType.GRASSLAND],
    probability: 0.005
  }
];

// Helper interface for placement context
interface PlacementContext {
  biomeMap: BiomeMap;
  heightMap?: number[][];
  moistureMap?: number[][];
  existingAssets: Set<string>; // Set of position keys where assets already exist
  placedAssets: AssetInstance[];
}

/**
 * Main function to place assets based on biome rules
 */
export function placeAssetsByBiome(
  map: MapData,
  assetDefs: AssetDefinition[] = defaultAssetDefinitions,
  rules: PlacementRule[] = defaultPlacementRules,
  biomeMap: BiomeMap,
  heightMap?: number[][],
  moistureMap?: number[][]
): MapData {
  // Create placement context
  const context: PlacementContext = {
    biomeMap,
    heightMap,
    moistureMap,
    existingAssets: new Set(map.assetInstances.map(asset => `${asset.x},${asset.y}`)),
    placedAssets: [...map.assetInstances]
  };

  // Create asset definition lookup
  const assetDefMap = new Map(assetDefs.map(def => [def.id, def]));

  // Process each rule
  for (const rule of rules) {
    const assetDef = assetDefMap.get(rule.assetId);
    if (!assetDef) {
      console.warn(`Asset definition not found for rule: ${rule.assetId}`);
      continue;
    }

    placeAssetsForRule(rule, assetDef, context);
  }

  // Return updated map data
  return {
    ...map,
    assetInstances: context.placedAssets,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Places assets for a specific rule
 */
function placeAssetsForRule(
  rule: PlacementRule,
  assetDef: AssetDefinition,
  context: PlacementContext
): void {
  const { biomeMap } = context;
  
  // Iterate through all map positions
  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      if (shouldPlaceAsset(x, y, rule, assetDef, context)) {
        const asset = createAssetInstance(x, y, assetDef);
        context.placedAssets.push(asset);
        context.existingAssets.add(`${x},${y}`);
        
        // Handle clustering
        if (rule.clusterProbability && Math.random() < rule.clusterProbability) {
          placeCluster(x, y, rule, assetDef, context);
        }
      }
    }
  }
}

/**
 * Determines if an asset should be placed at the given position
 */
function shouldPlaceAsset(
  x: number,
  y: number,
  rule: PlacementRule,
  assetDef: AssetDefinition,
  context: PlacementContext
): boolean {
  const { biomeMap, heightMap, moistureMap, existingAssets } = context;
  
  // Check if position is already occupied
  if (existingAssets.has(`${x},${y}`)) {
    return false;
  }
  
  // Check biome compatibility
  const biome = getBiomeAt(biomeMap, x, y);
  if (!rule.biomes.includes(biome)) {
    return false;
  }
  
  // Check water avoidance
  if (assetDef.avoidWater && (biome === BiomeType.DEEP_WATER || biome === BiomeType.SHALLOW_WATER)) {
    return false;
  }
  
  // Check height constraints
  if (heightMap && (rule.minHeight !== undefined || rule.maxHeight !== undefined)) {
    const height = getHeightAt(heightMap, x, y);
    if (rule.minHeight !== undefined && height < rule.minHeight) return false;
    if (rule.maxHeight !== undefined && height > rule.maxHeight) return false;
  }
  
  // Check moisture constraints
  if (moistureMap && (rule.minMoisture !== undefined || rule.maxMoisture !== undefined)) {
    const moisture = getMoistureAt(moistureMap, x, y);
    if (rule.minMoisture !== undefined && moisture < rule.minMoisture) return false;
    if (rule.maxMoisture !== undefined && moisture > rule.maxMoisture) return false;
  }
  
  // Check minimum spacing
  if (assetDef.minSpacing && !checkMinSpacing(x, y, assetDef.minSpacing, assetDef.id, context)) {
    return false;
  }
  
  // Check density constraints
  if (assetDef.maxDensity && !checkDensityConstraint(x, y, assetDef, context)) {
    return false;
  }
  
  // Check edge preference
  if (assetDef.preferEdges && !isNearBiomeEdge(x, y, biomeMap)) {
    // Reduce probability for non-edge positions
    const edgePenalty = 0.1;
    if (Math.random() > edgePenalty) return false;
  }
  
  // Final probability check
  return Math.random() < rule.probability;
}

/**
 * Places a cluster of assets around a position
 */
function placeCluster(
  centerX: number,
  centerY: number,
  rule: PlacementRule,
  assetDef: AssetDefinition,
  context: PlacementContext
): void {
  if (!rule.clusterRadius || !rule.clusterSize) return;
  
  const attempts = rule.clusterSize * 3; // Multiple attempts to place cluster items
  let placed = 0;
  
  for (let attempt = 0; attempt < attempts && placed < rule.clusterSize; attempt++) {
    // Generate random position within cluster radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * rule.clusterRadius;
    const x = Math.round(centerX + Math.cos(angle) * distance);
    const y = Math.round(centerY + Math.sin(angle) * distance);
    
    // Check bounds
    if (x < 0 || x >= context.biomeMap.width || y < 0 || y >= context.biomeMap.height) {
      continue;
    }
    
    // Check if we should place (with reduced probability for clusters)
    const clusterRule = { ...rule, probability: rule.probability * 0.6 };
    if (shouldPlaceAsset(x, y, clusterRule, assetDef, context)) {
      const asset = createAssetInstance(x, y, assetDef);
      context.placedAssets.push(asset);
      context.existingAssets.add(`${x},${y}`);
      placed++;
    }
  }
}

/**
 * Creates an asset instance at the given position
 */
function createAssetInstance(x: number, y: number, assetDef: AssetDefinition): AssetInstance {
  return {
    id: `${assetDef.id}_${x}_${y}_${Date.now()}`,
    assetId: assetDef.id,
    x,
    y,
    width: assetDef.width,
    height: assetDef.height,
    rotation: 0,
    gridWidth: assetDef.gridWidth || Math.ceil(assetDef.width / 32),
    gridHeight: assetDef.gridHeight || Math.ceil(assetDef.height / 32),
    selected: false
  };
}

/**
 * Checks if minimum spacing requirement is met
 */
function checkMinSpacing(
  x: number,
  y: number,
  minSpacing: number,
  assetId: string,
  context: PlacementContext
): boolean {
  // Check if any assets of the same type are within minSpacing distance
  for (const asset of context.placedAssets) {
    if (asset.assetId === assetId) {
      const distance = Math.sqrt((asset.x - x) ** 2 + (asset.y - y) ** 2);
      if (distance < minSpacing) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Checks if density constraint is satisfied
 */
function checkDensityConstraint(
  x: number,
  y: number,
  assetDef: AssetDefinition,
  context: PlacementContext
): boolean {
  if (!assetDef.maxDensity) return true;
  
  const checkRadius = 50; // Check in 100x100 area (radius 50)
  const areaSize = Math.PI * checkRadius * checkRadius;
  const maxCount = Math.round((assetDef.maxDensity / 10000) * areaSize);
  
  let count = 0;
  for (const asset of context.placedAssets) {
    if (asset.assetId === assetDef.id) {
      const distance = Math.sqrt((asset.x - x) ** 2 + (asset.y - y) ** 2);
      if (distance <= checkRadius) {
        count++;
      }
    }
  }
  
  return count < maxCount;
}

/**
 * Checks if a position is near a biome edge
 */
function isNearBiomeEdge(x: number, y: number, biomeMap: BiomeMap): boolean {
  const currentBiome = getBiomeAt(biomeMap, x, y);
  
  // Check adjacent positions for different biomes
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const neighborBiome = getBiomeAt(biomeMap, x + dx, y + dy);
      if (neighborBiome !== currentBiome) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Helper function to get height at position with bounds checking
 */
function getHeightAt(heightMap: number[][], x: number, y: number): number {
  if (y < 0 || y >= heightMap.length || x < 0 || x >= heightMap[0].length) {
    return 0;
  }
  return heightMap[y][x];
}

/**
 * Helper function to get moisture at position with bounds checking
 */
function getMoistureAt(moistureMap: number[][], x: number, y: number): number {
  if (y < 0 || y >= moistureMap.length || x < 0 || x >= moistureMap[0].length) {
    return 0;
  }
  return moistureMap[y][x];
}

/**
 * Utility function to create custom asset definitions
 */
export function createAssetDefinition(
  id: string,
  name: string,
  src: string,
  options: Partial<Omit<AssetDefinition, 'id' | 'name' | 'src'>> = {}
): AssetDefinition {
  return {
    id,
    name,
    src,
    width: 1,
    height: 1,
    minSpacing: 2,
    maxDensity: 25,
    avoidWater: true,
    ...options
  };
}

/**
 * Utility function to create custom placement rules
 */
export function createPlacementRule(
  assetId: string,
  biomes: BiomeType[],
  probability: number,
  options: Partial<Omit<PlacementRule, 'assetId' | 'biomes' | 'probability'>> = {}
): PlacementRule {
  return {
    assetId,
    biomes,
    probability,
    clusterProbability: 0.3,
    clusterRadius: 2,
    clusterSize: 2,
    ...options
  };
}

/**
 * Predefined rule sets for different terrain types
 */
export const rulePresets = {
  forest: [
    createPlacementRule('tree', [BiomeType.FOREST], 0.5, {
      minMoisture: 0.6,
      clusterProbability: 0.8,
      clusterRadius: 4,
      clusterSize: 6
    }),
    createPlacementRule('rock', [BiomeType.FOREST], 0.1, {
      minHeight: 0.4
    })
  ],
  
  mountain: [
    createPlacementRule('rock', [BiomeType.MOUNTAIN, BiomeType.HILLS], 0.4, {
      minHeight: 0.5,
      clusterProbability: 0.6,
      clusterRadius: 3,
      clusterSize: 4
    }),
    createPlacementRule('tree', [BiomeType.HILLS], 0.1, {
      minMoisture: 0.5,
      maxHeight: 0.8
    })
  ],
  
  desert: [
    createPlacementRule('rock', [BiomeType.DESERT], 0.2, {
      maxMoisture: 0.4,
      clusterProbability: 0.3,
      clusterRadius: 5,
      clusterSize: 3
    })
  ],
  
  grassland: [
    createPlacementRule('tree', [BiomeType.GRASSLAND], 0.08, {
      minMoisture: 0.4,
      clusterProbability: 0.4,
      clusterRadius: 2,
      clusterSize: 3
    }),
    createPlacementRule('rock', [BiomeType.GRASSLAND], 0.03, {
      clusterProbability: 0.1
    })
  ]
};
