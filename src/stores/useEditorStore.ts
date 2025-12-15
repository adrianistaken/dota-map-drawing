import { defineStore } from 'pinia'
import { ref } from 'vue'
import { saveStateToStorage, loadStateFromStorage, debounce, type PersistedState, STORAGE_VERSION } from '../utils/persistence'
import { mapIconFiles, mapIconPath, type MapIconFolder } from '../data/mapIcons'

export type Tool = 'draw' | 'erase' | 'icon'
export type BrushType = 'standard' | 'dotted' | 'arrow'

const HERO_ICON_DEFAULT_SIZE = 64

const findMapIconMeta = (folder: MapIconFolder, filename: string) =>
  mapIconFiles.find(icon => icon.folder === folder && icon.filename === filename)

const buildAutoIcon = (folder: MapIconFolder, filename: string, preset: { id: string; x: number; y: number }, category?: AutoIconCategory): Icon => {
  const meta = findMapIconMeta(folder, filename)
  // Determine shrink amount: neutral camps shrink by 4px, others by 8px
  const shrinkBy = category === 'neutralCamps' ? 4 : 8
  const offset = shrinkBy / 2 // Offset to keep center in same position (half of shrink amount)

  // Only shrink icons that are NOT runes
  const shouldShrink = category !== undefined && category !== 'runes'

  let size = meta?.size
  let width = meta?.width
  let height = meta?.height
  let x = preset.x
  let y = preset.y

  if (shouldShrink) {
    // Adjust size/width/height
    if (size !== undefined) {
      size = Math.max(1, size - shrinkBy) // Ensure size doesn't go below 1
    }
    if (width !== undefined) {
      width = Math.max(1, width - shrinkBy)
    }
    if (height !== undefined) {
      height = Math.max(1, height - shrinkBy)
    }
    // Adjust position to keep center in same place
    x = preset.x + offset
    y = preset.y + offset
  }

  return {
    id: preset.id,
    x,
    y,
    image: mapIconPath(folder, filename),
    size,
    width,
    height
  }
}

type AutoIconCategory = 'buildings' | 'watchers' | 'structures' | 'neutralCamps' | 'runes'

