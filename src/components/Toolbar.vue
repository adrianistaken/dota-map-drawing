<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore, type Tool } from '../stores/useEditorStore'
import type MapCanvas from './MapCanvas.vue'

const props = defineProps<{
  mapCanvasRef?: InstanceType<typeof MapCanvas> | null
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

const toolButtonClasses = (tool: Tool) => [
  'px-4 py-2 rounded border-2 transition-all flex items-center justify-between gap-3',
  store.currentTool === tool
    ? 'bg-blue-600 text-white border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.6)] scale-[1.01]'
    : 'bg-gray-700 text-gray-200 border-transparent hover:bg-gray-600'
]

// Brush controls
const handleColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  store.setBrushColor(target.value)
}

const handleSizeChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  store.setBrushSize(Number(target.value))
}
</script>

<template>
  <div class="toolbar bg-gray-800 p-4 rounded-lg space-y-4">
    <h2 class="text-white text-lg font-semibold mb-4">Tools</h2>
    
    <!-- Tool Selection -->
    <div class="space-y-2">
      <h3 class="text-gray-300 text-sm font-medium">Select Tool</h3>
      <div class="flex flex-col gap-2">
        <button @click="setTool('draw')" :class="toolButtonClasses('draw')">
          <span class="flex items-center gap-2 font-semibold">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="store.currentTool === 'draw'
                ? 'bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'bg-gray-500'
              "
            ></span>
            Draw
          </span>
          <span v-if="store.currentTool === 'draw'" class="text-xs uppercase tracking-widest">Active</span>
        </button>
        <button @click="setTool('erase')" :class="toolButtonClasses('erase')">
          <span class="flex items-center gap-2 font-semibold">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="store.currentTool === 'erase'
                ? 'bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                : 'bg-gray-500'
              "
            ></span>
            Erase
          </span>
          <span v-if="store.currentTool === 'erase'" class="text-xs uppercase tracking-widest">Active</span>
        </button>
      </div>
    </div>

    <!-- Brush Controls (only show when drawing or erasing) -->
    <div v-if="store.currentTool === 'draw' || store.currentTool === 'erase'" class="space-y-2">
      <h3 class="text-gray-300 text-sm font-medium">Brush Settings</h3>
      
      <!-- Color Picker (only for draw tool) -->
      <div v-if="store.currentTool === 'draw'" class="space-y-1">
        <label class="text-gray-400 text-xs">Color</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="store.brushColor"
            @input="handleColorChange"
            class="w-12 h-8 rounded cursor-pointer"
          />
          <input
            type="text"
            :value="store.brushColor"
            @input="handleColorChange"
            class="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      <!-- Brush Size -->
      <div class="space-y-1">
        <label class="text-gray-400 text-xs">
          Size: {{ store.brushSize }}px
        </label>
        <input
          type="range"
          :value="store.brushSize"
          @input="handleSizeChange"
          min="1"
          max="50"
          class="w-full"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-2 pt-4 border-t border-gray-700">
      <h3 class="text-gray-300 text-sm font-medium">Actions</h3>
      <div class="flex flex-col gap-2">
        <button
          @click="store.undo()"
          :disabled="store.undoStack.length === 0"
          class="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Undo (Ctrl+Z)
        </button>
        <button
          @click="store.redo()"
          :disabled="store.redoStack.length === 0"
          class="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Redo (Ctrl+Shift+Z)
        </button>
        <button
          @click="store.clearMap()"
          class="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
        >
          Clear Map
        </button>
        <button
          @click="store.removeDrawings()"
          class="px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Remove Drawings
        </button>
        <button
          @click="store.removeIcons()"
          class="px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Remove Icons
        </button>
        <button
          @click="downloadPNG"
          class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 transition-colors"
        >
          Download PNG
        </button>
        <button
          @click="copyToClipboard"
          class="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>

