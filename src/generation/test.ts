import {
  generateHeightmap,
  generateMoistureMap,
  assignBiomes,
  generateMapData,
  BiomeType,
  type GenerationParams
} from './noise';

/**
 * Simple test function to verify the noise generation system works
 */
export function testNoiseGeneration(): void {
  console.log('Testing noise-based terrain generation...');
  
  const params: GenerationParams = {
    width: 10,
    height: 10,
    seed: 42,
    waterLevel: 0.3,
    hillLevel: 0.6,
    mountainLevel: 0.8
  };
  
  try {
    // Test heightmap generation
    console.log('1. Testing heightmap generation...');
    const heightmap = generateHeightmap(params);
    
    if (heightmap.width !== params.width || heightmap.height !== params.height) {
      throw new Error('Heightmap dimensions do not match parameters');
    }
    
    // Verify all height values are between 0 and 1
    for (let y = 0; y < heightmap.height; y++) {
      for (let x = 0; x < heightmap.width; x++) {
        const height = heightmap.data[y][x];
        if (height < 0 || height > 1) {
          throw new Error(`Invalid height value: ${height} at (${x}, ${y})`);
        }
      }
    }
    console.log('✓ Heightmap generation successful');
    
    // Test moisture map generation
    console.log('2. Testing moisture map generation...');
    const moistureMap = generateMoistureMap(params);
    
    if (moistureMap.width !== params.width || moistureMap.height !== params.height) {
      throw new Error('Moisture map dimensions do not match parameters');
    }
    
    // Verify all moisture values are between 0 and 1
    for (let y = 0; y < moistureMap.height; y++) {
      for (let x = 0; x < moistureMap.width; x++) {
        const moisture = moistureMap.data[y][x];
        if (moisture < 0 || moisture > 1) {
          throw new Error(`Invalid moisture value: ${moisture} at (${x}, ${y})`);
        }
      }
    }
    console.log('✓ Moisture map generation successful');
    
    // Test biome assignment
    console.log('3. Testing biome assignment...');
    const biomeMap = assignBiomes(heightmap, moistureMap, params);
    
    if (biomeMap.width !== params.width || biomeMap.height !== params.height) {
      throw new Error('Biome map dimensions do not match parameters');
    }
    
    // Count different biomes
    const biomeCounts: Record<BiomeType, number> = {} as Record<BiomeType, number>;
    Object.values(BiomeType).forEach(biome => {
      biomeCounts[biome] = 0;
    });
    
    for (let y = 0; y < biomeMap.height; y++) {
      for (let x = 0; x < biomeMap.width; x++) {
        const biome = biomeMap.data[y][x];
        if (!Object.values(BiomeType).includes(biome)) {
          throw new Error(`Invalid biome type: ${biome} at (${x}, ${y})`);
        }
        biomeCounts[biome]++;
      }
    }
    
    console.log('✓ Biome assignment successful');
    console.log('Biome distribution:');
    Object.entries(biomeCounts).forEach(([biome, count]) => {
      if (count > 0) {
        console.log(`  ${biome}: ${count} tiles`);
      }
    });
    
    // Test complete map generation
    console.log('4. Testing complete map data generation...');
    const mapData = generateMapData(params);
    
    if (!mapData.tiles || !mapData.assetInstances || !mapData.version) {
      throw new Error('Invalid MapData structure');
    }
    
    // Verify we have tiles in at least one layer
    const totalTiles = Object.values(mapData.tiles).reduce(
      (sum, layer) => sum + Object.keys(layer).length, 0
    );
    
    if (totalTiles === 0) {
      throw new Error('No tiles generated in any layer');
    }
    
    console.log('✓ Complete map data generation successful');
    console.log(`Generated ${totalTiles} tiles across all layers`);
    
    // Log some sample data
    console.log('Sample heights:', heightmap.data[0].slice(0, 5).map(h => h.toFixed(3)));
    console.log('Sample moisture:', moistureMap.data[0].slice(0, 5).map(m => m.toFixed(3)));
    console.log('Sample biomes:', biomeMap.data[0].slice(0, 5));
    
    console.log('🎉 All tests passed! Noise generation system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test with different parameter combinations
 */
export function testParameterVariations(): void {
  console.log('Testing parameter variations...');
  
  const testCases: GenerationParams[] = [
    // Small map
    { width: 5, height: 5, seed: 1 },
    
    // Rectangular map
    { width: 20, height: 10, seed: 2 },
    
    // High frequency noise
    { width: 15, height: 15, seed: 3, heightFrequency: 0.1 },
    
    // Low frequency noise
    { width: 15, height: 15, seed: 4, heightFrequency: 0.01 },
    
    // Mostly water
    { width: 10, height: 10, seed: 5, waterLevel: 0.8 },
    
    // Mostly land
    { width: 10, height: 10, seed: 6, waterLevel: 0.1 },
    
    // Many octaves
    { width: 10, height: 10, seed: 7, heightOctaves: 8 },
    
    // Single octave
    { width: 10, height: 10, seed: 8, heightOctaves: 1 }
  ];
  
  testCases.forEach((params, index) => {
    try {
      console.log(`Test case ${index + 1}: ${params.width}x${params.height}`);
      const mapData = generateMapData(params);
      
      const totalTiles = Object.values(mapData.tiles).reduce(
        (sum, layer) => sum + Object.keys(layer).length, 0
      );
      
      console.log(`  Generated ${totalTiles} tiles`);
      
    } catch (error) {
      console.error(`  Failed: ${error}`);
      throw error;
    }
  });
  
  console.log('✓ All parameter variation tests passed');
}

// Export a combined test function
export function runAllTests(): void {
  testNoiseGeneration();
  testParameterVariations();
  console.log('🚀 All noise generation tests completed successfully!');
}
