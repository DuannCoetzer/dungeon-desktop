"""
Tile entity definition for the model layer.

This module defines the Tile class which represents individual tiles
within the game map, containing both type information and state data.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .enums import TileType, BiomeType
from .assets import AssetInstance


@dataclass
class Tile:
    """
    Represents a single tile in the game map.
    
    A tile is the basic building block of the game world, containing
    information about its type, visual representation, and gameplay properties.
    """
    
    # Position in the map grid
    x: int
    y: int
    
    # Tile classification
    tile_type: TileType
    biome_type: BiomeType = BiomeType.DUNGEON
    
    # Visual representation
    asset_instances: List[AssetInstance] = None
    
    # Gameplay properties
    is_passable: bool = True
    is_transparent: bool = True  # For line of sight calculations
    movement_cost: float = 1.0  # Cost for pathfinding algorithms
    
    # Interactive properties
    is_interactive: bool = False
    interaction_range: float = 1.0
    
    # State information
    is_discovered: bool = False  # For fog of war
    is_visible: bool = False     # Currently visible to player
    
    # Tile-specific properties
    properties: Dict[str, Any] = None
    
    # Health/durability (for destructible tiles)
    max_health: Optional[float] = None
    current_health: Optional[float] = None
    
    def __post_init__(self):
        """Initialize default values for mutable fields and validate state."""
        if self.asset_instances is None:
            self.asset_instances = []
        
        if self.properties is None:
            self.properties = {}
        
        # Set default passability based on tile type
        if self.tile_type in [TileType.WALL, TileType.PIT, TileType.LAVA]:
            self.is_passable = False
        
        # Set default transparency based on tile type
        if self.tile_type == TileType.WALL:
            self.is_transparent = False
        
        # Set default health for destructible tiles
        if self.current_health is None and self.max_health is not None:
            self.current_health = self.max_health
    
    def is_destroyed(self) -> bool:
        """Check if the tile is destroyed (health <= 0)."""
        return (self.current_health is not None and 
                self.current_health <= 0)
    
    def damage(self, amount: float) -> bool:
        """
        Apply damage to the tile.
        
        Args:
            amount: Amount of damage to apply
            
        Returns:
            True if the tile was destroyed by this damage
        """
        if self.current_health is None:
            return False
        
        self.current_health = max(0, self.current_health - amount)
        
        # If destroyed, might change tile properties
        if self.is_destroyed():
            self._on_destroyed()
            return True
        
        return False
    
    def heal(self, amount: float) -> None:
        """
        Heal the tile by the specified amount.
        
        Args:
            amount: Amount of health to restore
        """
        if self.current_health is not None and self.max_health is not None:
            self.current_health = min(self.max_health, self.current_health + amount)
    
    def _on_destroyed(self) -> None:
        """Handle tile destruction effects."""
        # Could change tile type, add debris, trigger events, etc.
        if self.tile_type == TileType.WALL:
            self.is_passable = True
            self.is_transparent = True
            # Could change to debris or rubble tile type
    
    def add_asset_instance(self, asset_instance: AssetInstance) -> None:
        """Add an asset instance to this tile."""
        self.asset_instances.append(asset_instance)
    
    def remove_asset_instance(self, instance_id: str) -> bool:
        """
        Remove an asset instance by its ID.
        
        Args:
            instance_id: ID of the asset instance to remove
            
        Returns:
            True if an instance was removed, False otherwise
        """
        for i, instance in enumerate(self.asset_instances):
            if instance.instance_id == instance_id:
                self.asset_instances.pop(i)
                return True
        return False
    
    def get_asset_instance(self, instance_id: str) -> Optional[AssetInstance]:
        """Get an asset instance by its ID."""
        for instance in self.asset_instances:
            if instance.instance_id == instance_id:
                return instance
        return None
    
    def copy(self) -> 'Tile':
        """Create a deep copy of this tile."""
        # Create a new tile with copied basic properties
        new_tile = Tile(
            x=self.x,
            y=self.y,
            tile_type=self.tile_type,
            biome_type=self.biome_type,
            is_passable=self.is_passable,
            is_transparent=self.is_transparent,
            movement_cost=self.movement_cost,
            is_interactive=self.is_interactive,
            interaction_range=self.interaction_range,
            is_discovered=self.is_discovered,
            is_visible=self.is_visible,
            max_health=self.max_health,
            current_health=self.current_health,
            properties=self.properties.copy() if self.properties else {},
            asset_instances=[
                # Note: This creates a shallow copy of asset instances
                # For deep copy, would need to implement copy method on AssetInstance
                instance for instance in self.asset_instances
            ]
        )
        
        return new_tile
