<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useEditorStore, type Tool, type BrushType } from '../stores/useEditorStore'

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

// Brush popout state
const showBrushPopout = ref(false)
const brushButtonRef = ref<HTMLElement | null>(null)

// Toggle brush popout
const handleBrushButtonClick = () => {
  // Immediately switch to drawing with the last-used brush type
  store.setTool('draw')
  showBrushPopout.value = !showBrushPopout.value
}

// Handle brush type selection
const selectBrushType = (type: BrushType) => {
  store.setBrushType(type)
  store.setTool('draw')
  showBrushPopout.value = false
}

// Close popout when clicking outside
const handleClickOutside = (e: MouseEvent) => {
  if (brushButtonRef.value && !brushButtonRef.value.contains(e.target as Node)) {
    showBrushPopout.value = false
  }
}

// Watch for clicks outside when popout is open
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

</script>

<template>
  <div class="toolbar p-2 rounded-lg space-y-2 flex flex-col">
    <!-- Tool Selection with Brush Color Toggle -->
    <div class="flex gap-1 relative">
      <div class="flex-1 relative" ref="brushButtonRef">
        <button @click="handleBrushButtonClick" :class="[
          'w-full px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'draw'
            ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :title="'Draw'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brush-icon lucide-brush w-4 h-4">
            <path d="m11 10 3 3" />
            <path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z" />
            <path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031" />
          </svg>
        </button>
        <!-- Brush Type Popout -->
        <Transition name="popout">
          <div v-if="showBrushPopout" class="brush-popout" @click.stop>
            <button @click="selectBrushType('standard')" :class="[
              'brush-type-btn',
              store.brushType === 'standard' ? 'active' : ''
            ]" title="Standard Brush">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                style="width: 20px; height: 20px; display: block;" class="absolute">
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </button>
            <button @click="selectBrushType('dotted')" :class="[
              'brush-type-btn',
              store.brushType === 'dotted' ? 'active' : ''
            ]" title="Dotted Brush">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                style="width: 20px; height: 20px; display: block;" class="absolute">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            <button @click="selectBrushType('arrow')" :class="[
              'brush-type-btn',
              store.brushType === 'arrow' ? 'active' : ''
            ]" title="Arrow Brush">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                style="width: 20px; height: 20px; display: block;" class="absolute rotate-180">
                <line x1="4" y1="12" x2="16" y2="12" />
                <line x1="12" y1="6" x2="20" y2="12" />
                <line x1="12" y1="18" x2="20" y2="12" />
              </svg>
            </button>
          </div>
        </Transition>
      </div>
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
          ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
          : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
      ]" :title="'Erase'">
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
          <!-- <button @click="store.toggleMap()"
            class="px-2 py-1.5 bg-purple-700 text-white rounded hover:bg-purple-600 transition-colors flex items-center justify-center"
            :title="'Toggle Map View'">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
              <path d="M3 9h6" />
              <path d="M15 9h6" />
              <path d="M9 3v6" />
              <path d="M9 15v6" />
            </svg>
          </button> -->
        </div>
        <div class="pt-2 space-y-2">
          <div class="toggle-row">
            <div class="flex flex-col leading-tight">
              <span class="text-sm font-semibold text-gray-100">Buildings</span>
              <span class="text-[11px] text-gray-300">Ancients & towers</span>
            </div>
            <button class="toggle-switch" :class="{ on: store.autoPlaceBuildings }"
              :aria-pressed="store.autoPlaceBuildings" @click="store.toggleAutoPlaceBuildings()">
              <span class="toggle-thumb"></span>
            </button>
          </div>
          <div class="toggle-row">
            <div class="flex flex-col leading-tight">
              <span class="text-sm font-semibold text-gray-100">Watchers</span>
              <span class="text-[11px] text-gray-300">Auto-place watcher spots</span>
            </div>
            <button class="toggle-switch" :class="{ on: store.autoPlaceWatchers }"
              :aria-pressed="store.autoPlaceWatchers" @click="store.toggleAutoPlaceWatchers()">
              <span class="toggle-thumb"></span>
            </button>
          </div>
          <div class="toggle-row">
            <div class="flex flex-col leading-tight">
              <span class="text-sm font-semibold text-gray-100">Structures</span>
              <span class="text-[11px] text-gray-300">Warp gate, tormentor, lotus</span>
            </div>
            <button class="toggle-switch" :class="{ on: store.autoPlaceStructures }"
              :aria-pressed="store.autoPlaceStructures" @click="store.toggleAutoPlaceStructures()">
              <span class="toggle-thumb"></span>
            </button>
          </div>
          <div class="toggle-row">
            <div class="flex flex-col leading-tight">
              <span class="text-sm font-semibold text-gray-100">Neutral Camps</span>
              <span class="text-[11px] text-gray-300">Ancient, large, medium, small</span>
            </div>
            <button class="toggle-switch" :class="{ on: store.autoPlaceNeutralCamps }"
              :aria-pressed="store.autoPlaceNeutralCamps" @click="store.toggleAutoPlaceNeutralCamps()">
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  background-color: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(4px);
}

.brush-popout {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  display: flex;
  gap: 4px;
  background-color: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(8px);
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(100, 100, 100, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  margin-bottom: 4px;
}

.popout-enter-active,
.popout-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.popout-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.popout-enter-to {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}

.popout-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}

.popout-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.brush-type-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 4px;
  color: rgba(229, 231, 235, 1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.brush-type-btn svg {
  color: inherit;
  stroke: currentColor !important;
  fill: none !important;
  pointer-events: none;
}

.brush-type-btn:hover {
  background-color: rgba(75, 85, 99, 0.9);
  border-color: rgba(150, 150, 150, 0.5);
  transform: scale(1.05);
}

.brush-type-btn.active {
  background-color: rgba(59, 130, 246, 0.8);
  border-color: rgba(147, 197, 253, 0.6);
  color: white;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0.45rem;
  border-radius: 0.75rem;
  background-color: rgba(31, 41, 55, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.toggle-switch {
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 9999px;
  border: 2px solid #d6e3f2;
  background: linear-gradient(145deg, #0f1623, #111827);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  padding: 0;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #e9f6ff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6), 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.toggle-switch.on {
  border-color: #ebf4ff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 10px rgba(64, 172, 255, 0.35);
}

.toggle-switch.on .toggle-thumb {
  transform: translateX(18px);
  background: #f4fbff;
}

.toggle-switch:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}
</style>
