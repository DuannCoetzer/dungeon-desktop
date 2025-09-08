import { useRef, useState, useCallback } from 'react'

export interface DragItem {
  type: string
  data: any
}

export interface DragState {
  isDragging: boolean
  dragItem: DragItem | null
}

export interface DropResult {
  x: number
  y: number
  item: DragItem
}

// Global drag state to share between drag source and drop target
let globalDragState: DragState = {
  isDragging: false,
  dragItem: null
}

const dragListeners: (() => void)[] = []

function notifyDragListeners() {
  dragListeners.forEach(listener => listener())
}

export function useCustomDrag(type: string, item: any) {
  const [isDragging, setIsDragging] = useState(false)
  
  const dragRef = useRef<HTMLElement>(null)
  
  const startDrag = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    console.log('🚀 Custom drag start:', { type, item })
    event.preventDefault()
    
    globalDragState = {
      isDragging: true,
      dragItem: { type, data: item }
    }
    
    setIsDragging(true)
    notifyDragListeners()
    
    const handleEnd = () => {
      console.log('🏁 Custom drag end')
      globalDragState = {
        isDragging: false,
        dragItem: null
      }
      setIsDragging(false)
      notifyDragListeners()
      
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('touchcancel', handleEnd)
    }
    
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('touchcancel', handleEnd)
    
  }, [type, item])
  
  const dragHandlers = {
    onMouseDown: startDrag,
    onTouchStart: startDrag,
    style: {
      cursor: isDragging ? 'grabbing' : 'grab',
      touchAction: 'none',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const
    }
  }
  
  return [{ isDragging }, dragRef, dragHandlers] as const
}

export function useCustomDrop(acceptedTypes: string[], onDrop: (result: DropResult) => void) {
  const [isOver, setIsOver] = useState(false)
  const dropRef = useRef<HTMLElement>(null)
  
  // Subscribe to global drag state changes
  useState(() => {
    const listener = () => {
      // Check if we're dragging an acceptable type
      const isAcceptable = globalDragState.dragItem && 
        acceptedTypes.includes(globalDragState.dragItem.type)
      
      if (globalDragState.isDragging && isAcceptable) {
        // We could be a drop target
      } else {
        setIsOver(false)
      }
    }
    
    dragListeners.push(listener)
    return () => {
      const index = dragListeners.indexOf(listener)
      if (index > -1) {
        dragListeners.splice(index, 1)
      }
    }
  })
  
  const handleDrop = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    if (!globalDragState.isDragging || !globalDragState.dragItem) {
      return
    }
    
    if (!acceptedTypes.includes(globalDragState.dragItem.type)) {
      return
    }
    
    const rect = dropRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0]?.clientX || 0
    const clientY = 'clientY' in event ? event.clientY : event.touches[0]?.clientY || 0
    
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    console.log('🎯 Custom drop:', { x, y, item: globalDragState.dragItem })
    
    onDrop({
      x,
      y,
      item: globalDragState.dragItem
    })
    
    setIsOver(false)
  }, [acceptedTypes, onDrop])
  
  const handleDragOver = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    if (!globalDragState.isDragging || !globalDragState.dragItem) {
      return
    }
    
    if (!acceptedTypes.includes(globalDragState.dragItem.type)) {
      return
    }
    
    setIsOver(true)
  }, [acceptedTypes])
  
  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])
  
  const dropHandlers = {
    onMouseUp: handleDrop,
    onTouchEnd: handleDrop,
    onMouseMove: handleDragOver,
    onTouchMove: handleDragOver,
    onMouseLeave: handleDragLeave,
  }
  
  return [{ isOver }, dropRef, dropHandlers] as const
}
