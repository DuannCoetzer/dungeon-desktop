import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

interface DragDropProviderProps {
  children: React.ReactNode
}

export function DragDropProvider({ children }: DragDropProviderProps) {
  console.log('🔄 DragDropProvider initialized with HTML5Backend')
  return <DndProvider backend={HTML5Backend}>{children}</DndProvider>
}
