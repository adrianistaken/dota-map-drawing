<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useEditorStore, type Tool, type BrushType } from '../stores/useEditorStore'
import LastUpdatedBadge from './LastUpdatedBadge.vue'

const props = defineProps<{
  mapCanvasRef?: { getStage: () => any } | null
}>()

const store = useEditorStore()

// Keyboard shortcuts for undo/redo
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+Z or Cmd+Z for undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.undo()
  }
  // Ctrl+Shift+Z or Cmd+Shift+Z for redo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
  }
  // Ctrl+Y or Cmd+Y for redo (alternative)
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    store.redo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Export stage to PNG
const downloadPNG = () => {
  const stage = props.mapCanvasRef?.getStage()
  if (!stage) {
    console.error('Stage not found')
    return
  }

  // Use Konva's toDataURL method for high-quality export
  // pixelRatio: 2 for higher resolution
  const dataURL = stage.toDataURL({
    pixelRatio: 2,
    mimeType: 'image/png',
    quality: 1
  })

  // Create download link
  const link = document.createElement('a')
  link.download = 'dota-map-drawing.png'
  link.href = dataURL
  link.click()
}

// Copy to clipboard
const copyToClipboard = async () => {
  const stage = props.mapCanvasRef?.getStage()
  if (!stage) {
    console.error('Stage not found')
    return
  }

  try {
    // Use Konva's toDataURL method
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    })

    // Convert data URL to blob
    const response = await fetch(dataURL)
    const blob = await response.blob()

    try {
      // Use Clipboard API to copy image
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      alert('Map copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: copy data URL as text
      await navigator.clipboard.writeText(dataURL)
      alert('Image data URL copied to clipboard (fallback)')
    }
  } catch (err) {
    console.error('Failed to copy:', err)
    alert('Failed to copy to clipboard')
  }
}

// Tool selection handlers
const setTool = (tool: Tool) => {
  store.setTool(tool)
}

