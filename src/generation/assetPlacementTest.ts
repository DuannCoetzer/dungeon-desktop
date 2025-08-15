import {
  generateMapData,
  generateHeightmap,
  generateMoistureMap,
  assignBiomes,
  BiomeType,
  type GenerationParams
} from './noise';
import {
  placeAssetsByBiome,
  defaultAssetDefinitions,
  defaultPlacementRules,
  createPlacementRule,
  rulePresets
} from './assetPlacement';

/**
 * Simple test to verify the asset placement system works
 */
export function testAssetPlacement(): void {
  console.log('Testing Procedural Asset Placement System...\n');

  const params: GenerationParams = {
    width: 50,
    height: 50,
    seed: 12345,
    waterLevel: 0.3,
    hillLevel: 0.6,
    mountainLevel: 0.8,
    dryThreshold: 0.3,
    wetThreshold: 0.7
  };

  // Generate base map
  console.log('1. Generating base terrain...');
  const mapData = generateMapData(params);
  console.log(`   Base map created with ${Object.keys(mapData.tiles.floor).length} floor tiles`);

  // Generate heightmap, moisture map, and biome map for asset placement
  console.log('2. Generating biome data for asset placement...');
  const heightmap = generateHeightmap(params);
  const moistureMap = generateMoistureMap(params);
  const biomeMap = assignBiomes(heightmap, moistureMap, params);

  // Count biomes
  const biomeCounts: Record<BiomeType, number> = {} as Record<BiomeType, number>;
  Object.values(BiomeType).forEach(biome => {
    biomeCounts[biome] = 0;
  });

  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      biomeCounts[biomeMap.data[y][x]]++;
    }
  }

  console.log('   Biome distribution:');
  Object.entries(biomeCounts).forEach(([biome, count]) => {
    if (count > 0) {
      console.log(`     ${biome}: ${count} tiles`);
    }
  });

  // Test asset placement
  console.log('3. Testing asset placement with default rules...');
  const mapWithAssets = placeAssetsByBiome(
    mapData,
    defaultAssetDefinitions,
    defaultPlacementRules,
    biomeMap,
    heightmap.data,
    moistureMap.data
  );

  console.log(`   Placed ${mapWithAssets.assetInstances.length} assets total`);

  // Count assets by type
  const assetCounts: Record<string, number> = {};
  mapWithAssets.assetInstances.forEach(asset => {
    assetCounts[asset.assetId] = (assetCounts[asset.assetId] || 0) + 1;
  });

  console.log('   Asset distribution:');
  Object.entries(assetCounts).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });

  // Test custom rules
  console.log('4. Testing with forest preset rules...');
  const forestMap = placeAssetsByBiome(
    mapData,
    defaultAssetDefinitions,
    rulePresets.forest,
    biomeMap,
    heightmap.data,
    moistureMap.data
  );

  const forestAssetCounts: Record<string, number> = {};
  forestMap.assetInstances.forEach(asset => {
    forestAssetCounts[asset.assetId] = (forestAssetCounts[asset.assetId] || 0) + 1;
  });

  console.log(`   Forest preset placed ${forestMap.assetInstances.length} assets:`);
  Object.entries(forestAssetCounts).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });

  // Test single rule
  console.log('5. Testing single custom rule...');
  const singleRule = [
    createPlacementRule('tree', [BiomeType.GRASSLAND], 0.5, {
      clusterProbability: 0.8,
      clusterRadius: 3,
      clusterSize: 5
    })
  ];

  const customRuleMap = placeAssetsByBiome(
    mapData,
    defaultAssetDefinitions,
    singleRule,
    biomeMap,
    heightmap.data,
    moistureMap.data
  );

  console.log(`   Custom rule placed ${customRuleMap.assetInstances.length} trees in grassland`);

  // Verify asset instances have proper structure
  console.log('6. Validating asset instance structure...');
  if (mapWithAssets.assetInstances.length > 0) {
    const sampleAsset = mapWithAssets.assetInstances[0];
    const hasRequiredFields = 
      typeof sampleAsset.id === 'string' &&
      typeof sampleAsset.assetId === 'string' &&
      typeof sampleAsset.x === 'number' &&
      typeof sampleAsset.y === 'number' &&
      typeof sampleAsset.width === 'number' &&
      typeof sampleAsset.height === 'number' &&
      typeof sampleAsset.rotation === 'number';

    console.log(`   Asset structure validation: ${hasRequiredFields ? 'PASSED' : 'FAILED'}`);
    console.log(`   Sample asset: ${JSON.stringify(sampleAsset, null, 2)}`);
  } else {
    console.log('   No assets to validate');
  }

  console.log('\n✓ Asset placement system test completed successfully!');
}

/**
 * Performance test for asset placement
 */
export function testAssetPlacementPerformance(): void {
  console.log('Testing Asset Placement Performance...\n');

  const params: GenerationParams = {
    width: 100,
    height: 100,
    seed: 98765
  };

  console.log('Generating 100x100 map with full asset placement...');
  const startTime = performance.now();

  const mapData = generateMapData(params);
  const heightmap = generateHeightmap(params);
  const moistureMap = generateMoistureMap(params);
  const biomeMap = assignBiomes(heightmap, moistureMap, params);

  const placementStartTime = performance.now();
  const mapWithAssets = placeAssetsByBiome(
    mapData,
    defaultAssetDefinitions,
    defaultPlacementRules,
    biomeMap,
    heightmap.data,
    moistureMap.data
  );
  const placementEndTime = performance.now();

  const totalTime = placementEndTime - startTime;
  const placementTime = placementEndTime - placementStartTime;

  console.log(`Total generation time: ${totalTime.toFixed(2)}ms`);
  console.log(`Asset placement time: ${placementTime.toFixed(2)}ms`);
  console.log(`Assets placed: ${mapWithAssets.assetInstances.length}`);
  console.log(`Performance: ${(mapWithAssets.assetInstances.length / placementTime * 1000).toFixed(2)} assets/second`);

  console.log('\n✓ Performance test completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  testAssetPlacement();
  testAssetPlacementPerformance();
}
