import { create } from 'zustand'

// Types for UI state
export type Tool = 'select' | 'draw' | 'erase' | 'rect' | 'line' | 'circle' | 'polygon' | 'freehand'

// Position type moved to protocol.ts and mapStore.ts to avoid conflicts
export interface UIPosition {
  x: number
  y: number
}

export interface ViewportTransform {
  x: number
  y: number
  scale: number
}

export interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
  active: boolean
}

export interface GenerationParameters {
  seed?: string
  roomCount: number
  corridorWidth: number
  roomSizeMin: number
  roomSizeMax: number
  complexity: number
  // New parameters for enhanced generation
  noiseScale: number
  biomeThresholds: {
    water: number
    grass: number
    mountain: number
  }
  assetDensity: number
}

export interface BrushSettings {
  size: number
  opacity: number
  hardness: number
}

// Tool-specific temporary state
export interface PolygonTempState {
  vertices: UIPosition[]
  isComplete: boolean
}

export interface LineTempState {
  startPoint?: UIPosition
  endPoint?: UIPosition
  isDrawing: boolean
}

export interface RectTempState {
  startPoint?: UIPosition
  endPoint?: UIPosition
  isDrawing: boolean
}

export interface CircleTempState {
  centerPoint?: UIPosition
  radius: number
  isDrawing: boolean
}

export interface ToolTempState {
  polygon: PolygonTempState
  line: LineTempState
  rect: RectTempState
  circle: CircleTempState
}

export interface UIState {
  // Current tool state
  selectedTool: Tool
  brushSettings: BrushSettings
  
  // Generation parameters
  generationParams: GenerationParameters
  
  // Selection and viewport
  currentSelection: Selection
  viewportTransform: ViewportTransform
  
  // Tool-specific temporary state
  toolTempState: ToolTempState
  
  // UI flags
  isGridVisible: boolean
  isSnapToGrid: boolean
  gridSize: number
  
  // Actions
  setSelectedTool: (tool: Tool) => void
  setBrushSize: (size: number) => void
  setBrushOpacity: (opacity: number) => void
  setBrushHardness: (hardness: number) => void
  
  setGenerationParams: (params: Partial<GenerationParameters>) => void
  
  setSelection: (selection: Partial<Selection>) => void
  clearSelection: () => void
  
  setViewportTransform: (transform: Partial<ViewportTransform>) => void
  resetViewport: () => void
  
  // Tool-specific actions
  addPolygonVertex: (vertex: UIPosition) => void
  removeLastPolygonVertex: () => void
  completePolygon: () => void
  clearPolygon: () => void
  
  setLineStart: (point: UIPosition) => void
  setLineEnd: (point: UIPosition) => void
  clearLine: () => void
  
  setRectStart: (point: UIPosition) => void
  setRectEnd: (point: UIPosition) => void
  clearRect: () => void
  
  setCircleCenter: (point: UIPosition) => void
  setCircleRadius: (radius: number) => void
  clearCircle: () => void
  
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void
  
  // Reset all temp state
  clearAllTempState: () => void
}

// Default values
const defaultGenerationParams: GenerationParameters = {
  seed: undefined,
  roomCount: 8,
  corridorWidth: 3,
  roomSizeMin: 4,
  roomSizeMax: 12,
  complexity: 0.5,
  noiseScale: 1.0,
  biomeThresholds: {
    water: 0.3,
    grass: 0.6,
    mountain: 0.8
  },
  assetDensity: 0.5
}

const defaultBrushSettings: BrushSettings = {
  size: 1,
  opacity: 1.0,
  hardness: 1.0,
}

const defaultSelection: Selection = {
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  active: false,
}

const defaultViewportTransform: ViewportTransform = {
  x: 0,
  y: 0,
  scale: 1.0,
}

