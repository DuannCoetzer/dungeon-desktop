"""
Asset definition and instance interfaces for the model layer.

This module defines the structure for asset definitions and instances,
providing a rendering-agnostic way to manage game assets.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
import uuid


@dataclass
class AssetDefinition:
    """
    Defines an asset template that can be instantiated multiple times.
    
    This is a rendering-agnostic definition that contains all the metadata
    and properties needed to create asset instances.
    """
    
    id: str
    name: str
    asset_type: str  # e.g., "sprite", "animation", "tileset", "sound", "model"
    
    # Resource information
    resource_path: str
    resource_format: str  # e.g., "png", "jpg", "gif", "wav", "ogg", "fbx"
    
    # Dimensions (for visual assets)
    width: Optional[int] = None
    height: Optional[int] = None
    
    # Animation data (for animated assets)
    frame_count: Optional[int] = None
    frame_duration: Optional[float] = None  # Duration per frame in seconds
    animation_loop: bool = True
    
    # Tileset data (for tileset assets)
    tile_width: Optional[int] = None
    tile_height: Optional[int] = None
    tiles_per_row: Optional[int] = None
    
    # Metadata and properties
    tags: List[str] = None
    properties: Dict[str, Any] = None
    
    def __post_init__(self):
        """Initialize default values for mutable fields."""
        if self.tags is None:
            self.tags = []
        if self.properties is None:
            self.properties = {}


@dataclass
class AssetInstance:
    """
    Represents a specific instance of an asset definition.
    
    This contains instance-specific data such as position, rotation, scale,
    and other properties that may vary between different uses of the same asset.
    """
    
    instance_id: str
    asset_definition_id: str
    
    # Transform properties
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    # Rotation (in degrees)
    rotation: float = 0.0
    
    # Scale
    scale_x: float = 1.0
    scale_y: float = 1.0
    
    # Visual properties
    opacity: float = 1.0
    tint_color: Optional[str] = None  # Hex color string like "#FF0000"
    
    # Animation state (for animated assets)
    current_frame: int = 0
    animation_speed: float = 1.0  # Multiplier for animation speed
    is_playing: bool = True
    
    # Instance-specific properties
    properties: Dict[str, Any] = None
    
    # Layer information
    layer_index: int = 0
    z_index: int = 0  # For sorting within the same layer
    
    def __post_init__(self):
        """Initialize default values and generate instance ID if needed."""
        if self.properties is None:
            self.properties = {}
        
        if not self.instance_id:
            self.instance_id = str(uuid.uuid4())


class AssetManager(ABC):
    """
    Abstract base class for asset management.
    
    This interface defines the contract for loading, caching, and managing
    asset definitions and instances in a rendering-agnostic way.
    """
    
    @abstractmethod
    def load_asset_definition(self, asset_path: str) -> AssetDefinition:
        """Load an asset definition from a file or resource."""
        pass
    
    @abstractmethod
    def create_asset_instance(self, definition_id: str, **kwargs) -> AssetInstance:
        """Create a new instance of an asset definition."""
        pass
    
    @abstractmethod
    def get_asset_definition(self, definition_id: str) -> Optional[AssetDefinition]:
        """Retrieve an asset definition by its ID."""
        pass
    
    @abstractmethod
    def get_asset_instance(self, instance_id: str) -> Optional[AssetInstance]:
        """Retrieve an asset instance by its ID."""
        pass
    
    @abstractmethod
    def update_asset_instance(self, instance: AssetInstance) -> bool:
        """Update an existing asset instance."""
        pass
    
    @abstractmethod
    def remove_asset_instance(self, instance_id: str) -> bool:
        """Remove an asset instance."""
        pass