// Convert hex color to rgba with opacity for subtle background
const getBrushColorBg = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.25)`
}

const brushColorBg = computed(() => getBrushColorBg(store.brushColor))

const handleToggleBrushColor = () => {
  store.toggleBrushColor()
}

// Handle brush type selection
const selectBrushType = (type: BrushType) => {
  store.setBrushType(type)
  store.setTool('draw')
}

const handleHeroIconSizeChange = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  store.setHeroIconSize(value)
}

</script>

<template>
  <div class="toolbar flex flex-col h-full">
    <!-- Top Section: Editing Tools -->
    <div class="toolbar-top p-2 space-y-2">
      <!-- Brush Type Selection -->
      <div class="flex gap-1">
        <button @click="selectBrushType('standard')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'draw' && store.brushType === 'standard'
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :style="store.currentTool === 'draw' && store.brushType === 'standard' ? { borderColor: '#ff9500' } : {}"
          :title="'Standard Brush'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <path d="m11 10 3 3" />
            <path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z" />
            <path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031" />
          </svg>
        </button>
        <button @click="selectBrushType('dotted')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'draw' && store.brushType === 'dotted'
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :style="store.currentTool === 'draw' && store.brushType === 'dotted' ? { borderColor: '#ff9500' } : {}"
          :title="'Dotted Brush'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
        <button @click="selectBrushType('arrow')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'draw' && store.brushType === 'arrow'
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :style="store.currentTool === 'draw' && store.brushType === 'arrow' ? { borderColor: '#ff9500' } : {}"
          :title="'Arrow Brush'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 rotate-180">
            <line x1="4" y1="12" x2="16" y2="12" />
            <line x1="12" y1="6" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="12" />
          </svg>
        </button>
      </div>

      <!-- Brush Color and Eraser -->
      <div class="flex gap-1">
        <button @click="handleToggleBrushColor"
          class="flex-1 px-2 py-1.5 rounded border-2 border-transparent transition-all duration-300 flex items-center justify-center"
          :style="{ backgroundColor: brushColorBg }" :title="`Brush Color: ${store.brushColor}`">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette-icon lucide-palette w-4 h-4">
            <path
              d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
        </button>
        <button @click="setTool('erase')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'erase'
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :style="store.currentTool === 'erase' ? { borderColor: '#ff9500' } : {}" :title="'Erase'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser-icon lucide-eraser w-4 h-4">
            <path
              d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
            <path d="m5.082 11.09 8.828 8.828" />
          </svg>
        </button>
      </div>

      <!-- Actions -->
      <div class="space-y-1 pt-2 border-t border-gray-700">
        <div class="flex flex-col gap-1">
          <div class="flex gap-1">
            <button @click="store.undo()" :disabled="store.undoStack.length === 0"
              class="flex-1 px-2 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              :title="'Undo (Ctrl+Z)'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button @click="store.redo()" :disabled="store.redoStack.length === 0"
              class="flex-1 px-2 py-1.5 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              :title="'Redo (Ctrl+Shift+Z)'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </button>
          </div>
          <!-- Tool buttons in 2 rows of 3 -->
          <div class="grid grid-cols-3 gap-1">
            <button @click="store.clearMap()"
              class="px-2 py-1.5 bg-red-700 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center"
              :title="'Clear Map'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
            <button @click="store.removeDrawings()"
              class="px-2 py-1.5 bg-orange-700 text-white rounded hover:bg-orange-600 transition-colors flex items-center justify-center"
              :title="'Remove Drawings'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M3 3l18 18" />
                <path d="M5 7l4-4" />
                <path d="M9 11l4-4" />
                <path d="M13 15l4-4" />
                <path d="M17 19l4-4" />
              </svg>
            </button>
            <button @click="store.removeIcons()"
              class="px-2 py-1.5 bg-orange-700 text-white rounded hover:bg-orange-600 transition-colors flex items-center justify-center"
              :title="'Remove Icons'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="15" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="15" width="6" height="6" rx="1" />
                <rect x="15" y="15" width="6" height="6" rx="1" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <button @click="downloadPNG"
              class="px-2 py-1.5 bg-green-700 text-white rounded hover:bg-green-600 transition-colors flex items-center justify-center"
              :title="'Download PNG'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button @click="copyToClipboard"
              class="px-2 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
              :title="'Copy to Clipboard'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Middle Section: Layer Toggles -->
    <div class="toolbar-middle p-2 flex-1 overflow-y-auto">
      <div class="space-y-2 pt-2 border-t border-gray-700">
        <div class="toggle-row">
          <div class="flex items-center gap-2 flex-1">
            <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12h12" />
              <path d="M6 15h12" />
              <path d="M6 9h12" />
            </svg>
            <span class="text-sm font-semibold text-white">Buildings</span>
          </div>
          <button class="toggle-switch" :class="{ on: store.autoPlaceBuildings }"
            :aria-pressed="store.autoPlaceBuildings" @click="store.toggleAutoPlaceBuildings()">
            <span class="toggle-thumb">
              <svg v-if="!store.autoPlaceBuildings" class="toggle-icon toggle-icon-x" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <svg v-else class="toggle-icon toggle-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </button>
        </div>
        <div class="toggle-row">
          <div class="flex items-center gap-2 flex-1">
            <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span class="text-sm font-semibold text-white">Watchers</span>
          </div>
          <button class="toggle-switch" :class="{ on: store.autoPlaceWatchers }" :aria-pressed="store.autoPlaceWatchers"
            @click="store.toggleAutoPlaceWatchers()">
            <span class="toggle-thumb">
              <svg v-if="!store.autoPlaceWatchers" class="toggle-icon toggle-icon-x" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <svg v-else class="toggle-icon toggle-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </button>
        </div>
        <div class="toggle-row">
          <div class="flex items-center gap-2 flex-1">
            <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
              <path d="M9 3v6" />
              <path d="M9 15v6" />
              <path d="M15 3v6" />
              <path d="M15 15v6" />
            </svg>
            <span class="text-sm font-semibold text-white">Structures</span>
          </div>
          <button class="toggle-switch" :class="{ on: store.autoPlaceStructures }"
            :aria-pressed="store.autoPlaceStructures" @click="store.toggleAutoPlaceStructures()">
            <span class="toggle-thumb">
              <svg v-if="!store.autoPlaceStructures" class="toggle-icon toggle-icon-x" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <svg v-else class="toggle-icon toggle-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </button>
        </div>
        <div class="toggle-row">
          <div class="flex items-center gap-2 flex-1">
            <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span class="text-sm font-semibold text-white">Camps</span>
          </div>
          <button class="toggle-switch" :class="{ on: store.autoPlaceNeutralCamps }"
            :aria-pressed="store.autoPlaceNeutralCamps" @click="store.toggleAutoPlaceNeutralCamps()">
            <span class="toggle-thumb">
              <svg v-if="!store.autoPlaceNeutralCamps" class="toggle-icon toggle-icon-x" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <svg v-else class="toggle-icon toggle-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </button>
        </div>
        <div class="toggle-row">
          <div class="flex items-center gap-2 flex-1">
            <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v6m0 8v6" />
              <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3 3 3 0 0 0 3-3V5a3 3 0 0 0-3-3Z" />
              <path d="M12 16a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3 3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3Z" />
            </svg>
            <span class="text-sm font-semibold text-white">Runes</span>
          </div>
          <button class="toggle-switch" :class="{ on: store.autoPlaceRunes }" :aria-pressed="store.autoPlaceRunes"
            @click="store.toggleAutoPlaceRunes()">
            <span class="toggle-thumb">
              <svg v-if="!store.autoPlaceRunes" class="toggle-icon toggle-icon-x" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <svg v-else class="toggle-icon toggle-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </button>
      </div>
        <div class="space-y-2 pt-3 border-t border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="toggle-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
              </svg>
              <span class="text-sm font-semibold text-white">Hero Icon Size</span>
            </div>
            <span class="text-xs text-gray-300">{{ store.heroIconSize }}px</span>
          </div>
          <input type="range" min="32" max="96" step="2" :value="store.heroIconSize"
            @input="handleHeroIconSizeChange" class="hero-slider" aria-label="Adjust hero icon size" />
        </div>
      </div>
    </div>

    <!-- Bottom Section: Last Updated -->
    <div class="toolbar-bottom p-2">
      <LastUpdatedBadge />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  background-color: transparent;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar-top {
  flex: 0 0 auto;
}

.toolbar-middle {
  flex: 1 1 auto;
  min-height: 0;
}

.toolbar-bottom {
  flex: 0 0 auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* Remove default browser focus outline from buttons */
.toolbar button:focus {
  outline: none;
}

.toolbar button:focus-visible {
  outline: none;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.toggle-row:first-child {
  border-top: none;
}

.toggle-category-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.toggle-switch {
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 9999px;
  border: none;
  background: #d3d3d3;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
  flex-shrink: 0;
  align-self: center;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.toggle-icon {
  width: 10px;
  height: 10px;
  display: block;
}

.toggle-icon-x {
  color: #4b5563;
}

.toggle-icon-check {
  color: #ffffff;
}

.toggle-switch.on {
  background: #4f76e2;
}

.toggle-switch.on .toggle-thumb {
  background: #ffffff;
  transform: translateX(20px);
}

.toggle-switch:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.hero-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #1f2937, #374151);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.hero-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff9500;
  border: 2px solid #0f172a;
  box-shadow: 0 0 0 3px rgba(255, 149, 0, 0.25);
  cursor: pointer;
}

.hero-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff9500;
  border: 2px solid #0f172a;
  box-shadow: 0 0 0 3px rgba(255, 149, 0, 0.25);
  cursor: pointer;
}
</style>
