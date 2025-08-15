# Advanced Drawing Tools

This document describes the advanced drawing tools implemented for the dungeon tile editor.

## Tools Overview

### Line Tool (⟍)
- **Purpose**: Draw straight lines between two points using Bresenham's line algorithm
- **Usage**: 
  - Click and drag from start to end point
  - Release to commit the line
- **Preview**: Shows blue preview tiles along the line path
- **Algorithm**: Uses Bresenham's line algorithm for pixel-perfect line drawing

### Circle Tool (○)
- **Purpose**: Draw circles with center/radius using midpoint circle algorithm
- **Usage**:
  - Click to set center point
  - Drag to set radius (distance from center to mouse)
  - Hold Shift while clicking to create filled circles instead of outline
  - Release to commit the circle
- **Preview**: Shows blue preview tiles and red radius line
- **Algorithm**: Uses midpoint circle algorithm for efficient circle rendering

### Polygon Tool (⬟)
- **Purpose**: Create custom polygons with multiple vertices
- **Usage**:
  - Click to place vertices one by one
  - Hold Shift on first click to create filled polygons instead of outline
  - Double-click to close and commit the polygon (minimum 3 vertices required)
  - Switching tools will reset any incomplete polygon
- **Preview**: Shows red vertex markers, blue connecting lines, and preview of final shape
- **Algorithm**: Uses ray casting for point-in-polygon testing and line drawing between vertices

### Freehand Tool (✎)
- **Purpose**: Draw freeform strokes with variable brush sizes
- **Usage**:
  - Click and drag to draw
  - Hold Shift for 3-tile brush, Ctrl for 2-tile brush, or normal click for 1-tile brush
  - Uses Bresenham lines between mouse positions to prevent gaps
- **Preview**: Shows blue stroke path and brush preview
- **Algorithm**: Uses Bresenham lines to fill gaps between rapid mouse movements

## Technical Implementation

### Algorithms Module (`algorithms.ts`)
Contains optimized drawing algorithms:
- **Bresenham Line**: Efficient line drawing without floating point arithmetic
- **Midpoint Circle**: Memory-efficient circle drawing with 8-way symmetry
- **Point-in-Polygon**: Ray casting algorithm for polygon fill testing
- **Polygon Fill**: Bounding box optimization with point-in-polygon testing
- **Polygon Stroke**: Line drawing between consecutive vertices

### Tool Architecture
Each tool implements the `Tool` interface with methods:
- `onDown()`: Handle pointer press events
- `onMove()`: Handle pointer movement
- `onUp()`: Handle pointer release and commit changes
- `renderPreview()`: Draw tool-specific preview overlays
- `onWheel()`: Handle scroll events (unused by these tools)

### UI Integration
- Tools are registered in `ToolManager` and available via the sidebar toolbar
- Tool switching includes cleanup for stateful tools (like PolygonTool)
- Middle mouse button panning is preserved (Shift key reserved for tool modifiers)
- All tools respect current layer and tile type selection

### Performance Considerations
- Duplicate point removal to prevent redundant tile placement
- Efficient canvas rendering with proper state management
- Algorithm optimizations for large shapes and fast drawing
- Preview rendering separated from final tile commitment

## Usage Tips

1. **Line Tool**: Great for drawing walls, corridors, and straight edges
2. **Circle Tool**: Perfect for rooms, towers, and circular areas. Use Shift for filled areas
3. **Polygon Tool**: Ideal for irregular rooms and complex shapes. Plan your vertices before starting
4. **Freehand Tool**: Best for organic shapes and quick sketching. Use different brush sizes for varied effects

## Keyboard Shortcuts

- **Shift**: Modifier for fill mode (Circle/Polygon) or large brush (Freehand)
- **Ctrl**: Medium brush size (Freehand only)
- **Middle Mouse**: Pan the canvas
- **Right Click**: Quick erase while using any tool
- **Mouse Wheel**: Zoom in/out
