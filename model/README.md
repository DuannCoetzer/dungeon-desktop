# Model Layer

The model layer contains all serializable, rendering-agnostic data structures for the dungeon game. This layer is completely independent of any rendering framework and focuses on representing the core game data.

## Overview

The model layer consists of the following main components:

### Core Data Structures

- **`MapData`**: Represents the complete game map with multiple layers, dimensions, spawn points, and metadata
- **`MapLayer`**: Individual layer containing a 2D grid of tiles with layer-specific properties
- **`Tile`**: Individual tile entity with type, state, visual assets, and gameplay properties
- **`AssetDefinition`**: Template for assets that can be instantiated (sprites, animations, sounds, etc.)
- **`AssetInstance`**: Specific instance of an asset with transform data and instance properties

### Enumerations

- **`TileType`**: Different types of tiles (FLOOR, WALL, DOOR, WATER, LAVA, etc.)
- **`BiomeType`**: Different biomes that influence appearance (DUNGEON, CAVE, FOREST, etc.)
- **`LayerType`**: Different layer types for organization (BACKGROUND, TERRAIN, OBJECTS, etc.)

### Abstract Interfaces

- **`AssetManager`**: Abstract base class for asset management operations

## Key Features

### 1. Layered Architecture
Maps support multiple layers with different purposes:
- Background layer for environment art
- Terrain layer for walkable/non-walkable tiles
- Objects layer for interactive elements
- Entity layer for characters and creatures
- Effects layer for visual effects
- UI layer for interface elements

### 2. Flexible Asset System
- Asset definitions can be shared across multiple instances
- Instance-specific properties for position, rotation, scale, opacity
- Support for animations with frame control
- Extensible properties system for custom data

### 3. Rich Tile Properties
- Passability and transparency for gameplay mechanics
- Movement cost for pathfinding algorithms
- Interactive properties for player interaction
- Health/durability system for destructible elements
- Fog of war support with discovered/visible states

### 4. Serialization Support
- All data structures can be converted to dictionaries
- JSON serialization support for save/load functionality
- Rendering-agnostic format for cross-platform compatibility

## Usage Example

```python
from model import MapData, Tile, TileType, BiomeType

# Create a new map
map_data = MapData(
    width=20, 
    height=20, 
    map_id="level_001",
    name="First Level"
)

# Get the terrain layer
terrain = map_data.get_layer("Terrain")

# Create and place a wall tile
wall_tile = Tile(
    x=0, y=0,
    tile_type=TileType.WALL,
    biome_type=BiomeType.DUNGEON
)
terrain.set_tile(0, 0, wall_tile)

# Add spawn point
map_data.add_spawn_point(10, 10)

# Serialize for saving
map_dict = map_data.to_dict()
```

## File Structure

```
model/
├── __init__.py          # Package initialization and exports
├── enums.py            # Enumeration definitions
├── assets.py           # Asset definitions and management
├── tile.py             # Tile entity class
├── map_data.py         # Map and layer classes
├── example.py          # Usage examples
└── README.md           # This documentation
```

## Design Principles

1. **Rendering Agnostic**: No dependencies on specific graphics libraries
2. **Serializable**: All data can be saved/loaded from JSON or similar formats
3. **Extensible**: Properties system allows for custom data without breaking changes
4. **Type Safe**: Uses enums and type hints for better development experience
5. **Memory Efficient**: Shared asset definitions reduce memory usage
6. **Performance Oriented**: Grid-based access patterns and efficient queries

## Next Steps

This model layer provides the foundation for:
- Save/Load system implementation
- Procedural map generation
- Game logic and mechanics
- Rendering system integration
- Network serialization for multiplayer
- Map editor tools

The model layer is complete and ready to be integrated with other game systems.
