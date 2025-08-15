import type { Tool } from './Tool'
import { DrawTool } from './DrawTool'
import { EraseTool } from './EraseTool'
import { RectTool } from './RectTool'
import { SelectTool } from './SelectTool'
import { LineTool } from './LineTool'
import { CircleTool } from './CircleTool'
import { PolygonTool } from './PolygonTool'
import { FreehandTool } from './FreehandTool'
import type { Tool as ToolType } from '../uiStore'

export class ToolManager {
  private tools: Map<ToolType, Tool> = new Map()

  constructor() {
    // Initialize all available tools
    this.tools.set('select', new SelectTool())
    this.tools.set('draw', new DrawTool())
    this.tools.set('erase', new EraseTool())
    this.tools.set('rect', new RectTool())
    this.tools.set('line', new LineTool())
    this.tools.set('circle', new CircleTool())
    this.tools.set('polygon', new PolygonTool())
    this.tools.set('freehand', new FreehandTool())
  }

  getTool(toolType: ToolType): Tool {
    const tool = this.tools.get(toolType)
    if (!tool) {
      throw new Error(`Tool '${toolType}' not found`)
    }
    return tool
  }

  getAvailableTools(): ToolType[] {
    return Array.from(this.tools.keys())
  }
}

// Singleton instance
export const toolManager = new ToolManager()
