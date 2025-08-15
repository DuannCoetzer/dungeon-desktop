// Export all noise generation functionality
export * from './noise';
export * from './assetPlacement';

// Re-export commonly used types and functions for convenience
export type {
  GenerationParams,
  Heightmap,
  MoistureMap,
  BiomeMap
} from './noise';

export type {
  AssetDefinition,
  PlacementRule
} from './assetPlacement';

export {
  BiomeType,
  generateHeightmap,
  generateMoistureMap,
  assignBiomes,
  generateMapData,
  generateMapDataWithAssets,
  generateAdvancedTerrain,
  getHeightAt,
  getMoistureAt,
  getBiomeAt,
  defaultGenerationParams
} from './noise';

export {
  placeAssetsByBiome,
  defaultAssetDefinitions,
  defaultPlacementRules,
  createAssetDefinition,
  createPlacementRule,
  rulePresets
} from './assetPlacement';
