import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Tool = 'draw' | 'erase' | 'icon'

export interface Stroke {
  id: string
  points: number[]
  color: string
  strokeWidth: number
}

export interface Icon {
  id: string
  x: number
  y: number
  image: string
}

interface StateSnapshot {
  strokes: Stroke[]
  icons: Icon[]
}

export const useEditorStore = defineStore('editor', () => {
  // Tool state
  const currentTool = ref<Tool>('draw')
  const brushColor = ref<string>('#000000')
  const brushSize = ref<number>(5)

  // Drawing state
  const strokes = ref<Stroke[]>([])
  const icons = ref<Icon[]>([])

  // Undo/Redo state
  const undoStack = ref<StateSnapshot[]>([])
  const redoStack = ref<StateSnapshot[]>([])

  // Tool actions
  const setTool = (tool: Tool) => {
    currentTool.value = tool
  }

  const setBrushColor = (color: string) => {
    brushColor.value = color
  }

  const setBrushSize = (size: number) => {
    brushSize.value = size
  }

  // Stroke actions
  const addStroke = (stroke: Stroke) => {
    saveState()
    strokes.value.push(stroke)
    // Clear redo stack when new action is performed
    redoStack.value = []
  }

  const removeStroke = (id: string) => {
    saveState()
    strokes.value = strokes.value.filter(s => s.id !== id)
    redoStack.value = []
  }

  // Icon actions
  const addIcon = (icon: Icon) => {
    saveState()
    icons.value.push(icon)
    redoStack.value = []
  }

  const updateIconPosition = (id: string, x: number, y: number) => {
    const icon = icons.value.find(i => i.id === id)
    if (icon) {
      // Only save state on first position update (when drag starts)
      // We'll handle this in the component to avoid saving on every mousemove
      icon.x = x
      icon.y = y
    }
  }

  const removeIcon = (id: string) => {
    saveState()
    icons.value = icons.value.filter(i => i.id !== id)
    redoStack.value = []
  }

  // Undo/Redo actions
  const saveState = () => {
    const snapshot: StateSnapshot = {
      strokes: JSON.parse(JSON.stringify(strokes.value)),
      icons: JSON.parse(JSON.stringify(icons.value))
    }
    undoStack.value.push(snapshot)
    // Limit undo stack size to prevent memory issues
    if (undoStack.value.length > 50) {
      undoStack.value.shift()
    }
  }

  const undo = () => {
    if (undoStack.value.length === 0) return

    // Save current state to redo stack
    const currentSnapshot: StateSnapshot = {
      strokes: JSON.parse(JSON.stringify(strokes.value)),
      icons: JSON.parse(JSON.stringify(icons.value))
    }
    redoStack.value.push(currentSnapshot)

    // Restore previous state
    const previousSnapshot = undoStack.value.pop()!
    strokes.value = previousSnapshot.strokes
    icons.value = previousSnapshot.icons
  }

  const redo = () => {
    if (redoStack.value.length === 0) return

    // Save current state to undo stack
    const currentSnapshot: StateSnapshot = {
      strokes: JSON.parse(JSON.stringify(strokes.value)),
      icons: JSON.parse(JSON.stringify(icons.value))
    }
    undoStack.value.push(currentSnapshot)

    // Restore next state
    const nextSnapshot = redoStack.value.pop()!
    strokes.value = nextSnapshot.strokes
    icons.value = nextSnapshot.icons
  }

  // Clear actions
  const clearMap = () => {
    saveState()
    strokes.value = []
    icons.value = []
    redoStack.value = []
  }

  const removeDrawings = () => {
    saveState()
    strokes.value = []
    redoStack.value = []
  }

  const removeIcons = () => {
    saveState()
    icons.value = []
    redoStack.value = []
  }

  return {
    // State
    currentTool,
    brushColor,
    brushSize,
    strokes,
    icons,
    undoStack,
    redoStack,
    // Actions
    setTool,
    setBrushColor,
    setBrushSize,
    addStroke,
    removeStroke,
    addIcon,
    updateIconPosition,
    removeIcon,
    saveState,
    undo,
    redo,
    clearMap,
    removeDrawings,
    removeIcons
  }
})

