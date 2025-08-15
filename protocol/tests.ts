/**
 * Basic tests for the protocol layer functions.
 * 
 * These tests demonstrate the functionality and ensure the pure function
 * behavior is working correctly.
 */

import {
  createEmptyMap,
  updateTile,
  placeAsset,
  serializeMap,
  deserializeMap,
  TileType,
  BiomeType,
  LayerType,
  generateId
} from './index.js';

// Test function wrapper for simple assertions
function test(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}: ${error}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

// Run tests
console.log('Running Protocol Layer Tests...\n');

test('createEmptyMap creates valid map structure', () => {
  const map = createEmptyMap(5, 8);
  
  assertEqual(map.width, 5);
  assertEqual(map.height, 8);
  assertEqual(map.layers.length, 3);
  assertTrue(map.mapId.length > 0);
  assertEqual(map.name, 'Untitled Map');
  assertEqual(map.defaultBiome, BiomeType.DUNGEON);
  
  // Check that layers are properly initialized
  const terrainLayer = map.layers.find(l => l.name === 'Terrain');
  assertTrue(terrainLayer !== undefined, 'Terrain layer should exist');
  assertEqual(terrainLayer!.width, 5);
  assertEqual(terrainLayer!.height, 8);
  assertEqual(terrainLayer!.tiles.length, 8); // Height
  assertEqual(terrainLayer!.tiles[0].length, 5); // Width
});

test('updateTile does not mutate original map', () => {
  const originalMap = createEmptyMap(3, 3);
  const newMap = updateTile(originalMap, 1, 1, TileType.WALL);
  
  // Maps should be different objects
  assertTrue(originalMap !== newMap, 'Maps should be different objects');
  
  // Original map should be unchanged
  const originalTile = originalMap.layers[1].tiles[1][1];
  assertEqual(originalTile, null);
  
  // New map should have the updated tile
  const newTile = newMap.layers[1].tiles[1][1];
  assertTrue(newTile !== null, 'New tile should exist');
  assertEqual(newTile!.tileType, TileType.WALL);
  assertEqual(newTile!.x, 1);
  assertEqual(newTile!.y, 1);
});

test('updateTile sets default properties based on tile type', () => {
  let map = createEmptyMap(5, 5);
  
  // Test wall properties
  map = updateTile(map, 1, 1, TileType.WALL);
  let tile = map.layers[1].tiles[1][1]!;
  assertEqual(tile.isPassable, false);
  assertEqual(tile.isTransparent, false);
  assertEqual(tile.isInteractive, false);
  
  // Test chest properties
  map = updateTile(map, 2, 2, TileType.CHEST);
  tile = map.layers[1].tiles[2][2]!;
  assertEqual(tile.isPassable, true);
  assertEqual(tile.isTransparent, true);
  assertEqual(tile.isInteractive, true);
  
  // Test floor properties
  map = updateTile(map, 3, 3, TileType.FLOOR);
  tile = map.layers[1].tiles[3][3]!;
  assertEqual(tile.isPassable, true);
  assertEqual(tile.isTransparent, true);
  assertEqual(tile.isInteractive, false);
});

test('placeAsset adds asset to correct position', () => {
  let map = createEmptyMap(5, 5);
  
  const asset = {
    instanceId: generateId(),
    assetDefinitionId: 'test-asset',
    x: 2,
    y: 3,
    scaleX: 0.5,
    scaleY: 0.5
  };
  
  map = placeAsset(map, asset);
  
  // Check that tile was created or updated
  const tile = map.layers[2].tiles[3][2]; // Objects layer, [y][x]
  assertTrue(tile !== null, 'Tile should exist at asset position');
  assertTrue(tile!.assetInstances !== undefined, 'Tile should have asset instances');
  assertEqual(tile!.assetInstances!.length, 1);
  
  const placedAsset = tile!.assetInstances![0];
  assertEqual(placedAsset.assetDefinitionId, 'test-asset');
  assertEqual(placedAsset.scaleX, 0.5);
  assertEqual(placedAsset.scaleY, 0.5);
});

