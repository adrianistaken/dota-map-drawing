<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore, type Stroke, type Icon } from '../stores/useEditorStore'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Node } from 'konva/lib/Node'
import { mapIconFiles, mapIconPath } from '../data/mapIcons'

type AutoIconCategory = 'buildings' | 'watchers' | 'structures' | 'neutralCamps' | 'runes'

// Determine which toggleable category an icon belongs to based on its image path
const getIconCategory = (imagePath: string): AutoIconCategory | null => {
    const path = imagePath.toLowerCase()

    // Buildings: Towers and Ancients
    if (path.includes('tower_45') || path.includes('tower_90') || path.includes('60px-ancient')) {
        return 'buildings'
    }

    // Watchers
    if (path.includes('watcher')) {
        return 'watchers'
    }

    // Structures: Lotus Pool, Warp Gate, Tormentor, Wisdom Rune
    if (path.includes('lotus_pool') || path.includes('warp_gate') || path.includes('tormentor') || path.includes('wisdom_rune')) {
        return 'structures'
    }

    // Neutral Camps
    if (path.includes('neutral_camp')) {
        return 'neutralCamps'
    }

    // Runes toggleable: Water Rune and Bounty Rune
    if (path.includes('water_rune') || path.includes('bounty_rune')) {
        return 'runes'
    }

    return null
}

// Apply the same shrinking logic as buildAutoIcon for manually placed icons
const applyToggleableIconShrinking = (icon: Icon): Icon => {
    const category = getIconCategory(icon.image)
    if (!category || category === 'runes') {
        // Runes don't shrink, and non-toggleable icons don't shrink
        return icon
    }

    // Determine shrink amount: neutral camps shrink by 4px, others by 8px
    const shrinkBy = category === 'neutralCamps' ? 4 : 8

    let size = icon.size
    let width = icon.width
    let height = icon.height

    // Apply shrinking
    if (size !== undefined) {
        size = Math.max(1, size - shrinkBy)
    }
    if (width !== undefined) {
        width = Math.max(1, width - shrinkBy)
    }
    if (height !== undefined) {
        height = Math.max(1, height - shrinkBy)
    }

    // Adjust position to keep center in same place
    const centerX = icon.x + (icon.width ?? icon.size ?? ICON_BASE_SIZE) / 2
    const centerY = icon.y + (icon.height ?? icon.size ?? ICON_BASE_SIZE) / 2
    const newWidth = width ?? size ?? ICON_BASE_SIZE
    const newHeight = height ?? size ?? ICON_BASE_SIZE
    const newX = centerX - newWidth / 2
    const newY = centerY - newHeight / 2

    return {
        ...icon,
        x: newX,
        y: newY,
        size,
        width,
        height
    }
}

const store = useEditorStore()

// Map image dimensions - will be set when image loads
const mapImage = ref<HTMLImageElement | null>(null)
const stageWidth = ref(800)
const stageHeight = ref(600)
const mapLoaded = ref(false)

// Preserve the original map dimensions so we can scale it responsibly
const originalMapSize = ref({ width: 0, height: 0 })

const SIDE_PANEL_WIDTH = 240
// Account for app container padding + gaps so the map stays centered between side panels
const MAP_PADDING = 70
const MOBILE_PADDING = 0
const COMFORTABLE_SCALE = 0.6
const MOBILE_COMFORTABLE_SCALE = 0.95
const MOBILE_BREAKPOINT = 900
const ICON_BASE_SIZE = 64

const currentScale = ref(1)
const iconImageCache = ref<Record<string, HTMLImageElement>>({})
const autoPlacementEnabled = computed(() =>
    store.autoPlaceBuildings || store.autoPlaceWatchers || store.autoPlaceStructures
)

// Current drawing state
const isDrawing = ref(false)
const currentLine = ref<number[]>([])
const currentStrokeId = ref<string | null>(null)
const currentArrowAngle = ref<number | null>(null)
const currentMousePos = ref<{ x: number; y: number } | null>(null)

// Audio for drawing sound
const drawingAudio = ref<HTMLAudioElement | null>(null)
const audioDuration = ref<number>(0) // Total duration of the audio clip
const isFirstPlay = ref(true) // Track if this is the first play after drawing starts
const isMouseMoving = ref(false) // Track if mouse is currently moving
let movementTimeout: ReturnType<typeof setTimeout> | null = null // Timeout to detect when movement stops

