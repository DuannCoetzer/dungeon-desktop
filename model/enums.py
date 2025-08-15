"""
Enumeration definitions for the model layer.

This module contains all enum types used throughout the model layer
to ensure type safety and provide clear semantic meaning.
"""

from enum import Enum, auto


class TileType(Enum):
    """Defines the different types of tiles that can exist in the map."""
    
    # Terrain types
    FLOOR = auto()
    WALL = auto()
    DOOR = auto()
    WATER = auto()
    LAVA = auto()
    PIT = auto()
    STAIRS_UP = auto()
    STAIRS_DOWN = auto()
    
    # Interactive elements
    CHEST = auto()
    SWITCH = auto()
    PRESSURE_PLATE = auto()
    TRAP = auto()
    
    # Special tiles
    SPAWN_POINT = auto()
    EXIT = auto()
    TELEPORTER = auto()


class BiomeType(Enum):
    """Defines the different biome types that influence tile appearance and behavior."""
    
    DUNGEON = auto()
    CAVE = auto()
    FOREST = auto()
    DESERT = auto()
    ICE = auto()
    VOLCANIC = auto()
    SWAMP = auto()
    RUINS = auto()
    UNDERWATER = auto()
    ETHEREAL = auto()


class LayerType(Enum):
    """Defines the different layers that can exist in a map."""
    
    BACKGROUND = auto()
    TERRAIN = auto()
    OBJECTS = auto()
    ENTITIES = auto()
    EFFECTS = auto()
    UI = auto()
