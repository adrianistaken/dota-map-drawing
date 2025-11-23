<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore, type Stroke, type Icon } from '../stores/useEditorStore'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Node } from 'konva/lib/Node'

const store = useEditorStore()

// Map image dimensions - will be set when image loads
const mapImage = ref<HTMLImageElement | null>(null)
const stageWidth = ref(800)
const stageHeight = ref(600)
const mapLoaded = ref(false)

// Preserve the original map dimensions so we can scale it responsibly
const originalMapSize = ref({ width: 0, height: 0 })

const SIDEBAR_WIDTH = 450
// Account for app container padding (1.5rem = 24px on each side) + gap (1.5rem = 24px) + extra margin
const MAP_PADDING = 150
const COMFORTABLE_SCALE = 0.7
const ICON_BASE_SIZE = 64

const currentScale = ref(1)
const iconImageCache = ref<Record<string, HTMLImageElement>>({})

// Current drawing state
const isDrawing = ref(false)
const currentLine = ref<number[]>([])
const currentStrokeId = ref<string | null>(null)

// Stage ref for accessing Konva stage instance
const stageRef = ref<any>(null)

const updateStageSize = () => {
    if (!originalMapSize.value.width || !originalMapSize.value.height) return

    const availableWidth = Math.max(300, window.innerWidth - SIDEBAR_WIDTH - MAP_PADDING)
    const availableHeight = Math.max(300, window.innerHeight - MAP_PADDING)

    const widthRatio = availableWidth / originalMapSize.value.width
    const heightRatio = availableHeight / originalMapSize.value.height

    const baseScale = Math.min(widthRatio, heightRatio, 1)
    const scaleFactor = Math.min(COMFORTABLE_SCALE, baseScale)

    stageWidth.value = Math.round(originalMapSize.value.width * scaleFactor)
    stageHeight.value = Math.round(originalMapSize.value.height * scaleFactor)
    currentScale.value = scaleFactor
}

const handleResize = () => {
    updateStageSize()
}

// Load map image based on toggle state
const loadMapImage = () => {
    const mapPath = store.useSimpleMap
        ? '/images/Gamemap_7.39_simplemap_dota2_gameasset.png'
        : '/images/Gamemap_7.39_minimap_dota2_gameasset.png'

    mapLoaded.value = false
    const mapImg = new Image()
    mapImg.src = mapPath
    mapImg.onload = () => {
        mapImage.value = mapImg
        originalMapSize.value = { width: mapImg.width, height: mapImg.height }
        updateStageSize()
        mapLoaded.value = true
    }
}

// Watch for map toggle changes
watch(() => store.useSimpleMap, () => {
    loadMapImage()
})