// Possible loop start times (in seconds) - all after the pencil down sound
// These will be used randomly to create natural variation
const LOOP_START_TIMES = [0.3, 0.5, 0.7, 0.4, 0.6, 0.8]

// Get a random loop start time (after pencil down sound, before end of clip)
const getRandomLoopStartTime = (): number => {
    if (audioDuration.value === 0) return 0.5 // Fallback if duration not loaded yet

    // Filter to only include times that are valid (not too close to the end)
    // Leave at least 0.5 seconds of audio to play
    const maxTime = Math.max(0, audioDuration.value - 0.5)
    const validTimes = LOOP_START_TIMES.filter(time => time < maxTime)

    // If we have valid times, pick one randomly
    if (validTimes.length > 0) {
        return validTimes[Math.floor(Math.random() * validTimes.length)]
    }

    // Fallback: use a point that's not too close to the end
    return Math.max(0.3, maxTime / 2)
}

// Handle mouse movement state for audio control
const handleMouseMovement = () => {
    if (!isDrawing.value || !drawingAudio.value) return

    // Clear any existing timeout
    if (movementTimeout) {
        clearTimeout(movementTimeout)
        movementTimeout = null
    }

    // If mouse wasn't moving, start/resume audio
    if (!isMouseMoving.value) {
        isMouseMoving.value = true

        // First play: start from beginning
        if (isFirstPlay.value) {
            drawingAudio.value.currentTime = 0
            isFirstPlay.value = false
        }
        // Otherwise: resume from current position (or start from random point if at end)

        // If audio has ended, restart from a random loop point
        if (drawingAudio.value.ended || drawingAudio.value.currentTime >= audioDuration.value - 0.1) {
            drawingAudio.value.currentTime = getRandomLoopStartTime()
        }

        drawingAudio.value.play().catch((err: unknown) => {
            console.warn('Could not play drawing audio:', err)
        })
    }

    // Set timeout to detect when movement stops (after 50ms of no movement)
    movementTimeout = setTimeout(() => {
        isMouseMoving.value = false
        if (drawingAudio.value) {
            drawingAudio.value.pause()
        }
        movementTimeout = null
    }, 50)
}

// Helper function to calculate smoothed angle from a window of points
// Uses a stable segment well before the end to avoid jitter from final mouse movements
// lookbackPoints: fixed number of points to look back from the end (e.g., 30 points)
// ignoreEndPoints: fixed number of points to ignore at the end (e.g., 10 points)
// The angle is calculated from a point that's lookbackPoints back to a point that's ignoreEndPoints back
// This ensures we use the direction from well before any jitter at the end
const calculateSmoothedAngle = (points: number[], lookbackPoints: number, ignoreEndPoints: number = 10): number | null => {
    if (points.length < 4) return null // Need at least 2 points

    const totalPoints = points.length / 2 // Each point is x, y

    // Ensure we have enough points for the calculation
    const minPointsNeeded = Math.max(lookbackPoints, ignoreEndPoints) + 1
    if (totalPoints < minPointsNeeded) {
        // For short lines, use a simpler calculation from start to a point before the end
        if (totalPoints < 4) return null
        const safeEndPoint = Math.max(2, totalPoints - 2) // Use a point 2 points back from end
        const startIdx = 0
        const endIdx = (safeEndPoint - 1) * 2
        const x1 = points[startIdx]
        const y1 = points[startIdx + 1]
        const x2 = points[endIdx]
        const y2 = points[endIdx + 1]
        return Math.atan2(y2 - y1, x2 - x1)
    }

    // Calculate stable segment well before the end
    // Start point: lookbackPoints back from the end
    // End point: ignoreEndPoints back from the end
    // This uses a stable segment that's well before any jitter
    const startPointIndex = Math.max(0, totalPoints - lookbackPoints)
    const endPointIndex = totalPoints - ignoreEndPoints

    // Ensure we have valid indices and start is before end
    if (startPointIndex >= endPointIndex || endPointIndex <= 0) {
        // Fallback: use a simpler calculation
        const safeEndPoint = Math.max(2, totalPoints - ignoreEndPoints)
        const startIdx = Math.max(0, (safeEndPoint - Math.min(lookbackPoints, safeEndPoint)) * 2)
        const endIdx = (safeEndPoint - 1) * 2
        const x1 = points[startIdx]
        const y1 = points[startIdx + 1]
        const x2 = points[endIdx]
        const y2 = points[endIdx + 1]
        return Math.atan2(y2 - y1, x2 - x1)
    }

    // Get the start and end points of the stable segment
    const startIdx = startPointIndex * 2
    const endIdx = (endPointIndex - 1) * 2

    const x1 = points[startIdx]
    const y1 = points[startIdx + 1]
    const x2 = points[endIdx]
    const y2 = points[endIdx + 1]

    // Calculate angle from start to end of the stable segment
    return Math.atan2(y2 - y1, x2 - x1)
}

