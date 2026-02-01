<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useEditorStore, type Tool, type BrushType } from '../stores/useEditorStore'
import LastUpdatedBadge from './LastUpdatedBadge.vue';
import posthog from 'posthog-js';

const props = defineProps<{
  mapCanvasRef?: { getStage: () => any } | null
}>()

const store = useEditorStore()

// Keyboard shortcuts for undo/redo
const handleKeyDown = (e: KeyboardEvent) => {
  const isModifierPressed = e.ctrlKey || e.metaKey
  const key = typeof e.key === 'string' ? e.key.toLowerCase() : ''
  const isZKey = e.code === 'KeyZ' || key === 'z'
  const isYKey = e.code === 'KeyY' || key === 'y'

  // Ctrl/Cmd + Z for undo
  if (isModifierPressed && isZKey && !e.shiftKey) {
    e.preventDefault()
    store.undo()
    return
  }
  // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Shift + Y for redo (Mac-style)
  if (isModifierPressed && e.shiftKey && (isZKey || isYKey)) {
    e.preventDefault()
    store.redo()
    return
  }
  // Ctrl/Cmd + Y for redo (alternative)
  if (isModifierPressed && isYKey) {
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

// Add watermark to exported image
const addWatermarkToImage = async (imageDataURL: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Load the map image
    const mapImage = new Image()
    mapImage.crossOrigin = 'anonymous'
    mapImage.onload = () => {
      // Load the favicon
      const faviconImage = new Image()
      faviconImage.crossOrigin = 'anonymous'
      faviconImage.onload = () => {
        try {
          // Create a canvas matching the map image dimensions
          const canvas = document.createElement('canvas')
          canvas.width = mapImage.width
          canvas.height = mapImage.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw the map image
          ctx.drawImage(mapImage, 0, 0)

          // Watermark specifications
          const faviconHeight = 45 // Fixed pixel size
          const padding = 25 // Padding from edges (increased)
          const textSpacing = 15 // Space between favicon and text (increased)
          const opacity = 0.65 // 65% opacity (moderate subtlety)

          // Calculate favicon dimensions (maintain aspect ratio)
          const faviconAspectRatio = faviconImage.width / faviconImage.height
          const faviconWidth = faviconHeight * faviconAspectRatio

          // Calculate text dimensions - match toggleables font (text-sm font-semibold)
          // Using system font stack to match the app's font family
          const fontSize = faviconHeight * 0.6 // ~27px at 2x pixel ratio
          ctx.font = `600 ${fontSize}px system-ui, Avenir, Helvetica, Arial, sans-serif` // font-semibold (600 weight)
          ctx.textBaseline = 'middle'
          const text = 'dota2mapdrawing.com'

          // Calculate watermark position (bottom-left with padding)
          const watermarkX = padding
          const watermarkY = canvas.height - faviconHeight - padding

          // Set opacity for watermark
          ctx.save()
          ctx.globalAlpha = opacity

          // Draw favicon
          ctx.drawImage(
            faviconImage,
            watermarkX,
            watermarkY,
            faviconWidth,
            faviconHeight
          )

          // Draw text next to favicon
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)' // Light color for visibility
          ctx.fillText(
            text,
            watermarkX + faviconWidth + textSpacing,
            watermarkY + faviconHeight / 2
          )

          ctx.restore()

          // Export the watermarked canvas as data URL
          const watermarkedDataURL = canvas.toDataURL('image/png', 1)
          resolve(watermarkedDataURL)
        } catch (error) {
          reject(error)
        }
      }
      faviconImage.onerror = () => {
        reject(new Error('Failed to load favicon image'))
      }
      faviconImage.src = '/dota2mapdrawinglogo.png'
    }
    mapImage.onerror = () => {
      reject(new Error('Failed to load map image'))
    }
    mapImage.src = imageDataURL
  })
}

// Export stage to PNG
const downloadPNG = async () => {
  const stage = props.mapCanvasRef?.getStage()
  if (!stage) {
    console.error('Stage not found')
    return
  }

  try {
    // Use Konva's toDataURL method for high-quality export
    // pixelRatio: 2 for higher resolution
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    })

    // Add watermark to the exported image
    const watermarkedDataURL = await addWatermarkToImage(dataURL)

    // Create download link
    const link = document.createElement('a')
    link.download = 'dota-map-drawing.png'
    link.href = watermarkedDataURL
    link.click()
  } catch (error) {
    console.error('Failed to add watermark:', error)
    // Fallback: download without watermark
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
      quality: 1
    })
    const link = document.createElement('a')
    link.download = 'dota-map-drawing.png'
    link.href = dataURL
    link.click()
  }
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

    // Add watermark to the exported image
    let watermarkedDataURL: string
    try {
      watermarkedDataURL = await addWatermarkToImage(dataURL)
    } catch (watermarkError) {
      console.error('Failed to add watermark:', watermarkError)
      // Fallback: use original image without watermark
      watermarkedDataURL = dataURL
    }

    // Convert data URL to blob
    const response = await fetch(watermarkedDataURL)
    const blob = await response.blob()

    try {
      // Use Clipboard API to copy image
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      alert('Map copied to clipboard!')
      posthog.capture('map_copied_to_clipboard', { property: 'value' })
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: copy data URL as text
      await navigator.clipboard.writeText(watermarkedDataURL)
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

// Track starting size when slider interaction begins
let heroIconSizeStartValue: number | null = null
let hasHeroIconsAtStart = false

const handleHeroIconSizeInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  // Update in real-time without saving to history
  store.setHeroIconSize(value, false)
}

