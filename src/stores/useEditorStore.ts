import { defineStore } from 'pinia'
import { ref } from 'vue'
import { saveStateToStorage, loadStateFromStorage, debounce, type PersistedState, STORAGE_VERSION } from '../utils/persistence'

export type Tool = 'draw' | 'erase' | 'icon'
export type BrushType = 'standard' | 'dotted' | 'arrow'

export interface HeroSelection {
  id: string
  name: string
  image: string
}

export interface MapIconSelection {
  id: string
  name: string
  image: string
  size?: number
  width?: number
  height?: number
}

export interface Stroke {
  id: string
  points: number[]
  color: string
  strokeWidth: number
  brushType?: BrushType
  arrowAngle?: number
}

export interface Icon {
  id: string
  x: number
  y: number
  image: string
  size?: number
  width?: number
  height?: number
}

interface StateSnapshot {
  strokes: Stroke[]
  icons: Icon[]
}

export const useEditorStore = defineStore('editor', () => {
  // Tool state
  const currentTool = ref<Tool>('draw')
  const brushColorOptions = ['#ff2929', '#51ff45'] as const
  const brushColorIndex = ref(0)
  const brushColor = ref<string>(brushColorOptions[brushColorIndex.value])
  const brushSize = ref<number>(5)
  const brushType = ref<BrushType>('standard')
  const selectedHero = ref<HeroSelection | null>(null)
  const selectedMapIcon = ref<MapIconSelection | null>(null)

  // Drawing state
  const strokes = ref<Stroke[]>([])
  const icons = ref<Icon[]>([])

  // Undo/Redo state
  const undoStack = ref<StateSnapshot[]>([])
  const redoStack = ref<StateSnapshot[]>([])

  // Map state
  const useSimpleMap = ref(false)

  // Persistence: debounced save function
  const debouncedSave = debounce(() => {
    const state: PersistedState = {
      strokes: JSON.parse(JSON.stringify(strokes.value)),
      icons: JSON.parse(JSON.stringify(icons.value)),
      preferences: {
        brushColor: brushColor.value,
        brushSize: brushSize.value,
        brushType: brushType.value,
        useSimpleMap: useSimpleMap.value
      },
      version: STORAGE_VERSION
    }
    saveStateToStorage(state)
  }, 500)

  // Persistence: save current state to storage
  const persistState = () => {
    debouncedSave()
  }

  // Persistence: load state from storage
  const loadState = () => {
    const savedState = loadStateFromStorage()
    if (savedState) {
      // Restore strokes and icons
      strokes.value = savedState.strokes
      icons.value = savedState.icons

      // Restore preferences
      if (savedState.preferences) {
        brushColor.value = savedState.preferences.brushColor
        brushSize.value = savedState.preferences.brushSize
        brushType.value = savedState.preferences.brushType
        useSimpleMap.value = savedState.preferences.useSimpleMap
      }
    }
  }

  // Tool actions
  const setTool = (tool: Tool) => {
    currentTool.value = tool
  }

  const selectHero = (hero: HeroSelection) => {
    selectedHero.value = hero
    selectedMapIcon.value = null
    currentTool.value = 'icon'
  }

  const selectMapIcon = (mapIcon: MapIconSelection) => {
    selectedMapIcon.value = mapIcon
    selectedHero.value = null
    currentTool.value = 'icon'
  }

  const setBrushColor = (color: string) => {
    const index = brushColorOptions.findIndex(option => option.toLowerCase() === color.toLowerCase())
    if (index !== -1) {
      brushColorIndex.value = index
      brushColor.value = brushColorOptions[index]
      persistState()
    }
  }

  const toggleBrushColor = () => {
    brushColorIndex.value = (brushColorIndex.value + 1) % brushColorOptions.length
    brushColor.value = brushColorOptions[brushColorIndex.value]
    persistState()
  }

  const setBrushSize = (size: number) => {
    brushSize.value = size
    persistState()
  }

  const setBrushType = (type: BrushType) => {
    brushType.value = type
    persistState()
  }

  // Stroke actions
  const addStroke = (stroke: Stroke) => {
    saveState()
    strokes.value.push(stroke)
    // Clear redo stack when new action is performed
    redoStack.value = []
    persistState()
  }

  const removeStroke = (id: string) => {
    saveState()
    strokes.value = strokes.value.filter(s => s.id !== id)
    redoStack.value = []
    persistState()
  }

  // Icon actions
  const addIcon = (icon: Icon) => {
    saveState()
    icons.value.push(icon)
    redoStack.value = []
    persistState()
  }

  const updateIconPosition = (id: string, x: number, y: number) => {
    const icon = icons.value.find(i => i.id === id)
    if (icon) {
      // Only save state on first position update (when drag starts)
      // We'll handle this in the component to avoid saving on every mousemove
      icon.x = x
      icon.y = y
      // Note: persistState is called after drag ends in MapCanvas component
    }
  }

  const removeIcon = (id: string) => {
    saveState()
    icons.value = icons.value.filter(i => i.id !== id)
    redoStack.value = []
    persistState()
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
    persistState()
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
    persistState()
  }

  // Clear actions
  const clearMap = () => {
    saveState()
    strokes.value = []
    icons.value = []
    redoStack.value = []
    persistState()
  }

  const removeDrawings = () => {
    saveState()
    strokes.value = []
    redoStack.value = []
    persistState()
  }

  const removeIcons = () => {
    saveState()
    icons.value = []
    redoStack.value = []
    persistState()
  }

  const toggleMap = () => {
    useSimpleMap.value = !useSimpleMap.value
    persistState()
  }

  return {
    // State
    currentTool,
    brushColor,
    brushSize,
    brushType,
    selectedHero,
    selectedMapIcon,
    strokes,
    icons,
    undoStack,
    redoStack,
    useSimpleMap,
    // Actions
    setTool,
    selectHero,
    selectMapIcon,
    setBrushColor,
    toggleBrushColor,
    setBrushSize,
    setBrushType,
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
    removeIcons,
    toggleMap,
    loadState,
    persistState
  }
})