// Helper to normalize angle difference (handles wrap-around)
const angleDifference = (angle1: number, angle2: number): number => {
    let diff = angle2 - angle1
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    return Math.abs(diff)
}

// Stage ref for accessing Konva stage instance
const stageRef = ref<any>(null)

const updateStageSize = () => {
    if (!originalMapSize.value.width || !originalMapSize.value.height) return

    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT
    const horizontalPadding = isMobile ? MOBILE_PADDING : MAP_PADDING
    const verticalPadding = isMobile ? MOBILE_PADDING : MAP_PADDING
    const sidebarOffset = isMobile ? 0 : SIDE_PANEL_WIDTH * 2

    const availableWidth = Math.max(300, window.innerWidth - sidebarOffset - horizontalPadding)
    const availableHeight = Math.max(300, window.innerHeight - verticalPadding)

    const widthRatio = availableWidth / originalMapSize.value.width
    const heightRatio = availableHeight / originalMapSize.value.height

    const baseScale = Math.min(widthRatio, heightRatio, 1)
    const scaleLimit = isMobile ? MOBILE_COMFORTABLE_SCALE : COMFORTABLE_SCALE
    const scaleFactor = Math.min(scaleLimit, baseScale)

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
        : '/images/Gamemap_7.40_minimap_dota2_gameasset_clean.png'

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

// Watch drawing state to control audio playback
watch(isDrawing, (newValue: boolean) => {
    if (!drawingAudio.value) return

    if (!newValue) {
        // Stop drawing - pause audio and reset
        drawingAudio.value.pause()
        drawingAudio.value.currentTime = 0
        isFirstPlay.value = true // Reset for next drawing session
        isMouseMoving.value = false

        // Clear movement timeout
        if (movementTimeout) {
            clearTimeout(movementTimeout)
            movementTimeout = null
        }
    }
    // Note: We don't start audio here - it will start when mouse moves (handled in handleMouseMovement)
})

// Load map image and hero icon
onMounted(() => {
    loadMapImage()
    if (autoPlacementEnabled.value) {
        store.ensureAutoPlacedIcons()
    }
    window.addEventListener('resize', handleResize)

    // Initialize drawing audio
    drawingAudio.value = new Audio('/sounds/Ui_map_write.mp3')
    drawingAudio.value.loop = false // We'll handle looping manually
    drawingAudio.value.volume = 0.7 // Set volume to 70% (30% reduction)

    // Store audio duration once metadata loads
    drawingAudio.value.addEventListener('loadedmetadata', () => {
        if (drawingAudio.value) {
            audioDuration.value = drawingAudio.value.duration
        }
    })

    // Handle audio end - restart from random loop point if still moving
    drawingAudio.value.addEventListener('ended', () => {
        if (drawingAudio.value && isDrawing.value && isMouseMoving.value) {
            // Still drawing and moving, so loop from a random point after the pencil down sound
            drawingAudio.value.currentTime = getRandomLoopStartTime()
            drawingAudio.value.play().catch((err: unknown) => {
                console.warn('Could not loop drawing audio:', err)
            })
        }
    })
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)

    // Clean up audio and timeout
    if (movementTimeout) {
        clearTimeout(movementTimeout)
        movementTimeout = null
    }
    if (drawingAudio.value) {
        drawingAudio.value.pause()
        drawingAudio.value = null
    }
})

// Get stage instance from vue-konva
const getStage = () => {
    if (stageRef.value) {
        return stageRef.value.getStage()
    }
    return null
}

