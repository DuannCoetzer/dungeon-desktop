"""
Example usage of the model layer.

This script demonstrates how to create and work with the model layer
data structures in a rendering-agnostic way.
"""

from . import (
    MapData, MapLayer, Tile,
    AssetDefinition, AssetInstance,
    TileType, BiomeType, LayerType
)


def create_simple_map():
    """Create a simple example map with tiles and assets."""
    
    # Create a map
    map_data = MapData(
        width=10,
        height=10,
        map_id="example_map_001",
        name="Simple Dungeon Room",
        description="A basic 10x10 room with walls and floor"
    )
    
    print(f"Created map: {map_data.name} ({map_data.width}x{map_data.height})")
    print(f"Default layers: {[layer.name for layer in map_data.layers]}")
    
    # Get the terrain layer
    terrain_layer = map_data.get_layer("Terrain")
    
    # Fill the map with floor tiles, add walls around the edges
    for y in range(map_data.height):
        for x in range(map_data.width):
            # Determine tile type
            if x == 0 or x == map_data.width - 1 or y == 0 or y == map_data.height - 1:
                tile_type = TileType.WALL
            else:
                tile_type = TileType.FLOOR
            
            # Create and place the tile
            tile = Tile(
                x=x,
                y=y,
                tile_type=tile_type,
                biome_type=BiomeType.DUNGEON
            )
            
            terrain_layer.set_tile(x, y, tile)
    
    # Add a door in the middle of the south wall
    door_tile = Tile(
        x=map_data.width // 2,
        y=map_data.height - 1,
        tile_type=TileType.DOOR,
        biome_type=BiomeType.DUNGEON
    )
    terrain_layer.set_tile(door_tile.x, door_tile.y, door_tile)
    
    # Add spawn and exit points
    map_data.add_spawn_point(map_data.width // 2, map_data.height // 2)
    map_data.add_exit_point(map_data.width // 2, map_data.height - 1)
    
    return map_data


def create_asset_examples():
    """Create example asset definitions and instances."""
    
    # Create asset definitions
    wall_asset = AssetDefinition(
        id="wall_stone_001",
        name="Stone Wall",
        asset_type="sprite",
        resource_path="assets/tiles/wall_stone.png",
        resource_format="png",
        width=32,
        height=32,
        tags=["wall", "stone", "dungeon"],
        properties={"solid": True, "destructible": False}
    )
    
    floor_asset = AssetDefinition(
        id="floor_stone_001", 
        name="Stone Floor",
        asset_type="sprite",
        resource_path="assets/tiles/floor_stone.png",
        resource_format="png",
        width=32,
        height=32,
        tags=["floor", "stone", "dungeon"]
    )
    
    # Create asset instances
    wall_instance = AssetInstance(
        instance_id="wall_inst_001",
        asset_definition_id=wall_asset.id,
        x=0.0,
        y=0.0,
        layer_index=1
    )
    
    floor_instance = AssetInstance(
        instance_id="floor_inst_001",
        asset_definition_id=floor_asset.id,
        x=32.0,
        y=32.0,
        layer_index=0
    )
    
    return [wall_asset, floor_asset], [wall_instance, floor_instance]


def demonstrate_model_usage():
    """Demonstrate the model layer functionality."""
    
    print("=== Model Layer Example ===\n")
    
    # Create a simple map
    print("1. Creating a simple map...")
    map_data = create_simple_map()
    
    # Display map statistics
    terrain_layer = map_data.get_layer("Terrain")
    wall_count = 0
    floor_count = 0
    
    for x, y, tile in terrain_layer.get_all_tiles():
        if tile:
            if tile.tile_type == TileType.WALL:
                wall_count += 1
            elif tile.tile_type == TileType.FLOOR:
                floor_count += 1
    
    print(f"Map contains: {wall_count} walls, {floor_count} floor tiles")
    print(f"Spawn points: {map_data.spawn_points}")
    print(f"Exit points: {map_data.exit_points}")
    
    # Create asset examples
    print("\n2. Creating asset examples...")
    asset_defs, asset_instances = create_asset_examples()
    
    print(f"Created {len(asset_defs)} asset definitions:")
    for asset in asset_defs:
        print(f"  - {asset.name} ({asset.asset_type})")
    
    print(f"Created {len(asset_instances)} asset instances:")
    for instance in asset_instances:
        print(f"  - Instance at ({instance.x}, {instance.y})")
    
    # Add assets to tiles
    print("\n3. Associating assets with tiles...")
    wall_tile = terrain_layer.get_tile(0, 0)  # Get corner wall tile
    floor_tile = terrain_layer.get_tile(1, 1)  # Get floor tile
    
    if wall_tile:
        wall_tile.add_asset_instance(asset_instances[0])  # wall instance
        print(f"Added asset to wall tile at (0, 0)")
    
    if floor_tile:
        floor_tile.add_asset_instance(asset_instances[1])  # floor instance
        print(f"Added asset to floor tile at (1, 1)")
    
    # Demonstrate tile queries
    print("\n4. Querying tiles...")
    passable_tiles = map_data.get_passable_tiles("Terrain")
    print(f"Found {len(passable_tiles)} passable tiles")
    
    # Get tiles in a specific area
    area_tiles = terrain_layer.get_tiles_in_area(0, 0, 2, 2)
    print(f"Tiles in area (0,0) to (2,2): {len(area_tiles)} tiles")
    
    # Demonstrate serialization
    print("\n5. Serialization example...")
    map_dict = map_data.to_dict()
    print(f"Map serialized to dictionary with {len(map_dict)} top-level keys:")
    for key in map_dict.keys():
        print(f"  - {key}")
    
    print("\n=== Example Complete ===")


if __name__ == "__main__":
    demonstrate_model_usage()
