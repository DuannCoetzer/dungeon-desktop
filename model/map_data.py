"""
MapData definition for the model layer.

This module defines the MapData class which represents the complete game map
with multiple layers, dimensions, and tile management functionality.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Iterator
import json

from .enums import LayerType, BiomeType
from .tile import Tile
from .assets import AssetInstance


@dataclass
class MapLayer:
    """
    Represents a single layer of the map.
    
    Each layer contains a 2D grid of tiles and has properties that affect
    how the layer is rendered and interacted with.
    """
    
    layer_type: LayerType
    name: str
    width: int
    height: int
    
    # 2D grid of tiles [y][x] for row-major access
    tiles: List[List[Optional[Tile]]] = field(default_factory=list)
    
    # Layer properties
    is_visible: bool = True
    opacity: float = 1.0
    z_index: int = 0  # For layer ordering
    
    # Metadata
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize the tile grid if not provided."""
        if not self.tiles:
            self.tiles = [[None for _ in range(self.width)] 
                         for _ in range(self.height)]
    
    def get_tile(self, x: int, y: int) -> Optional[Tile]:
        """Get a tile at the specified coordinates."""
        if not self.is_valid_position(x, y):
            return None
        return self.tiles[y][x]
    
    def set_tile(self, x: int, y: int, tile: Optional[Tile]) -> bool:
        """Set a tile at the specified coordinates."""
        if not self.is_valid_position(x, y):
            return False
        
        self.tiles[y][x] = tile
        if tile:
            tile.x = x
            tile.y = y
        return True
    
    def is_valid_position(self, x: int, y: int) -> bool:
        """Check if the given coordinates are within the layer bounds."""
        return 0 <= x < self.width and 0 <= y < self.height
    
    def clear_tile(self, x: int, y: int) -> bool:
        """Clear a tile at the specified coordinates."""
        return self.set_tile(x, y, None)
    
    def get_tiles_in_area(self, x1: int, y1: int, x2: int, y2: int) -> List[Tuple[int, int, Optional[Tile]]]:
        """Get all tiles within the specified rectangular area."""
        tiles = []
        
        # Ensure coordinates are in correct order
        min_x, max_x = min(x1, x2), max(x1, x2)
        min_y, max_y = min(y1, y2), max(y1, y2)
        
        for y in range(max(0, min_y), min(self.height, max_y + 1)):
            for x in range(max(0, min_x), min(self.width, max_x + 1)):
                tiles.append((x, y, self.tiles[y][x]))
        
        return tiles
    
    def get_all_tiles(self) -> Iterator[Tuple[int, int, Optional[Tile]]]:
        """Iterate through all tile positions in the layer."""
        for y in range(self.height):
            for x in range(self.width):
                yield x, y, self.tiles[y][x]


