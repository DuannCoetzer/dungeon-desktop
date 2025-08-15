# Protocol Layer

The Protocol Layer provides pure functions for map data manipulation without side effects or direct UI references. This layer serves as a clean interface between the data model and the user interface.

## Core Principles

- **Pure Functions**: All functions are pure with no side effects
- **Immutability**: Input data is never mutated; new objects are returned for modifications
- **No UI Dependencies**: Functions have no direct references to UI components or rendering
- **Predictable**: Same inputs always produce the same outputs
- **Testable**: Easy to unit test due to pure function design

## Main Functions

### `createEmptyMap(width, height, mapId?)`

Creates a new empty map with default layers.

```typescript
import { createEmptyMap } from './protocol';

const map = createEmptyMap(20, 15);
console.log(map.mapId); // Auto-generated ID
console.log(map.layers.length); // 3 default layers
```

### `updateTile(map, x, y, type, layerName?)`

Updates a tile at the specified coordinates, returning a new map.

```typescript
import { updateTile, TileType } from './protocol';

let map = createEmptyMap(10, 10);

// Add a wall at position (5, 3) on the Terrain layer
map = updateTile(map, 5, 3, TileType.WALL);

// Add a chest at position (2, 7) on the Objects layer
map = updateTile(map, 2, 7, TileType.CHEST, 'Objects');
```

### `placeAsset(map, assetInstance, layerName?)`

Places an asset instance on the map at the specified coordinates.

```typescript
import { placeAsset, generateId } from './protocol';

const asset = {
  instanceId: generateId(),
  assetDefinitionId: 'treasure-chest-01',
  x: 5,
  y: 3,
  opacity: 1.0,
  scaleX: 1.0,
  scaleY: 1.0
};

map = placeAsset(map, asset, 'Objects');
```

### `serializeMap(map)`

Converts a map to a JSON string for storage or transmission.

```typescript
import { serializeMap } from './protocol';

const jsonString = serializeMap(map);
localStorage.setItem('map-data', jsonString);
```

### `deserializeMap(json)`

Creates a map from a JSON string.

```typescript
import { deserializeMap } from './protocol';

const jsonString = localStorage.getItem('map-data');
const map = deserializeMap(jsonString);
```

## Types

### Core Enums

```typescript
enum TileType {
  FLOOR = 'floor',
  WALL = 'wall',
  DOOR = 'door',
  CHEST = 'chest',
  // ... and more
}

enum BiomeType {
  DUNGEON = 'dungeon',
  CAVE = 'cave',
  FOREST = 'forest',
  // ... and more
}

enum LayerType {
  BACKGROUND = 'background',
  TERRAIN = 'terrain',
  OBJECTS = 'objects',
  ENTITIES = 'entities',
  EFFECTS = 'effects',
  UI = 'ui'
}
```

### Key Interfaces

```typescript
interface MapData {
  width: number;
  height: number;
  mapId: string;
  name?: string;
  layers: MapLayer[];
  // ... other properties
}

interface Tile {
  x: number;
  y: number;
  tileType: TileType;
  biomeType?: BiomeType;
  assetInstances?: AssetInstance[];
  isPassable?: boolean;
  // ... other properties
}

interface AssetInstance {
  instanceId: string;
  assetDefinitionId: string;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  // ... other properties
}
```

## Utility Functions

The protocol layer also provides useful utility functions:

- `generateId()` - Generates unique identifiers
- `cloneDeep(obj)` - Creates deep copies of objects
- `deepEqual(obj1, obj2)` - Compares objects for deep equality
- `distance(x1, y1, x2, y2)` - Calculates Euclidean distance
- `manhattanDistance(x1, y1, x2, y2)` - Calculates Manhattan distance

## Usage Examples

### Creating a Simple Dungeon Room

```typescript
import { 
  createEmptyMap, 
  updateTile, 
  TileType, 
  serializeMap 
} from './protocol';

// Create a 10x8 map
let map = createEmptyMap(10, 8);

// Fill the border with walls
for (let x = 0; x < 10; x++) {
  map = updateTile(map, x, 0, TileType.WALL);
  map = updateTile(map, x, 7, TileType.WALL);
}

for (let y = 0; y < 8; y++) {
  map = updateTile(map, 0, y, TileType.WALL);
  map = updateTile(map, 9, y, TileType.WALL);
}

// Fill the interior with floor
for (let x = 1; x < 9; x++) {
  for (let y = 1; y < 7; y++) {
    map = updateTile(map, x, y, TileType.FLOOR);
  }
}

// Add a door
map = updateTile(map, 5, 0, TileType.DOOR);

// Add a chest in the center
map = updateTile(map, 5, 4, TileType.CHEST);

// Save the map
const mapJson = serializeMap(map);
```

### Working with Assets

```typescript
import { placeAsset, generateId } from './protocol';

// Create an asset instance
const decorativeVase = {
  instanceId: generateId(),
  assetDefinitionId: 'vase-01',
  x: 3,
  y: 2,
  scaleX: 0.8,
  scaleY: 0.8,
  rotation: 15
};

// Place it on the objects layer
map = placeAsset(map, decorativeVase, 'Objects');
```

## Integration with UI

The protocol layer is designed to work with any UI framework. Here's an example of how it might integrate with a React component:

```typescript
// In a React component
import { useState } from 'react';
import { createEmptyMap, updateTile, TileType } from './protocol';

function MapEditor() {
  const [map, setMap] = useState(() => createEmptyMap(20, 15));

  const handleTileClick = (x: number, y: number) => {
    // Pure function call - no side effects
    const newMap = updateTile(map, x, y, TileType.WALL);
    setMap(newMap);
  };

  return (
    <div>
      {/* Render map using map data */}
      {map.layers[1].tiles.map((row, y) =>
        row.map((tile, x) => (
          <div 
            key={`${x}-${y}`}
            onClick={() => handleTileClick(x, y)}
          >
            {tile?.tileType || 'empty'}
          </div>
        ))
      )}
    </div>
  );
}
```

## Testing

The pure function design makes the protocol layer easy to test:

```typescript
import { createEmptyMap, updateTile, TileType } from './protocol';

describe('Protocol Layer', () => {
  test('createEmptyMap creates valid map structure', () => {
    const map = createEmptyMap(5, 5);
    
    expect(map.width).toBe(5);
    expect(map.height).toBe(5);
    expect(map.layers).toHaveLength(3);
    expect(map.mapId).toBeDefined();
  });

  test('updateTile does not mutate original map', () => {
    const originalMap = createEmptyMap(3, 3);
    const newMap = updateTile(originalMap, 1, 1, TileType.WALL);
    
    expect(originalMap).not.toBe(newMap);
    expect(originalMap.layers[1].tiles[1][1]).toBeNull();
    expect(newMap.layers[1].tiles[1][1]?.tileType).toBe(TileType.WALL);
  });
});
```

## Performance Considerations

While the protocol layer prioritizes immutability and purity, be aware of performance implications:

- Deep cloning large maps can be expensive
- Consider using structural sharing libraries like Immutable.js for very large maps
- Batch operations when possible to minimize cloning overhead
- Use the provided utility functions for common operations
