<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useEditorStore, type Tool } from '../stores/useEditorStore'

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

</script>

<template>
  <div class="toolbar p-2 rounded-lg space-y-2 shrink-0">
    <!-- Tool Selection -->
    <div class="space-y-1">
      <div class="flex gap-1">
        <button @click="setTool('draw')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'draw'
            ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :title="'Draw'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>
        <button @click="setTool('erase')" :class="[
          'flex-1 px-2 py-1.5 rounded border-2 transition-all flex items-center justify-center',
          store.currentTool === 'erase'
            ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
            : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
        ]" :title="'Erase'">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <path d="M18 8l-6 6" />
            <path d="M12 8l6 6" />
            <rect x="2" y="4" width="5" height="16" rx="0.5" fill="currentColor" opacity="0.4" />
            <rect x="2" y="4" width="5" height="16" rx="0.5" />
            <line x1="2" y1="8" x2="7" y2="8" />
            <line x1="2" y1="12" x2="7" y2="12" />
            <line x1="2" y1="16" x2="7" y2="16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Brush / Eraser Controls -->
    <div class="space-y-2">
      <button @click="handleToggleBrushColor"
        class="w-full px-2 py-1.5 rounded border-2 border-transparent text-gray-200 hover:opacity-80 transition-all duration-300 flex items-center justify-center text-sm font-semibold"
        :style="{ backgroundColor: brushColorBg }">
        Toggle Brush
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
          <button @click="store.toggleMap()"
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
          </button>
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
</style>