const AUTO_ICON_PRESETS: Record<AutoIconCategory, Icon[]> = {
  buildings: [
    // Dire ancients/towers
    buildAutoIcon('runes', '60px-Ancient_mapicon_dota2_gameasset red.png', {
      id: 'auto-ancient-dire',
      x: 715,
      y: 170
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasse redt.png', {
      id: 'auto-tower-dire-t4-left',
      x: 678,
      y: 195
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasse redt.png', {
      id: 'auto-tower-dire-t4-right',
      x: 705,
      y: 212
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasse redt.png', {
      id: 'auto-tower-dire-t3-mid',
      x: 557,
      y: 315
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasse redt.png', {
      id: 'auto-tower-dire-t2-mid',
      x: 646,
      y: 234
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasse redt.png', {
      id: 'auto-tower-dire-t1-mid',
      x: 458,
      y: 389
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-1',
      x: 615,
      y: 149
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-2',
      x: 430,
      y: 126
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-3',
      x: 173,
      y: 138
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-4',
      x: 750,
      y: 275
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-5',
      x: 747,
      y: 404
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasset red.png', {
      id: 'auto-tower90-dire-6',
      x: 745,
      y: 528
    }, 'buildings'),
    // Radiant ancients/towers
    buildAutoIcon('runes', '60px-Ancient_mapicon_dota2_gameasse greent.png', {
      id: 'auto-ancient-radiant',
      x: 145.45,
      y: 689.15
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasset green.png', {
      id: 'auto-tower-radiant-t4-left',
      x: 149.62,
      y: 657.89
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasset green.png', {
      id: 'auto-tower-radiant-t4-right',
      x: 173.15,
      y: 679.36
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasset green.png', {
      id: 'auto-tower-radiant-t3-mid',
      x: 202.30,
      y: 623.45
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasset green.png', {
      id: 'auto-tower-radiant-t2-mid',
      x: 283.02,
      y: 552.73
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_45_mapicon_dota2_gameasset green.png', {
      id: 'auto-tower-radiant-t1-mid',
      x: 357.72,
      y: 490.90
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-1',
      x: 114.14,
      y: 589.54
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-2',
      x: 115.40,
      y: 467.91
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-3',
      x: 123.93,
      y: 333.34
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-4',
      x: 240.35,
      y: 718.21
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-5',
      x: 415.28,
      y: 728.08
    }, 'buildings'),
    buildAutoIcon('map', 'Tower_90_mapicon_dota2_gameasse greent.png', {
      id: 'auto-tower90-radiant-6',
      x: 680.12,
      y: 720.50
    }, 'buildings')
  ],
  watchers: [
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-1', x: 569.20, y: 640.56 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-2', x: 755.06, y: 723.41 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-3', x: 819.41, y: 478.20 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-4', x: 602.33, y: 800.25 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-5', x: 464.74, y: 787.92 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-6', x: 434.92, y: 548.48 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-7', x: 262.12, y: 425.43 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-8', x: 61.63, y: 396.18 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-9', x: 575.23, y: 451.36 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-10', x: 392.81, y: 310.86 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-11', x: 280.29, y: 217.29 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-12', x: 398.41, y: 82.37 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-13', x: 256.37, y: 46.70 }, 'watchers'),
    buildAutoIcon('map', 'Watcher_mapicon_dota2_gameasset.png', { id: 'auto-watcher-14', x: 94.79, y: 130.14 }, 'watchers')
  ],
  structures: [
    // Lotus pools
    buildAutoIcon('map', 'Lotus_Pool_mapicon_dota2_gameasset.png', {
      id: 'auto-lotus-1',
      x: 805.86,
      y: 648.66
    }, 'structures'),
    buildAutoIcon('map', 'Lotus_Pool_mapicon_dota2_gameasset.png', {
      id: 'auto-lotus-2',
      x: 52.90,
      y: 196.23
    }, 'structures'),
    // Warp gates
    buildAutoIcon('map', 'Warp_Gate_mapicon_dota2_gameasset.png', {
      id: 'auto-warp-1',
      x: 66.85,
      y: 86.18
    }, 'structures'),
    buildAutoIcon('map', 'Warp_Gate_mapicon_dota2_gameasset.png', {
      id: 'auto-warp-2',
      x: 794.43,
      y: 736.50
    }, 'structures'),
    // Tormentors
    buildAutoIcon('map', 'tormentor minimap icon.png', {
      id: 'auto-tormentor-1',
      x: 797.72,
      y: 794.39
    }, 'structures'),
    buildAutoIcon('map', 'tormentor minimap icon.png', {
      id: 'auto-tormentor-2',
      x: 75.93,
      y: 32.66
    }, 'structures'),
    // Wisdom Runes
    buildAutoIcon('runes', 'Wisdom_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-wisdom-1',
      x: 847.15,
      y: 414.99
    }, 'structures'),
    buildAutoIcon('runes', 'Wisdom_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-wisdom-2',
      x: 27.34,
      y: 430.00
    }, 'structures')
  ],
  neutralCamps: [
    // Ancient camps
    buildAutoIcon('map', 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-ancient-1',
      x: 190.92,
      y: 16.80
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-ancient-2',
      x: 629.85,
      y: 417.75
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-ancient-3',
      x: 682.85,
      y: 822.99
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-ancient-4',
      x: 176.44,
      y: 451.35
    }, 'neutralCamps'),
    // Large camps
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-1',
      x: 542.83,
      y: 15.82
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-2',
      x: 817.20,
      y: 426.00
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-3',
      x: 483.02,
      y: 292.74
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-4',
      x: 598.68,
      y: 483.20
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-5',
      x: 235.95,
      y: 352.32
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-6',
      x: 1.88,
      y: 457.50
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-7',
      x: 290.41,
      y: 835.48
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-8',
      x: 370.06,
      y: 574.60
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-9',
      x: 670.07,
      y: 586.01
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-large-10',
      x: 195.84,
      y: 232.06
    }, 'neutralCamps'),
    // Medium camps
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-1',
      x: 312.91,
      y: 237.95
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-2',
      x: 491.99,
      y: 201.09
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-3',
      x: 852.96,
      y: 378.19
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-4',
      x: 532.79,
      y: 598.78
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-5',
      x: 333.86,
      y: 641.24
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-medium-6',
      x: 9.73,
      y: 531.16
    }, 'neutralCamps'),
    // Small camps
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-1',
      x: 278.19,
      y: 67.38
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-2',
      x: 227.43,
      y: 180.75
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-3',
      x: 642.70,
      y: 687.74
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-4',
      x: 595.13,
      y: 828.11
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-5',
      x: 392.42,
      y: 177.81
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-6',
      x: 420.71,
      y: 16.25
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-7',
      x: 441.57,
      y: 674.92
    }, 'neutralCamps'),
    buildAutoIcon('map', 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', {
      id: 'auto-neutral-small-8',
      x: 433.82,
      y: 780.21
    }, 'neutralCamps')
  ],
  runes: [
    // Water Runes
    buildAutoIcon('runes', 'Water_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-water-1',
      x: 347.36,
      y: 375.24
    }, 'runes'),
    buildAutoIcon('runes', 'Water_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-water-2',
      x: 500.27,
      y: 485.09
    }, 'runes'),
    // Bounty Runes
    buildAutoIcon('runes', 'Bounty_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-bounty-1',
      x: 392.23,
      y: 196.48
    }, 'runes'),
    buildAutoIcon('runes', 'Bounty_Rune_mapicon_dota2_gameasset.png', {
      id: 'auto-bounty-2',
      x: 450.67,
      y: 656.09
    }, 'runes')
  ]
}

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
  paletteSize?: number
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
  const heroIconSize = ref<number>(HERO_ICON_DEFAULT_SIZE)
  const selectedHero = ref<HeroSelection | null>(null)
  const selectedMapIcon = ref<MapIconSelection | null>(null)
  const autoPlaceBuildings = ref(false)
  const autoPlaceWatchers = ref(false)
  const autoPlaceStructures = ref(false)
  const autoPlaceNeutralCamps = ref(false)
  const autoPlaceRunes = ref(false)

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
        heroIconSize: heroIconSize.value,
        useSimpleMap: useSimpleMap.value,
        autoPlaceIcons: autoPlaceBuildings.value || autoPlaceWatchers.value || autoPlaceStructures.value || autoPlaceNeutralCamps.value || autoPlaceRunes.value || undefined,
        autoPlaceBuildings: autoPlaceBuildings.value,
        autoPlaceWatchers: autoPlaceWatchers.value,
        autoPlaceStructures: autoPlaceStructures.value,
        autoPlaceNeutralCamps: autoPlaceNeutralCamps.value,
        autoPlaceRunes: autoPlaceRunes.value
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
        heroIconSize.value = savedState.preferences.heroIconSize ?? HERO_ICON_DEFAULT_SIZE
        useSimpleMap.value = savedState.preferences.useSimpleMap
        const legacyAutoPlace = savedState.preferences.autoPlaceIcons ?? false
        autoPlaceBuildings.value = savedState.preferences.autoPlaceBuildings ?? legacyAutoPlace
        autoPlaceWatchers.value = savedState.preferences.autoPlaceWatchers ?? legacyAutoPlace
        autoPlaceStructures.value = savedState.preferences.autoPlaceStructures ?? legacyAutoPlace
        autoPlaceNeutralCamps.value = savedState.preferences.autoPlaceNeutralCamps ?? legacyAutoPlace
        autoPlaceRunes.value = savedState.preferences.autoPlaceRunes ?? legacyAutoPlace
      }
    }
  }

  // Tool actions
  const setTool = (tool: Tool) => {
    if (tool !== 'icon') {
      selectedHero.value = null
      selectedMapIcon.value = null
    }
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

  const addAutoIconsForCategory = (category: AutoIconCategory) => {
    const presets = AUTO_ICON_PRESETS[category]
    const existingIds = new Set(icons.value.map(icon => icon.id))
    const missingIcons = presets.filter(icon => !existingIds.has(icon.id))
    if (missingIcons.length === 0) return

    saveState()
    icons.value.push(...missingIcons.map(icon => ({ ...icon })))
    redoStack.value = []
    persistState()
  }

  const removeAutoIconsForCategory = (category: AutoIconCategory) => {
    const presetIds = new Set(AUTO_ICON_PRESETS[category].map(icon => icon.id))
    const hasIcons = icons.value.some(icon => presetIds.has(icon.id))
    if (!hasIcons) return

    saveState()
    icons.value = icons.value.filter(icon => !presetIds.has(icon.id))
    redoStack.value = []
    persistState()
  }

  const ensureAutoPlacedIcons = () => {
    if (autoPlaceBuildings.value) addAutoIconsForCategory('buildings')
    if (autoPlaceWatchers.value) addAutoIconsForCategory('watchers')
    if (autoPlaceStructures.value) addAutoIconsForCategory('structures')
    if (autoPlaceNeutralCamps.value) addAutoIconsForCategory('neutralCamps')
    if (autoPlaceRunes.value) addAutoIconsForCategory('runes')
  }

  const toggleAutoPlaceBuildings = () => {
    autoPlaceBuildings.value = !autoPlaceBuildings.value
    if (autoPlaceBuildings.value) {
      addAutoIconsForCategory('buildings')
    } else {
      removeAutoIconsForCategory('buildings')
    }
    persistState()
  }

  const toggleAutoPlaceWatchers = () => {
    autoPlaceWatchers.value = !autoPlaceWatchers.value
    if (autoPlaceWatchers.value) {
      addAutoIconsForCategory('watchers')
    } else {
      removeAutoIconsForCategory('watchers')
    }
    persistState()
  }

  const toggleAutoPlaceStructures = () => {
    autoPlaceStructures.value = !autoPlaceStructures.value
    if (autoPlaceStructures.value) {
      addAutoIconsForCategory('structures')
    } else {
      removeAutoIconsForCategory('structures')
    }
    persistState()
  }

  const toggleAutoPlaceNeutralCamps = () => {
    autoPlaceNeutralCamps.value = !autoPlaceNeutralCamps.value
    if (autoPlaceNeutralCamps.value) {
      addAutoIconsForCategory('neutralCamps')
    } else {
      removeAutoIconsForCategory('neutralCamps')
    }
    persistState()
  }

  const toggleAutoPlaceRunes = () => {
    autoPlaceRunes.value = !autoPlaceRunes.value
    if (autoPlaceRunes.value) {
      addAutoIconsForCategory('runes')
    } else {
      removeAutoIconsForCategory('runes')
    }
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

  const setHeroIconSize = (size: number) => {
    heroIconSize.value = size

    const hasHeroIcons = icons.value.some(icon => icon.image.includes('/images/icons/heroes/'))
    if (hasHeroIcons) {
      saveState()
      icons.value = icons.value.map(icon => icon.image.includes('/images/icons/heroes/')
        ? { ...icon, width: size, height: size, size }
        : icon)
      redoStack.value = []
    }

    persistState()
  }

  // Helper function to check if any icons from a category exist
  const hasIconsForCategory = (category: AutoIconCategory): boolean => {
    const presetIds = new Set(AUTO_ICON_PRESETS[category].map(icon => icon.id))
    return icons.value.some(icon => presetIds.has(icon.id))
  }

  // Helper function to sync toggleable states with actual icon presence
  const syncToggleableStates = () => {
    // Sync each toggleable: turn on if icons exist, turn off if they don't
    const hasBuildings = hasIconsForCategory('buildings')
    if (autoPlaceBuildings.value !== hasBuildings) {
      autoPlaceBuildings.value = hasBuildings
    }

    const hasWatchers = hasIconsForCategory('watchers')
    if (autoPlaceWatchers.value !== hasWatchers) {
      autoPlaceWatchers.value = hasWatchers
    }

    const hasStructures = hasIconsForCategory('structures')
    if (autoPlaceStructures.value !== hasStructures) {
      autoPlaceStructures.value = hasStructures
    }

    const hasNeutralCamps = hasIconsForCategory('neutralCamps')
    if (autoPlaceNeutralCamps.value !== hasNeutralCamps) {
      autoPlaceNeutralCamps.value = hasNeutralCamps
    }

    const hasRunes = hasIconsForCategory('runes')
    if (autoPlaceRunes.value !== hasRunes) {
      autoPlaceRunes.value = hasRunes
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

    // Sync toggleable states after restoring icons
    syncToggleableStates()

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

    // Sync toggleable states after restoring icons
    syncToggleableStates()

    persistState()
  }

  // Clear actions
  const clearMap = () => {
    saveState()
    strokes.value = []
    icons.value = []
    redoStack.value = []
    // Turn off all toggleables
    autoPlaceBuildings.value = false
    autoPlaceWatchers.value = false
    autoPlaceStructures.value = false
    autoPlaceNeutralCamps.value = false
    autoPlaceRunes.value = false
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
    heroIconSize,
    selectedHero,
    selectedMapIcon,
    autoPlaceBuildings,
    autoPlaceWatchers,
    autoPlaceStructures,
    autoPlaceNeutralCamps,
    autoPlaceRunes,
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
    setHeroIconSize,
    addStroke,
    removeStroke,
    addIcon,
    updateIconPosition,
    removeIcon,
    ensureAutoPlacedIcons,
    saveState,
    undo,
    redo,
    clearMap,
    removeDrawings,
    removeIcons,
    toggleMap,
    toggleAutoPlaceBuildings,
    toggleAutoPlaceWatchers,
    toggleAutoPlaceStructures,
    toggleAutoPlaceNeutralCamps,
    toggleAutoPlaceRunes,
    loadState,
    persistState
  }
})