const handleHeroIconSizeMouseDown = () => {
  // Save the starting value and state when user starts dragging
  heroIconSizeStartValue = store.heroIconSize
  hasHeroIconsAtStart = store.icons.some((icon: { image: string }) => icon.image.includes('/images/icons/heroes/'))
  if (hasHeroIconsAtStart) {
    // Save state before any changes
    store.saveState()
  }
}

const handleHeroIconSizeMouseUp = () => {
  // Only save to history if the value actually changed and we have hero icons
  if (heroIconSizeStartValue !== null && heroIconSizeStartValue !== store.heroIconSize && hasHeroIconsAtStart) {
    // Clear redo stack since we made a change
    store.redoStack.length = 0
  }
  heroIconSizeStartValue = null
  hasHeroIconsAtStart = false
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
        <!-- Temporarily hiding arrow brush option while keeping implementation intact -->
        <!--
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
        -->
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
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="20px" height="23px"
              class="toggle-category-icon" viewBox="0 0 24 28">
              <path
                d="M0 0 C2.97 0 5.94 0 9 0 C9 0.99 9 1.98 9 3 C9.804375 3.144375 10.60875 3.28875 11.4375 3.4375 C14 4 14 4 15 5 C15.09823996 6.47648876 15.12973519 7.95775417 15.125 9.4375 C15.12886719 10.64212891 15.12886719 10.64212891 15.1328125 11.87109375 C15 14 15 14 14 16 C14.09861328 17.17949219 14.09861328 17.17949219 14.19921875 18.3828125 C14 21 14 21 12.20703125 23.0546875 C11.41683594 23.65539062 10.62664063 24.25609375 9.8125 24.875 C9.03519531 25.49117187 8.25789063 26.10734375 7.45703125 26.7421875 C4.47508317 28.26871736 3.13427414 27.9909428 0 27 C0 26.34 0 25.68 0 25 C-0.78375 24.7525 -1.5675 24.505 -2.375 24.25 C-5 23 -5 23 -6.375 21.0625 C-7 19 -7 19 -6 16 C-6.495 15.62875 -6.99 15.2575 -7.5 14.875 C-9.59755514 12.25305607 -9.21743835 10.26157528 -9 7 C-8.01 7 -7.02 7 -6 7 C-6 5.35 -6 3.7 -6 2 C-4.02 2 -2.04 2 0 2 C0 1.34 0 0.68 0 0 Z "
                fill="#020710" transform="translate(9,0)" />
              <path
                d="M0 0 C1.32 0.33 2.64 0.66 4 1 C3.58525633 6.28798182 2.64775386 9.11690718 -1 13 C-0.34 13 0.32 13 1 13 C1.66 11.68 2.32 10.36 3 9 C4.32 9.66 5.64 10.32 7 11 C6.835 11.804375 6.67 12.60875 6.5 13.4375 C5.96808161 15.7284443 5.96808161 15.7284443 6 17 C6.99 17 7.98 17 9 17 C3.77862595 22.65648855 3.77862595 22.65648855 0 23 C-1.921875 22.00390625 -1.921875 22.00390625 -3.75 20.5625 C-4.36359375 20.08941406 -4.9771875 19.61632812 -5.609375 19.12890625 C-6.06828125 18.75636719 -6.5271875 18.38382813 -7 18 C-6.67 16.35 -6.34 14.7 -6 13 C-6.66 12.566875 -7.32 12.13375 -8 11.6875 C-8.66 11.130625 -9.32 10.57375 -10 10 C-10 9.01 -10 8.02 -10 7 C-6.125 8.875 -6.125 8.875 -5 10 C-2.96022723 6.75490696 -1.33488128 3.59391114 0 0 Z "
                fill="#c8c8c8" transform="translate(12,2)" />
              <path
                d="M0 0 C2.97 0 5.94 0 9 0 C9 0.99 9 1.98 9 3 C9.99 3.33 10.98 3.66 12 4 C10.02 6.97 10.02 6.97 8 10 C9.65 9.01 11.3 8.02 13 7 C13 8.65 13 10.3 13 12 C10.3333581 13.33332095 8.83319697 12.67102033 6 12 C5.01 13.485 5.01 13.485 4 15 C3.34 15 2.68 15 2 15 C3.20381448 12.50638429 4.45428722 10.31856917 6 8 C6.16713569 5.37468476 6.16713569 5.37468476 6 3 C5.01 3 4.02 3 3 3 C2.01 5.31 1.02 7.62 0 10 C-0.99 10 -1.98 10 -3 10 C-4.125 4.25 -4.125 4.25 -3 2 C-2.01 2 -1.02 2 0 2 C0 1.34 0 0.68 0 0 Z "
                fill="#555555" transform="translate(9,0)" />
              <path
                d="M0 0 C1.32 0.33 2.64 0.66 4 1 C3.58525633 6.28798182 2.64775386 9.11690718 -1 13 C-0.34 13 0.32 13 1 13 C0.67 14.32 0.34 15.64 0 17 C-2 16 -2 16 -3 13 C-6.50294871 11.28432339 -6.50294871 11.28432339 -10 10 C-10 9.01 -10 8.02 -10 7 C-6.125 8.875 -6.125 8.875 -5 10 C-2.96022723 6.75490696 -1.33488128 3.59391114 0 0 Z "
                fill="#a6a6a6" transform="translate(12,2)" />
              <path
                d="M0 0 C2.31 0 4.62 0 7 0 C6.67 0.66 6.34 1.32 6 2 C5.01 2.33 4.02 2.66 3 3 C1.28432339 6.50294871 1.28432339 6.50294871 0 10 C-0.99 10 -1.98 10 -3 10 C-4.125 4.25 -4.125 4.25 -3 2 C-2.01 2 -1.02 2 0 2 C0 1.34 0 0.68 0 0 Z "
                fill="#030c1b" transform="translate(9,0)" />
              <path
                d="M0 0 C0.66 0.33 1.32 0.66 2 1 C1.835 1.804375 1.67 2.60875 1.5 3.4375 C0.96808161 5.7284443 0.96808161 5.7284443 1 7 C1.99 7 2.98 7 4 7 C2.37660195 8.70884005 0.70680947 10.37446717 -1 12 C-1.66 12 -2.32 12 -3 12 C-4.1875 10.3125 -4.1875 10.3125 -5 8 C-3.67172689 5.14421282 -2.85356058 3.42678029 0 2 C0 1.34 0 0.68 0 0 Z "
                fill="#999999" transform="translate(17,12)" />
              <path
                d="M0 0 C0.556875 0.28875 1.11375 0.5775 1.6875 0.875 C4.08494645 2.0413253 6.51596939 3.0339881 9 4 C9 4.66 9 5.32 9 6 C9.66 6 10.32 6 11 6 C10.67 7.32 10.34 8.64 10 10 C8 9 8 9 7 6 C3.49705129 4.28432339 3.49705129 4.28432339 0 3 C0 2.01 0 1.02 0 0 Z "
                fill="#999999" transform="translate(2,9)" />
              <path
                d="M0 0 C1.32 0.33 2.64 0.66 4 1 C3.67 2.65 3.34 4.3 3 6 C2.34 6 1.68 6 1 6 C0.67 4.02 0.34 2.04 0 0 Z "
                fill="#8c8c8c" transform="translate(5,4)" />
              <path
                d="M0 0 C0.66 1.32 1.32 2.64 2 4 C0.68 4.33 -0.64 4.66 -2 5 C-2 3.68 -2 2.36 -2 1 C-1.34 0.67 -0.68 0.34 0 0 Z "
                fill="#d9d9d9" transform="translate(11,8)" />
              <path d="" fill="#313131" transform="translate(0,0)" />
              <path d="" fill="#333333" transform="translate(0,0)" />
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
          <input type="range" min="32" max="96" step="2" :value="store.heroIconSize" @input="handleHeroIconSizeInput"
            @mousedown="handleHeroIconSizeMouseDown" @mouseup="handleHeroIconSizeMouseUp"
            @touchstart="handleHeroIconSizeMouseDown" @touchend="handleHeroIconSizeMouseUp" class="hero-slider"
            aria-label="Adjust hero icon size" />
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

/* Mobile adjustments */
@media (max-width: 900px) {
  .toolbar-middle .space-y-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .toggle-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 0.375rem;
    border-top: none;
  }

  .toggle-row .flex-1 span {
    font-size: 0.6875rem;
  }

  .toggle-category-icon {
    width: 14px;
    height: 14px;
  }

  .toggle-switch {
    width: 36px;
    height: 20px;
  }

  .toggle-thumb {
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
  }

  .toggle-switch.on .toggle-thumb {
    transform: translateX(16px);
  }

  .toggle-icon {
    width: 8px;
    height: 8px;
  }

  /* Hero icon size section spans full width */
  .toolbar-middle .space-y-2>.space-y-2 {
    grid-column: span 2;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