// Load map image and hero icon
onMounted(() => {
    loadMapImage()
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

// Get stage instance from vue-konva
const getStage = () => {
    if (stageRef.value) {
        return stageRef.value.getStage()
    }
    return null
}

// Handle stage mouse down - start drawing or place icon
const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    // Konva coordinates are relative to the stage
    // e.evt is the native browser event, e.target is the Konva node
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Get the target node - if it's an icon (Image node), don't place a new icon
    // Let the icon's drag handler take over instead
    const target = e.target as Node
    const getClassName = (node: Node | null) => {
        if (!node) return ''
        if (typeof (node as any).getClassName === 'function') {
            return (node as any).getClassName()
        }
        if (typeof (node as any).getType === 'function') {
            return (node as any).getType()
        }
        return ''
    }
    const targetClass = getClassName(target)

    // Check if clicking directly on an existing icon by using the Konva node name
    const isIconNode = typeof (target as any).hasName === 'function' && (target as any).hasName('hero-icon')
    const isMapImage = targetClass === 'Image' && !isIconNode

    if (store.currentTool === 'draw') {
        // Only start drawing if not clicking on an icon or stroke
        if (!isIconNode && targetClass !== 'Line') {
            isDrawing.value = true
            currentLine.value = [pos.x, pos.y]
            currentStrokeId.value = `stroke-${Date.now()}-${Math.random()}`
        }
    } else if (store.currentTool === 'icon') {
        // Only place new icon if clicking on empty space (stage or layer)
        // If clicking on an existing icon, let the drag handler take over
        const isStageOrLayer = targetClass === 'Stage' || targetClass === 'Layer'
        if (!isIconNode && (isStageOrLayer || isMapImage)) {
            // Check for either hero or map icon selection
            const selectedIcon = store.selectedHero || store.selectedMapIcon
            if (!selectedIcon) return
            const iconId = `icon-${Date.now()}-${Math.random()}`
            const newIcon: Icon = {
                id: iconId,
                x: pos.x / currentScale.value - ICON_BASE_SIZE / 2,
                y: pos.y / currentScale.value - ICON_BASE_SIZE / 2,
                image: selectedIcon.image,
                size: ICON_BASE_SIZE
            }
            store.addIcon(newIcon)
        }
    } else if (store.currentTool === 'erase') {
        // Erase strokes near click position
        handleErase(pos.x, pos.y)
    }
}

// Handle stage mouse move - continue drawing or erasing
const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    if (store.currentTool === 'draw' && isDrawing.value) {
        // Create a new array reference to ensure vue-konva detects the change
        // This is important for real-time drawing updates
        currentLine.value = [...currentLine.value, pos.x, pos.y]
    } else if (store.currentTool === 'erase' && isErasing.value) {
        handleErase(pos.x, pos.y)
    }
}

// Handle stage mouse up - finish drawing
const handleStageMouseUp = () => {
    if (isDrawing.value && currentLine.value.length >= 4) {
        // Need at least 2 points (4 numbers: x1, y1, x2, y2)
        const mapPoints = currentLine.value.map(point => point / currentScale.value)
        const stroke: Stroke = {
            id: currentStrokeId.value!,
            points: mapPoints,
            color: store.brushColor,
            strokeWidth: store.brushSize / currentScale.value
        }
        store.addStroke(stroke)
    }
    isDrawing.value = false
    currentLine.value = []
    currentStrokeId.value = null

    // Reset erasing state when mouse is released
    if (isErasing.value) {
        isErasing.value = false
        // Clear redo stack after erasing is complete
        store.redoStack.length = 0
    }
}

// Track if we're currently erasing (to save state only once per erase action)
const isErasing = ref(false)

// Handle erasing - remove strokes that intersect with eraser
const handleErase = (x: number, y: number) => {
    // Save state only once when erasing starts
    if (!isErasing.value) {
        store.saveState()
        isErasing.value = true
    }

    const eraserRadius = store.brushSize / currentScale.value
    const strokesToRemove: string[] = []
    const iconsToRemove: string[] = []
    const mapX = x / currentScale.value
    const mapY = y / currentScale.value

    // Check each stroke for intersection with eraser circle
    store.strokes.forEach(stroke => {
        // Check if any point in the stroke is within eraser radius
        for (let i = 0; i < stroke.points.length; i += 2) {
            const px = stroke.points[i]
            const py = stroke.points[i + 1]
            const distance = Math.sqrt((px - mapX) ** 2 + (py - mapY) ** 2)
            if (distance <= eraserRadius) {
                strokesToRemove.push(stroke.id)
                break
            }
        }
    })

    // Remove intersecting strokes (without saving state, since we already saved)
    strokesToRemove.forEach(id => {
        const index = store.strokes.findIndex(s => s.id === id)
        if (index !== -1) {
            store.strokes.splice(index, 1)
        }
    })

    store.icons.forEach(icon => {
        const centerX = icon.x + icon.size / 2
        const centerY = icon.y + icon.size / 2
        const distance = Math.sqrt((centerX - mapX) ** 2 + (centerY - mapY) ** 2)
        if (distance <= icon.size / 2 + eraserRadius) {
            iconsToRemove.push(icon.id)
        }
    })

    iconsToRemove.forEach(id => {
        const index = store.icons.findIndex(icon => icon.id === id)
        if (index !== -1) {
            store.icons.splice(index, 1)
        }
    })
}

