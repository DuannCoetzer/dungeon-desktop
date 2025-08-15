# Procedural Asset Placement System

This document describes the procedural asset placement system implemented in Step 7 of the dungeon generation plan.

## Overview

The asset placement system automatically places assets (trees, rocks, chests, etc.) on generated maps based on biome types, environmental conditions, and configurable rules.

## Key Components

### 1. Core Function: `placeAssetsByBiome`

```typescript
function placeAssetsByBiome(
  map: MapData,
  assetDefs: AssetDefinition[],
  rules: PlacementRule[], 
  biomeMap: BiomeMap,
  heightMap?: number[][],
  moistureMap?: number[][]
): MapData
```

This is the main function that processes placement rules and places assets on the map based on biome compatibility and environmental conditions.

### 2. Asset Definitions

```typescript
interface AssetDefinition {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  // Placement constraints
  minSpacing?: number;
  maxDensity?: number;
  avoidWater?: boolean;
  preferEdges?: boolean;
}
```

Defines the properties and constraints for each asset type.

### 3. Placement Rules

```typescript
interface PlacementRule {
  assetId: string;
  biomes: BiomeType[];
  probability: number;
  minHeight?: number;
  maxHeight?: number;
  minMoisture?: number;
  maxMoisture?: number;
  clusterProbability?: number;
  clusterRadius?: number;
  clusterSize?: number;
}
```

Rules that determine where and how assets are placed based on biome types and environmental conditions.

## Features

### 1. Biome-Based Placement
- Assets are placed only in compatible biomes
- Different rules for different biomes (e.g., trees in forests, rocks in mountains)

### 2. Environmental Constraints
- Height-based placement (e.g., rocks above certain elevation)
- Moisture-based placement (e.g., trees in wet areas)
- Water avoidance for land-based assets

### 3. Spacing and Density Control
- Minimum spacing between similar assets
- Maximum density limits to prevent overcrowding
- Configurable per asset type

### 4. Clustering
- Assets can be placed in clusters for natural grouping
- Configurable cluster size and radius
- Reduced probability for cluster members

### 5. Edge Preference
- Some assets (like treasure chests) can prefer biome edges
- Creates more interesting placement patterns

## Usage Examples

### Basic Usage
```typescript
import { 
  placeAssetsByBiome, 
  defaultAssetDefinitions, 
  defaultPlacementRules 
} from './generation/assetPlacement';

const mapWithAssets = placeAssetsByBiome(
  mapData,
  defaultAssetDefinitions,
  defaultPlacementRules,
  biomeMap,
  heightMap.data,
  moistureMap.data
);
```

### With Automatic Generation
```typescript
import { generateMapDataWithAssets } from './generation';

const params = {
  width: 60,
  height: 60,
  seed: 12345,
  includeAssets: true
};

const mapData = generateMapDataWithAssets(params);
```

### Custom Rules
```typescript
import { createPlacementRule, BiomeType } from './generation';

const customRules = [
  createPlacementRule('tree', [BiomeType.FOREST], 0.5, {
    minMoisture: 0.6,
    clusterProbability: 0.8,
    clusterRadius: 4,
    clusterSize: 6
  })
];
```

## Default Assets and Rules

### Assets
- **Trees**: 1x1, avoid water, min spacing 2, max density 30
- **Rocks**: 1x1, avoid water, min spacing 3, max density 20  
- **Chests**: 1x1, avoid water, prefer edges, min spacing 10, max density 5

### Rules
- Trees in forests (40% probability, clusters)
- Trees in grasslands (10% probability, small clusters)
- Rocks in mountains/hills (30% probability, clusters)
- Rocks in desert (15% probability, loose clusters)
- Chests rare in various biomes (0.5% probability)

## Rule Presets

Pre-configured rule sets for different terrain types:

- `rulePresets.forest` - Dense tree placement
- `rulePresets.mountain` - Rock formations  
- `rulePresets.desert` - Sparse rock placement
- `rulePresets.grassland` - Light tree/rock scatter

## Integration

The system integrates seamlessly with the existing generation pipeline:

1. Generate base terrain (heightmap, moisture, biomes)
2. Convert biomes to tiles
3. Apply asset placement rules
4. Return augmented MapData with populated `assetInstances`

## Performance

- Efficient O(width × height) scanning
- Smart density checking with radius-based limits
- Clustering reduces redundant placement attempts
- Suitable for maps up to 200x200 tiles

## Testing

Run the test suite to verify functionality:

```typescript
import { testAssetPlacement } from './generation/assetPlacementTest';
testAssetPlacement();
```

## Future Enhancements

Potential improvements:
- Multi-tile assets (buildings, large trees)
- Asset orientation/rotation based on terrain
- Resource-based placement (ore near mountains)
- Biome transition effects
- Seasonal variation rules
