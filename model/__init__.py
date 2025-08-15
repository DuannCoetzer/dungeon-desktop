"""
Model Layer Package

This package contains all the serializable, rendering-agnostic data structures
for the dungeon game, including maps, tiles, assets, and enums.

Main Classes:
- MapData: Complete game map with multiple layers
- MapLayer: Individual layer containing tiles
- Tile: Individual tile entity with properties and state
- AssetDefinition: Template for assets that can be instantiated
- AssetInstance: Specific instance of an asset with transform and state
- AssetManager: Abstract interface for asset management

Enums:
- TileType: Different types of tiles (FLOOR, WALL, DOOR, etc.)
- BiomeType: Different biomes (DUNGEON, CAVE, FOREST, etc.)
- LayerType: Different layer types (BACKGROUND, TERRAIN, OBJECTS, etc.)
"""

from .enums import TileType, BiomeType, LayerType
from .assets import AssetDefinition, AssetInstance, AssetManager
from .tile import Tile
from .map_data import MapData, MapLayer

__all__ = [
    # Enums
    'TileType',
    'BiomeType', 
    'LayerType',
    
    # Asset classes
    'AssetDefinition',
    'AssetInstance',
    'AssetManager',
    
    # Core entities
    'Tile',
    'MapData',
    'MapLayer',
]

# Version information
__version__ = '1.0.0'
