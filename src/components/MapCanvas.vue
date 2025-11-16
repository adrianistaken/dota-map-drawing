<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEditorStore, type Stroke, type Icon } from '../stores/useEditorStore'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Node } from 'konva/lib/Node'

const store = useEditorStore()

// Map image dimensions - will be set when image loads
const mapImage = ref<HTMLImageElement | null>(null)
const stageWidth = ref(800)
const stageHeight = ref(600)
const mapLoaded = ref(false)

// Icon images - preload hero icon
const heroIconImage = ref<HTMLImageElement | null>(null)

// Current drawing state
const isDrawing = ref(false)
const currentLine = ref<number[]>([])
const currentStrokeId = ref<string | null>(null)

// Stage ref for accessing Konva stage instance
const stageRef = ref<any>(null)

// Load map image and hero icon
onMounted(() => {
    // Load map image
    const mapImg = new Image()
    mapImg.src = '/images/Gamemap_7.39_minimap_dota2_gameasset.png'
    mapImg.onload = () => {
        mapImage.value = mapImg
        // Set stage size to match image
        stageWidth.value = mapImg.width
        stageHeight.value = mapImg.height
        mapLoaded.value = true
    }

    // Load hero icon
    const heroImg = new Image()
    heroImg.src = '/images/Abaddon_minimap_icon.webp'
    heroImg.onload = () => {
        heroIconImage.value = heroImg
    }
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
    const target = e.target
    const targetType = target.getType()

    // Check if clicking directly on an existing icon
    // Icons are draggable Image nodes, while the map background is not draggable
    // So we check if it's a draggable Image node
    const isClickingIcon = targetType === 'Image' && (target as any).draggable() === true

    if (store.currentTool === 'draw') {
        // Only start drawing if not clicking on an icon or stroke
        if (targetType !== 'Image' && targetType !== 'Line') {
            isDrawing.value = true
            currentLine.value = [pos.x, pos.y]
            currentStrokeId.value = `stroke-${Date.now()}-${Math.random()}`
        }
    } else if (store.currentTool === 'icon') {
        // Only place new icon if clicking on empty space (stage or layer)
        // If clicking on an existing icon, let the drag handler take over
        if (!isClickingIcon && (targetType === 'Stage' || targetType === 'Layer')) {
            const iconId = `icon-${Date.now()}-${Math.random()}`
            const newIcon: Icon = {
                id: iconId,
                x: pos.x - 16, // Center the icon (assuming 32x32 icon)
                y: pos.y - 16,
                image: '/images/Abaddon_minimap_icon.webp'
            }
            store.addIcon(newIcon)
        }
    } else if (store.currentTool === 'erase') {
        // Erase strokes near click position
        handleErase(pos.x, pos.y)
    }
}

// Handle stage mouse move - continue drawing
const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.value || store.currentTool !== 'draw') return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Create a new array reference to ensure vue-konva detects the change
    // This is important for real-time drawing updates
    currentLine.value = [...currentLine.value, pos.x, pos.y]
}

// Handle stage mouse up - finish drawing
const handleStageMouseUp = () => {
    if (isDrawing.value && currentLine.value.length >= 4) {
        // Need at least 2 points (4 numbers: x1, y1, x2, y2)
        const stroke: Stroke = {
            id: currentStrokeId.value!,
            points: [...currentLine.value],
            color: store.brushColor,
            strokeWidth: store.brushSize
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

    const eraserRadius = store.brushSize
    const strokesToRemove: string[] = []

    // Check each stroke for intersection with eraser circle
    store.strokes.forEach(stroke => {
        // Check if any point in the stroke is within eraser radius
        for (let i = 0; i < stroke.points.length; i += 2) {
            const px = stroke.points[i]
            const py = stroke.points[i + 1]
            const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2)
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
}

// Handle icon drag start - save initial position
const handleIconDragStart = () => {
    // Save state when drag starts
    store.saveState()
}

// Handle icon drag move - update position
const handleIconDragMove = (iconId: string, e: KonvaEventObject<MouseEvent>) => {
    const node = e.target as Node
    store.updateIconPosition(iconId, node.x(), node.y())
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
                    points: stroke.points,
                    stroke: stroke.color,
                    strokeWidth: stroke.strokeWidth,
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
                    image: heroIconImage,
                    x: icon.x,
                    y: icon.y,
                    width: 32,
                    height: 32,
                    draggable: true,
                    listening: true
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
