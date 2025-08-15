# Noise-Based Terrain Generation

This module provides a comprehensive noise-based terrain generation system using Simplex noise to create realistic heightmaps, moisture maps, and biome assignments for procedurally generated maps.

## Features

- **Heightmap Generation**: Multi-octave Simplex noise for realistic terrain elevation
- **Moisture Map Generation**: Separate noise patterns for precipitation/humidity simulation
- **Biome Assignment**: Combines height and moisture to determine terrain types
- **MapData Integration**: Direct integration with the game's MapData protocol
- **Customizable Parameters**: Extensive configuration options for different terrain types
- **Advanced Terrain Generation**: Support for custom noise functions

## Basic Usage

```typescript
import { generateMapData, type GenerationParams } from './generation';
import { setMapData } from './protocol';

// Generate basic terrain
const params: GenerationParams = {
  width: 100,
  height: 100,
  seed: 12345,
  waterLevel: 0.3,
  hillLevel: 0.6,
  mountainLevel: 0.8
};

const mapData = generateMapData(params);
setMapData(mapData); // Apply to game map
```

## Core Functions

### `generateHeightmap(params: GenerationParams): Heightmap`

Generates a 2D heightmap using multiple octaves of Simplex noise. Heights are normalized to the range [0, 1].

### `generateMoistureMap(params: GenerationParams): MoistureMap`

Generates a 2D moisture map using separate noise patterns. Values are normalized to the range [0, 1].

### `assignBiomes(heightmap: Heightmap, moistureMap: MoistureMap, params?: GenerationParams): BiomeMap`

Assigns biome types based on height and moisture values using configurable thresholds:

- **Deep Water**: Very low height
- **Shallow Water**: Low height  
- **Beach**: Slightly above water level
- **Desert**: Mid height + low moisture
- **Grassland**: Mid height + mid moisture
- **Forest**: Mid height + high moisture
- **Hills**: High height
- **Mountain**: Very high height
- **Snow**: Highest peaks

### `generateMapData(params: GenerationParams): MapData`

Generates a complete MapData structure that can be directly used by the game engine. Converts biomes to appropriate tile types and layers.

## Generation Parameters

```typescript
interface GenerationParams {
  width: number;           // Map width in tiles
  height: number;          // Map height in tiles  
  seed?: number;           // Random seed for reproducible generation
  
  // Height generation
  heightOctaves?: number;      // Number of noise layers (default: 4)
  heightFrequency?: number;    // Base noise frequency (default: 0.02)
  heightAmplitude?: number;    // Noise amplitude (default: 1.0)
  heightPersistence?: number;  // Octave persistence (default: 0.5)
  
  // Moisture generation
  moistureOctaves?: number;      // Number of moisture layers (default: 3)
  moistureFrequency?: number;    // Base moisture frequency (default: 0.015)
  moistureAmplitude?: number;    // Moisture amplitude (default: 1.0)
  moisturePersistence?: number;  // Moisture persistence (default: 0.6)
  
  // Biome thresholds
  waterLevel?: number;      // Height below which is water (default: 0.3)
  beachLevel?: number;      // Height for beach transition (default: 0.35)
  hillLevel?: number;       // Height above which is hills (default: 0.6)
  mountainLevel?: number;   // Height above which is mountains (default: 0.8)
  
  // Moisture thresholds  
  dryThreshold?: number;    // Moisture below which is dry (default: 0.3)
  wetThreshold?: number;    // Moisture above which is wet (default: 0.7)
}
```

## Biome Types

```typescript
enum BiomeType {
  DEEP_WATER = 'deep_water',
  SHALLOW_WATER = 'shallow_water', 
  BEACH = 'beach',
  DESERT = 'desert',
  GRASSLAND = 'grassland',
  FOREST = 'forest',
  HILLS = 'hills',
  MOUNTAIN = 'mountain',
  SNOW = 'snow'
}
```

## Advanced Usage

### Custom Height Functions

```typescript
import { generateAdvancedTerrain } from './generation';

// Generate a circular island
const islandMap = generateAdvancedTerrain({
  width: 60,
  height: 60,
  customHeightFunction: (x, y, noise2D) => {
    const centerX = 30, centerY = 30;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const falloff = Math.max(0, 1 - (distance / 25));
    const noise = (noise2D(x * 0.05, y * 0.05) + 1) / 2;
    return falloff * noise;
  }
});
```

### Step-by-Step Generation

```typescript
import { generateHeightmap, generateMoistureMap, assignBiomes } from './generation';

// Generate components separately for analysis
const heightmap = generateHeightmap(params);
const moistureMap = generateMoistureMap(params);
const biomeMap = assignBiomes(heightmap, moistureMap, params);

// Analyze before converting to MapData
console.log('Average height:', 
  heightmap.data.flat().reduce((a, b) => a + b) / (params.width * params.height)
);
```

## Example Terrain Types

### Island Terrain
```typescript
const islandParams: GenerationParams = {
  width: 80, height: 80,
  waterLevel: 0.4, beachLevel: 0.45,
  heightFrequency: 0.03, heightOctaves: 5
};
```

### Mountainous Terrain
```typescript
const mountainParams: GenerationParams = {
  width: 100, height: 100,
  heightFrequency: 0.015, heightOctaves: 6,
  waterLevel: 0.2, hillLevel: 0.5, mountainLevel: 0.7
};
```

### Desert Terrain  
```typescript
const desertParams: GenerationParams = {
  width: 80, height: 80,
  waterLevel: 0.15, moistureAmplitude: 0.5,
  dryThreshold: 0.6, wetThreshold: 0.8
};
```

## Integration with Game Engine

The generated MapData directly integrates with the game's protocol system:

- **Floor Layer**: Water, beach, desert, grassland tiles
- **Walls Layer**: Hills, mountains, snow (blocking terrain)  
- **Objects Layer**: Forest tiles (trees as objects)
- **Assets Layer**: Empty (available for asset placement)

## Testing

Run the included tests to verify functionality:

```typescript
import { runAllTests } from './generation/test';
runAllTests(); // Runs comprehensive test suite
```

## Performance Considerations

- Generation time scales with map size (O(width × height × octaves))
- Larger maps (>200×200) may take several seconds to generate
- Consider using web workers for very large maps
- Memory usage is proportional to map area for intermediate data structures

## Future Enhancements

Potential improvements for the system:

- **Cave Generation**: Underground layer generation
- **River Systems**: Water flow simulation and river placement
- **Climate Zones**: Latitude-based climate variation
- **Erosion Simulation**: Post-processing for realistic terrain shaping
- **Structure Placement**: Automatic placement of villages, dungeons, etc.
- **Vegetation Density**: Sub-biome variation in forest coverage