// const logIconPlacement = (icon: Icon, stageX: number, stageY: number) => {
//     const iconWidth = icon.width ?? icon.size ?? ICON_BASE_SIZE
//     const iconHeight = icon.height ?? icon.size ?? ICON_BASE_SIZE
//     console.log('Icon placed', {
//         id: icon.id,
//         map: {
//             x: icon.x,
//             y: icon.y
//         },
//         center: {
//             x: icon.x + iconWidth / 2,
//             y: icon.y + iconHeight / 2
//         },
//         stage: {
//             x: stageX,
//             y: stageY
//         },
//         scale: currentScale.value
//     })
// }

const humanizeIconName = (filename: string) => {
    return filename
        .replace(/_mapicon_dota2_gameasset.*\.png$/i, '')
        .replace(/^\d+px-/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\(Radiant\)/gi, '(Radiant)')
}

const iconNameLookup: Record<string, string> = (() => {
    const map: Record<string, string> = {}
    mapIconFiles.forEach(({ folder, filename }) => {
        const path = mapIconPath(folder, filename)
        map[path] = humanizeIconName(filename)
    })
    return map
})()

const getIconDisplayName = (icon: Icon) => {
    if (iconNameLookup[icon.image]) return iconNameLookup[icon.image]
    const parts = icon.image.split('/')
    const filename = decodeURIComponent(parts[parts.length - 1] || icon.image)
    return humanizeIconName(filename) || icon.image
}

const logAllIconPositions = () => {
    const lines = store.icons.map(icon => {
        const name = getIconDisplayName(icon)
        return `${name}: x: ${icon.x.toFixed(2)}, y: ${icon.y.toFixed(2)}`
    })
    // console.log('Icon positions:\n' + lines.join('\n'))
}

// Handle stage pointer down - start drawing or place icon
const handleStagePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>) => {
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
            currentArrowAngle.value = null
            currentMousePos.value = { x: pos.x, y: pos.y }
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
            const isHeroSelection = !!store.selectedHero
            const iconWidth = isHeroSelection
                ? store.heroIconSize
                : (selectedIcon as any).width ?? (selectedIcon as any).size ?? ICON_BASE_SIZE
            const iconHeight = isHeroSelection
                ? store.heroIconSize
                : (selectedIcon as any).height ?? (selectedIcon as any).size ?? ICON_BASE_SIZE
            let newIcon: Icon = {
                id: iconId,
                x: pos.x / currentScale.value - iconWidth / 2,
                y: pos.y / currentScale.value - iconHeight / 2,
                image: selectedIcon.image,
                size: iconWidth === iconHeight ? iconWidth : undefined,
                width: iconWidth,
                height: iconHeight
            }

            // Apply the same shrinking logic as toggleable icons
            newIcon = applyToggleableIconShrinking(newIcon)

            store.addIcon(newIcon)
            // logIconPlacement(newIcon, pos.x, pos.y)
            logAllIconPositions()
        }
    } else if (store.currentTool === 'erase') {
        // Erase strokes near click position
        handleErase(pos.x, pos.y)
    }
}

// Handle stage pointer move - continue drawing or erasing
const handleStagePointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    if (store.currentTool === 'draw' && isDrawing.value) {
        // Handle mouse movement for audio control
        handleMouseMovement()

        // Update current mouse position for arrow tracking
        currentMousePos.value = { x: pos.x, y: pos.y }

        // Create a new array reference to ensure vue-konva detects the change
        // This is important for real-time drawing updates
        currentLine.value = [...currentLine.value, pos.x, pos.y]

        // Calculate arrow angle for arrow brush type with smoothing
        if (store.brushType === 'arrow') {
            if (currentLine.value.length >= 4) {
                // Use smoothed angle calculation with a stable segment well before the end
                // Look back 30 points from the end, and use a point that's 10 points back from the end
                // This makes it responsive to recent direction changes while avoiding jitter
                const newAngle = calculateSmoothedAngle(currentLine.value, 30, 10)

                if (newAngle !== null) {
                    // Use a smaller threshold (~3 degrees = 0.052 radians) for more responsive updates
                    const threshold = 0.052
                    if (currentArrowAngle.value === null ||
                        angleDifference(currentArrowAngle.value, newAngle) > threshold) {
                        currentArrowAngle.value = newAngle
                    }
                }
            } else if (currentLine.value.length === 2) {
                // Only start point exists, calculate from start to current mouse position
                const x1 = currentLine.value[0]
                const y1 = currentLine.value[1]
                const x2 = pos.x
                const y2 = pos.y
                currentArrowAngle.value = Math.atan2(y2 - y1, x2 - x1)
            }
        }
    } else if (store.currentTool === 'erase' && isErasing.value) {
        handleErase(pos.x, pos.y)
    }
}