@dataclass
class MapData:
    """
    Represents the complete game map with multiple layers.
    
    The MapData contains all layers, metadata, and provides methods for
    managing the map structure and accessing tiles across layers.
    """
    
    # Map dimensions
    width: int
    height: int
    
    # Map identification and metadata
    map_id: str
    name: str = "Untitled Map"
    description: str = ""
    
    # Layers (ordered by z_index for rendering)
    layers: List[MapLayer] = field(default_factory=list)
    
    # Default biome for the map
    default_biome: BiomeType = BiomeType.DUNGEON
    
    # Map-wide properties
    tile_width: int = 32   # Width of each tile in pixels (rendering hint)
    tile_height: int = 32  # Height of each tile in pixels (rendering hint)
    
    # Spawn and objective information
    spawn_points: List[Tuple[int, int]] = field(default_factory=list)
    exit_points: List[Tuple[int, int]] = field(default_factory=list)
    
    # Metadata and custom properties
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Initialize default layers if none provided."""
        if not self.layers:
            # Create default layers
            self.add_layer(LayerType.BACKGROUND, "Background")
            self.add_layer(LayerType.TERRAIN, "Terrain")
            self.add_layer(LayerType.OBJECTS, "Objects")
    
    def add_layer(self, layer_type: LayerType, name: str, z_index: Optional[int] = None) -> MapLayer:
        """Add a new layer to the map."""
        if z_index is None:
            z_index = len(self.layers)
        
        layer = MapLayer(
            layer_type=layer_type,
            name=name,
            width=self.width,
            height=self.height,
            z_index=z_index
        )
        
        self.layers.append(layer)
        self._sort_layers()
        return layer
    
    def get_layer(self, name: str) -> Optional[MapLayer]:
        """Get a layer by its name."""
        for layer in self.layers:
            if layer.name == name:
                return layer
        return None
    
    def get_layer_by_type(self, layer_type: LayerType) -> Optional[MapLayer]:
        """Get the first layer of the specified type."""
        for layer in self.layers:
            if layer.layer_type == layer_type:
                return layer
        return None
    
    def remove_layer(self, name: str) -> bool:
        """Remove a layer by its name."""
        for i, layer in enumerate(self.layers):
            if layer.name == name:
                self.layers.pop(i)
                return True
        return False
    
    def _sort_layers(self):
        """Sort layers by their z_index."""
        self.layers.sort(key=lambda layer: layer.z_index)
    
    def get_tile(self, x: int, y: int, layer_name: str) -> Optional[Tile]:
        """Get a tile from a specific layer."""
        layer = self.get_layer(layer_name)
        if layer:
            return layer.get_tile(x, y)
        return None
    
    def get_tiles_at_position(self, x: int, y: int) -> List[Tuple[MapLayer, Optional[Tile]]]:
        """Get all tiles at a specific position across all layers."""
        tiles = []
        for layer in self.layers:
            tiles.append((layer, layer.get_tile(x, y)))
        return tiles
    
    def set_tile(self, x: int, y: int, layer_name: str, tile: Optional[Tile]) -> bool:
        """Set a tile in a specific layer."""
        layer = self.get_layer(layer_name)
        if layer:
            return layer.set_tile(x, y, tile)
        return False
    
    def is_valid_position(self, x: int, y: int) -> bool:
        """Check if the given coordinates are within the map bounds."""
        return 0 <= x < self.width and 0 <= y < self.height
    
    def add_spawn_point(self, x: int, y: int) -> bool:
        """Add a spawn point if the position is valid."""
        if self.is_valid_position(x, y):
            self.spawn_points.append((x, y))
            return True
        return False
    
    def add_exit_point(self, x: int, y: int) -> bool:
        """Add an exit point if the position is valid."""
        if self.is_valid_position(x, y):
            self.exit_points.append((x, y))
            return True
        return False
    
    def get_passable_tiles(self, layer_name: str = "Terrain") -> List[Tuple[int, int, Tile]]:
        """Get all passable tiles from the specified layer."""
        layer = self.get_layer(layer_name)
        if not layer:
            return []
        
        passable_tiles = []
        for x, y, tile in layer.get_all_tiles():
            if tile and tile.is_passable:
                passable_tiles.append((x, y, tile))
        
        return passable_tiles
    
    def resize(self, new_width: int, new_height: int) -> None:
        """Resize the map and all its layers."""
        old_width, old_height = self.width, self.height
        self.width, self.height = new_width, new_height
        
        for layer in self.layers:
            # Create new tile grid
            new_tiles = [[None for _ in range(new_width)] 
                        for _ in range(new_height)]
            
            # Copy existing tiles that fit in the new dimensions
            copy_width = min(old_width, new_width)
            copy_height = min(old_height, new_height)
            
            for y in range(copy_height):
                for x in range(copy_width):
                    new_tiles[y][x] = layer.tiles[y][x]
            
            layer.tiles = new_tiles
            layer.width = new_width
            layer.height = new_height
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the map data to a dictionary for serialization."""
        return {
            "map_id": self.map_id,
            "name": self.name,
            "description": self.description,
            "width": self.width,
            "height": self.height,
            "default_biome": self.default_biome.name,
            "tile_width": self.tile_width,
            "tile_height": self.tile_height,
            "spawn_points": self.spawn_points,
            "exit_points": self.exit_points,
            "properties": self.properties,
            "layers": [
                {
                    "layer_type": layer.layer_type.name,
                    "name": layer.name,
                    "width": layer.width,
                    "height": layer.height,
                    "is_visible": layer.is_visible,
                    "opacity": layer.opacity,
                    "z_index": layer.z_index,
                    "properties": layer.properties,
                    # Note: Tile serialization would need to be implemented
                    # based on specific requirements
                }
                for layer in self.layers
            ]
        }
    
    def to_json(self) -> str:
        """Convert the map data to a JSON string."""
        return json.dumps(self.to_dict(), indent=2)