const defaultToolTempState: ToolTempState = {
  polygon: {
    vertices: [],
    isComplete: false,
  },
  line: {
    startPoint: undefined,
    endPoint: undefined,
    isDrawing: false,
  },
  rect: {
    startPoint: undefined,
    endPoint: undefined,
    isDrawing: false,
  },
  circle: {
    centerPoint: undefined,
    radius: 0,
    isDrawing: false,
  },
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  selectedTool: 'draw',
  brushSettings: { ...defaultBrushSettings },
  generationParams: { ...defaultGenerationParams },
  currentSelection: { ...defaultSelection },
  viewportTransform: { ...defaultViewportTransform },
  toolTempState: { ...defaultToolTempState },
  isGridVisible: true,
  isSnapToGrid: true,
  gridSize: 32,
  
  // Tool actions
  setSelectedTool: (tool) => {
    set({ selectedTool: tool })
    // Clear temp state when switching tools
    get().clearAllTempState()
  },
  
  // Brush actions
  setBrushSize: (size) => set((state) => ({
    brushSettings: { ...state.brushSettings, size: Math.max(1, size) }
  })),
  setBrushOpacity: (opacity) => set((state) => ({
    brushSettings: { ...state.brushSettings, opacity: Math.max(0, Math.min(1, opacity)) }
  })),
  setBrushHardness: (hardness) => set((state) => ({
    brushSettings: { ...state.brushSettings, hardness: Math.max(0, Math.min(1, hardness)) }
  })),
  
  // Generation actions
  setGenerationParams: (params) => set((state) => ({
    generationParams: { ...state.generationParams, ...params }
  })),
  
  // Selection actions
  setSelection: (selection) => set((state) => ({
    currentSelection: { ...state.currentSelection, ...selection }
  })),
  clearSelection: () => set({
    currentSelection: { ...defaultSelection }
  }),
  
  // Viewport actions
  setViewportTransform: (transform) => set((state) => ({
    viewportTransform: { ...state.viewportTransform, ...transform }
  })),
  resetViewport: () => set({
    viewportTransform: { ...defaultViewportTransform }
  }),
  
  // Polygon tool actions
  addPolygonVertex: (vertex) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      polygon: {
        ...state.toolTempState.polygon,
        vertices: [...state.toolTempState.polygon.vertices, vertex],
      }
    }
  })),
  removeLastPolygonVertex: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      polygon: {
        ...state.toolTempState.polygon,
        vertices: state.toolTempState.polygon.vertices.slice(0, -1),
      }
    }
  })),
  completePolygon: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      polygon: {
        ...state.toolTempState.polygon,
        isComplete: true,
      }
    }
  })),
  clearPolygon: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      polygon: { ...defaultToolTempState.polygon },
    }
  })),
  
  // Line tool actions
  setLineStart: (point) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      line: {
        ...state.toolTempState.line,
        startPoint: point,
        isDrawing: true,
      }
    }
  })),
  setLineEnd: (point) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      line: {
        ...state.toolTempState.line,
        endPoint: point,
      }
    }
  })),
  clearLine: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      line: { ...defaultToolTempState.line },
    }
  })),
  
  // Rectangle tool actions
  setRectStart: (point) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      rect: {
        ...state.toolTempState.rect,
        startPoint: point,
        isDrawing: true,
      }
    }
  })),
  setRectEnd: (point) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      rect: {
        ...state.toolTempState.rect,
        endPoint: point,
      }
    }
  })),
  clearRect: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      rect: { ...defaultToolTempState.rect },
    }
  })),
  
  // Circle tool actions
  setCircleCenter: (point) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      circle: {
        ...state.toolTempState.circle,
        centerPoint: point,
        isDrawing: true,
      }
    }
  })),
  setCircleRadius: (radius) => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      circle: {
        ...state.toolTempState.circle,
        radius: Math.max(0, radius),
      }
    }
  })),
  clearCircle: () => set((state) => ({
    toolTempState: {
      ...state.toolTempState,
      circle: { ...defaultToolTempState.circle },
    }
  })),
  
  // Grid actions
  toggleGrid: () => set((state) => ({
    isGridVisible: !state.isGridVisible
  })),
  toggleSnapToGrid: () => set((state) => ({
    isSnapToGrid: !state.isSnapToGrid
  })),
  setGridSize: (size) => set({
    gridSize: Math.max(1, size)
  }),
  
  // Clear all temp state
  clearAllTempState: () => set({
    toolTempState: { ...defaultToolTempState },
    currentSelection: { ...defaultSelection },
  }),
}))

// Helper functions for working with UI store
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize
}

export const snapPointToGrid = (point: UIPosition, gridSize: number): UIPosition => {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  }
}

// Selector hooks for performance optimization
export const useSelectedTool = () => useUIStore(state => state.selectedTool)
export const useBrushSettings = () => useUIStore(state => state.brushSettings)
export const useGenerationParams = () => useUIStore(state => state.generationParams)
export const useCurrentSelection = () => useUIStore(state => state.currentSelection)
export const useViewportTransform = () => useUIStore(state => state.viewportTransform)
export const useToolTempState = () => useUIStore(state => state.toolTempState)
export const useGridSettings = () => useUIStore(state => ({
  isGridVisible: state.isGridVisible,
  isSnapToGrid: state.isSnapToGrid,
  gridSize: state.gridSize,
}))