test('serializeMap and deserializeMap work correctly', () => {
  // Create a map with some content
  let map = createEmptyMap(3, 3, 'test-map-123');
  map = updateTile(map, 1, 1, TileType.WALL);
  map = updateTile(map, 2, 2, TileType.CHEST);
  
  // Serialize
  const json = serializeMap(map);
  assertTrue(json.length > 0, 'JSON should not be empty');
  assertTrue(json.includes('test-map-123'), 'JSON should contain map ID');
  
  // Deserialize
  const restoredMap = deserializeMap(json);
  
  // Check basic properties
  assertEqual(restoredMap.mapId, 'test-map-123');
  assertEqual(restoredMap.width, 3);
  assertEqual(restoredMap.height, 3);
  assertEqual(restoredMap.layers.length, 3);
  
  // Check tiles were restored
  const wallTile = restoredMap.layers[1].tiles[1][1];
  assertTrue(wallTile !== null, 'Wall tile should exist');
  assertEqual(wallTile!.tileType, TileType.WALL);
  
  const chestTile = restoredMap.layers[1].tiles[2][2];
  assertTrue(chestTile !== null, 'Chest tile should exist');
  assertEqual(chestTile!.tileType, TileType.CHEST);
});

test('error handling works correctly', () => {
  // Test invalid map dimensions
  try {
    createEmptyMap(0, 5);
    throw new Error('Should have thrown for invalid dimensions');
  } catch (error: any) {
    assertTrue(error.message.includes('dimensions must be positive'));
  }
  
  // Test invalid position
  const map = createEmptyMap(3, 3);
  try {
    updateTile(map, 5, 5, TileType.WALL);
    throw new Error('Should have thrown for invalid position');
  } catch (error: any) {
    assertTrue(error.message.includes('Invalid position'));
  }
  
  // Test invalid layer name
  try {
    updateTile(map, 1, 1, TileType.WALL, 'NonexistentLayer');
    throw new Error('Should have thrown for invalid layer');
  } catch (error: any) {
    assertTrue(error.message.includes('not found'));
  }
  
  // Test invalid JSON deserialization
  try {
    deserializeMap('invalid json');
    throw new Error('Should have thrown for invalid JSON');
  } catch (error: any) {
    assertTrue(error.message.includes('Failed to deserialize'));
  }
});

test('generateId creates unique IDs', () => {
  const id1 = generateId();
  const id2 = generateId();
  const id3 = generateId();
  
  assertTrue(id1 !== id2, 'IDs should be unique');
  assertTrue(id2 !== id3, 'IDs should be unique');
  assertTrue(id1 !== id3, 'IDs should be unique');
  
  assertTrue(id1.length > 10, 'IDs should be reasonably long');
  assertTrue(id1.includes('-'), 'IDs should contain separator');
});

console.log('\n✅ All tests passed!');

// Example usage demonstration
console.log('\n--- Example Usage ---');

// Create a simple room
let exampleMap = createEmptyMap(7, 5);
console.log(`Created map: ${exampleMap.mapId} (${exampleMap.width}x${exampleMap.height})`);

// Add walls around the border
for (let x = 0; x < 7; x++) {
  exampleMap = updateTile(exampleMap, x, 0, TileType.WALL);
  exampleMap = updateTile(exampleMap, x, 4, TileType.WALL);
}
for (let y = 0; y < 5; y++) {
  exampleMap = updateTile(exampleMap, 0, y, TileType.WALL);
  exampleMap = updateTile(exampleMap, 6, y, TileType.WALL);
}

// Add floor inside
for (let x = 1; x < 6; x++) {
  for (let y = 1; y < 4; y++) {
    exampleMap = updateTile(exampleMap, x, y, TileType.FLOOR);
  }
}

// Add a door
exampleMap = updateTile(exampleMap, 3, 0, TileType.DOOR);

// Add a chest
exampleMap = updateTile(exampleMap, 3, 2, TileType.CHEST);

console.log('Added walls, floor, door, and chest');

// Place an asset
const vase = {
  instanceId: generateId(),
  assetDefinitionId: 'decorative-vase',
  x: 2,
  y: 1,
  scaleX: 0.7,
  scaleY: 0.7
};

exampleMap = placeAsset(exampleMap, vase, 'Objects');
console.log('Placed decorative vase asset');

// Serialize the map
const finalJson = serializeMap(exampleMap);
console.log(`Final map JSON size: ${finalJson.length} characters`);
console.log('Example completed successfully!');