// Handle icon drag start - save initial position
const handleIconDragStart = () => {
    // Save state when drag starts
    store.saveState()
}

// Handle icon drag move - update position
const handleIconDragMove = (iconId: string, e: KonvaEventObject<MouseEvent>) => {
    const node = e.target as Node
    const mapX = node.x() / currentScale.value
    const mapY = node.y() / currentScale.value
    store.updateIconPosition(iconId, mapX, mapY)
}

// Wrapper for drag move event handler
const createDragMoveHandler = (iconId: string) => {
    return (e: KonvaEventObject<MouseEvent>) => {
        handleIconDragMove(iconId, e)
    }
}

// Handle icon drag end - clear tracking
const handleIconDragEnd = () => {
    // State already saved on drag start, no need to save again
}

// Computed property for current drawing line config (if actively drawing)
// Returns a new object reference each time to ensure vue-konva detects changes
const currentDrawingLine = computed(() => {
    if (!isDrawing.value || currentLine.value.length < 4) return null
    // Create a new array copy to ensure reactivity
    return {
        points: [...currentLine.value],
        stroke: store.brushColor,
        strokeWidth: store.brushSize,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        tension: 0.5
    }
})

// Stage config for vue-konva
const stageConfig = computed(() => ({
    width: stageWidth.value,
    height: stageHeight.value
}))

// Map image config
const mapImageConfig = computed(() => ({
    image: mapImage.value,
    x: 0,
    y: 0,
    width: stageWidth.value,
    height: stageHeight.value
}))

const scalePoints = (points: number[]) => points.map(point => point * currentScale.value)

const getIconImage = (imagePath: string) => {
    if (!iconImageCache.value[imagePath]) {
        const img = new Image()
        img.src = imagePath
        iconImageCache.value[imagePath] = img
    }
    return iconImageCache.value[imagePath]
}

// Expose stage ref for parent components (for export functionality)
defineExpose({
    getStage
})
</script>

<template>
    <div class="map-canvas-container">
        <v-stage v-if="mapLoaded" ref="stageRef" :config="stageConfig" @mousedown="handleStageMouseDown"
            @mousemove="handleStageMouseMove" @mouseup="handleStageMouseUp" @mouseleave="handleStageMouseUp">
            <v-layer>
                <!-- Map background image -->
                <!-- Konva Image component requires the image element, not just a path -->
                <v-image v-if="mapImage" :config="mapImageConfig" />

                <!-- Render all saved strokes -->
                <v-line v-for="stroke in store.strokes" :key="stroke.id" :config="{
                    points: scalePoints(stroke.points),
                    stroke: stroke.color,
                    strokeWidth: stroke.strokeWidth * currentScale,
                    lineCap: 'round',
                    lineJoin: 'round',
                    tension: 0.5,
                    globalCompositeOperation: 'source-over'
                }" />

                <!-- Render current drawing line (if actively drawing) -->
                <!-- Using computed config ensures vue-konva detects changes in real-time -->
                <v-line v-if="currentDrawingLine" :config="currentDrawingLine" />

                <!-- Render all icons with drag functionality -->
                <v-image v-for="icon in store.icons" :key="icon.id" :config="{
                    image: getIconImage(icon.image),
                    x: icon.x * currentScale,
                    y: icon.y * currentScale,
                    width: icon.size * currentScale,
                    height: icon.size * currentScale,
                    draggable: true,
                    listening: true,
                    name: 'hero-icon'
                }" @dragstart="handleIconDragStart" @dragmove="createDragMoveHandler(icon.id)"
                    @dragend="handleIconDragEnd" />
            </v-layer>
        </v-stage>
        <div v-else class="loading">Loading map...</div>
    </div>
</template>

<style scoped>
.map-canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loading {
    color: white;
    font-size: 1.5rem;
}
</style>