// Handle stage pointer up - finish drawing
const handleStagePointerUp = () => {
    if (isDrawing.value && currentLine.value.length >= 4) {
        // Need at least 2 points (4 numbers: x1, y1, x2, y2)
        const mapPoints = currentLine.value.map(point => point / currentScale.value)

        // Calculate final arrow angle if needed
        let arrowAngle: number | undefined = undefined
        if (store.brushType === 'arrow') {
            // Use a stable segment well before the end to avoid jitter from final mouse movements
            // Look back 35 points from the end, and use a point that's 12 points back from the end
            // This ensures we use the direction from well before any jitter occurs
            const finalAngle = calculateSmoothedAngle(currentLine.value, 35, 12)
            if (finalAngle !== null) {
                arrowAngle = finalAngle
            } else if (currentArrowAngle.value !== null) {
                // Fallback to current angle if calculation fails
                arrowAngle = currentArrowAngle.value
            } else if (currentLine.value.length >= 4) {
                // Last resort: calculate from last two points
                const len = currentLine.value.length
                const x1 = currentLine.value[len - 4]
                const y1 = currentLine.value[len - 3]
                const x2 = currentLine.value[len - 2]
                const y2 = currentLine.value[len - 1]
                arrowAngle = Math.atan2(y2 - y1, x2 - x1)
            } else if (currentLine.value.length === 2) {
                // For very short lines (just start and end), use the angle from start to end
                const x1 = currentLine.value[0]
                const y1 = currentLine.value[1]
                const x2 = currentLine.value[2]
                const y2 = currentLine.value[3]
                arrowAngle = Math.atan2(y2 - y1, x2 - x1)
            }
        }

        const stroke: Stroke = {
            id: currentStrokeId.value!,
            points: mapPoints,
            color: store.brushColor,
            strokeWidth: store.brushSize / currentScale.value,
            brushType: store.brushType,
            arrowAngle: arrowAngle
        }
        store.addStroke(stroke)
    }
    isDrawing.value = false
    currentLine.value = []
    currentStrokeId.value = null
    currentArrowAngle.value = null
    currentMousePos.value = null

    // Reset erasing state when mouse is released
    if (isErasing.value) {
        isErasing.value = false
        // Clear redo stack after erasing is complete
        store.redoStack.length = 0
        // Persist state after erasing is complete
        store.persistState()
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
        const iconWidth = icon.width ?? icon.size ?? ICON_BASE_SIZE
        const iconHeight = icon.height ?? icon.size ?? ICON_BASE_SIZE
        const centerX = icon.x + iconWidth / 2
        const centerY = icon.y + iconHeight / 2
        const radius = Math.max(iconWidth, iconHeight) / 2
        const distance = Math.sqrt((centerX - mapX) ** 2 + (centerY - mapY) ** 2)
        if (distance <= radius + eraserRadius) {
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

// Create a wrapper to pass icon ID to dragend handler
const createDragEndHandler = (iconId: string, e: KonvaEventObject<MouseEvent>) => {
    const node = e.target as Node
    const mapX = node.x() / currentScale.value
    const mapY = node.y() / currentScale.value
    store.updateIconPosition(iconId, mapX, mapY)
    // Persist state after icon position is updated
    store.persistState()
    // console.log('Icon moved (map coords)', { x: mapX, y: mapY })
    logAllIconPositions()
}

// Computed property for current drawing line config (if actively drawing)
// Returns a new object reference each time to ensure vue-konva detects changes
const currentDrawingLine = computed(() => {
    if (!isDrawing.value || currentLine.value.length < 4) return null
    // Create a new array copy to ensure reactivity
    const config: any = {
        points: [...currentLine.value],
        stroke: store.brushColor,
        strokeWidth: store.brushSize,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        tension: 0.5
    }

    // Apply dash for dotted brush - more spacing between dots
    if (store.brushType === 'dotted') {
        config.dash = [3, 10]
    }

    return config
})

// Helper function to create arrow config - draws a ">" shape (two lines forming V)
const createArrowConfig = (x: number, y: number, angle: number, color: string, strokeWidth: number, scale: number = 1) => {
    // Make arrow bigger - increased multiplier from 1.5 to 2.5
    const arrowSize = strokeWidth * scale * 2.5
    const arrowLength = arrowSize
    // Angle for the arrow lines (about 30 degrees from the main direction)
    const arrowAngleOffset = Math.PI / 6 // 30 degrees

    const tipX = x
    const tipY = y

    // Calculate the two lines of the ">" shape
    // Left line: goes back and to the left
    const leftX = tipX - arrowLength * Math.cos(angle - arrowAngleOffset)
    const leftY = tipY - arrowLength * Math.sin(angle - arrowAngleOffset)

    // Right line: goes back and to the right
    const rightX = tipX - arrowLength * Math.cos(angle + arrowAngleOffset)
    const rightY = tipY - arrowLength * Math.sin(angle + arrowAngleOffset)

    return {
        sceneFunc: (ctx: CanvasRenderingContext2D) => {
            ctx.strokeStyle = color
            ctx.lineWidth = strokeWidth * scale * 1.2
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            // Draw left line
            ctx.beginPath()
            ctx.moveTo(tipX, tipY)
            ctx.lineTo(leftX, leftY)
            ctx.stroke()

            // Draw right line
            ctx.beginPath()
            ctx.moveTo(tipX, tipY)
            ctx.lineTo(rightX, rightY)
            ctx.stroke()
        },
        listening: false
    }
}

// Computed property for current arrow (if actively drawing with arrow brush)
const currentArrow = computed(() => {
    if (!isDrawing.value || store.brushType !== 'arrow' || currentArrowAngle.value === null || !currentMousePos.value) {
        return null
    }

    // Always use current mouse position for arrow location
    return createArrowConfig(currentMousePos.value.x, currentMousePos.value.y, currentArrowAngle.value, store.brushColor, store.brushSize, 1)
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

// Custom hit function to reduce clickable area to 70% of visual size
const createIconHitFunc = (context: any, shape: any) => {
    // Get the current width/height from the shape itself
    // This ensures the hitFunc automatically responds to size changes (e.g., heroIconSize slider)
    const width = shape.width()
    const height = shape.height()

    // Reduce hit area to 60% of visual size
    const hitWidth = width * .8
    const hitHeight = height * .8
    const offsetX = (width - hitWidth) / 2
    const offsetY = (height - hitHeight) / 2

    context.beginPath()
    context.rect(offsetX, offsetY, hitWidth, hitHeight)
    context.closePath()
    context.fillStrokeShape(shape)
}

// Separate icons into toggleable icons and hero icons for proper rendering order
const fixedIcons = computed(() => {
    return store.icons.filter(icon =>
        icon.id.startsWith('auto-') && !icon.id.startsWith('auto-water-') && !icon.id.startsWith('auto-bounty-')
    )
})

const runeIcons = computed(() => {
    return store.icons.filter(icon =>
        icon.id.startsWith('auto-water-') || icon.id.startsWith('auto-bounty-')
    )
})

const heroIcons = computed(() => {
    return store.icons.filter(icon => icon.image.includes('/images/icons/heroes/'))
})

const otherIcons = computed(() => {
    return store.icons.filter(icon =>
        !icon.id.startsWith('auto-') && !icon.image.includes('/images/icons/heroes/')
    )
})

// Expose stage ref and height for parent components (for export functionality)
defineExpose({
    getStage,
    getStageHeight: () => stageHeight.value
})
</script>

<template>
    <div class="map-canvas-container">
        <v-stage v-if="mapLoaded" ref="stageRef" :config="stageConfig" @pointerdown="handleStagePointerDown"
            @pointermove="handleStagePointerMove" @pointerup="handleStagePointerUp" @pointerleave="handleStagePointerUp"
            @pointercancel="handleStagePointerUp">
            <v-layer>
                <!-- Map background image -->
                <!-- Konva Image component requires the image element, not just a path -->
                <v-image v-if="mapImage" :config="mapImageConfig" />

                <!-- Render fixed icons: buildings, structures, camps, watchers (not movable) -->
                <v-image v-for="icon in fixedIcons" :key="icon.id" :config="{
                    image: getIconImage(icon.image),
                    x: icon.x * currentScale,
                    y: icon.y * currentScale,
                    width: (icon.width ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    height: (icon.height ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    draggable: false,
                    listening: false,
                    name: 'hero-icon',
                    opacity: icon.image.includes('Neutral_Camp') ? 0.8 : 1,
                }" />

                <!-- Render rune icons (movable) -->
                <v-image v-for="icon in runeIcons" :key="icon.id" :config="{
                    image: getIconImage(icon.image),
                    x: icon.x * currentScale,
                    y: icon.y * currentScale,
                    width: (icon.width ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    height: (icon.height ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    draggable: !store.lockIcons,
                    listening: !store.lockIcons,
                    name: 'hero-icon',
                    opacity: 1,
                    hitFunc: createIconHitFunc
                }" @dragstart="handleIconDragStart" @dragend="createDragEndHandler(icon.id, $event)" />

                <!-- Render other manually placed icons (middle icon layer) -->
                <v-image v-for="icon in otherIcons" :key="icon.id" :config="{
                    image: getIconImage(icon.image),
                    x: icon.x * currentScale,
                    y: icon.y * currentScale,
                    width: (icon.width ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    height: (icon.height ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    draggable: !store.lockIcons,
                    listening: !store.lockIcons,
                    name: 'hero-icon',
                    opacity: icon.image.includes('Neutral_Camp') ? 0.8 : 1,
                    hitFunc: createIconHitFunc
                }" @dragstart="handleIconDragStart" @dragend="createDragEndHandler(icon.id, $event)" />

                <!-- Render hero icons (top icon layer) -->
                <v-image v-for="icon in heroIcons" :key="icon.id" :config="{
                    image: getIconImage(icon.image),
                    x: icon.x * currentScale,
                    y: icon.y * currentScale,
                    width: (icon.width ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    height: (icon.height ?? icon.size ?? ICON_BASE_SIZE) * currentScale,
                    draggable: !store.lockIcons,
                    listening: !store.lockIcons,
                    name: 'hero-icon',
                    opacity: icon.image.includes('Neutral_Camp') ? 0.8 : 1,
                    hitFunc: createIconHitFunc
                }" @dragstart="handleIconDragStart" @dragend="createDragEndHandler(icon.id, $event)" />

                <!-- Render all saved strokes (above icons) -->
                <template v-for="stroke in store.strokes" :key="stroke.id">
                    <v-line :config="{
                        points: scalePoints(stroke.points),
                        stroke: stroke.color,
                        strokeWidth: stroke.strokeWidth * currentScale,
                        lineCap: 'round',
                        lineJoin: 'round',
                        tension: 0.5,
                        globalCompositeOperation: 'source-over',
                        dash: stroke.brushType === 'dotted' ? [3, 10] : undefined,
                        listening: false
                    }" />
                    <!-- Render arrowhead for arrow strokes -->
                    <v-shape
                        v-if="stroke.brushType === 'arrow' && stroke.arrowAngle !== undefined && stroke.points.length >= 4"
                        :config="createArrowConfig(
                            stroke.points[stroke.points.length - 2] * currentScale,
                            stroke.points[stroke.points.length - 1] * currentScale,
                            stroke.arrowAngle || 0,
                            stroke.color,
                            stroke.strokeWidth,
                            currentScale
                        )" />
                </template>

                <!-- Render current drawing line (if actively drawing) -->
                <!-- Using computed config ensures vue-konva detects changes in real-time -->
                <v-line v-if="currentDrawingLine" :config="currentDrawingLine" />

                <!-- Render current arrow during drawing -->
                <v-shape v-if="currentArrow" :config="currentArrow" />
            </v-layer>
        </v-stage>
        <div v-else class="loading">Loading map...</div>
    </div>
</template>

<style scoped>
.map-canvas-container {
    width: 100%;
    max-width: 100%;
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
