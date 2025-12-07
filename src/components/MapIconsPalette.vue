<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore, type MapIconSelection } from '../stores/useEditorStore'
import { mapIconFiles, mapIconPath } from '../data/mapIcons'

const store = useEditorStore()

const props = defineProps<{
    maxHeight?: number | null
}>()

// Generate map icon options
const mapIconOptions: MapIconSelection[] = mapIconFiles
    .filter(icon => icon.showInPalette !== false)
    .map(({ folder, filename, size, width, height, paletteSize }) => {
        // Convert filename to display name
        let displayName = filename
            .replace(/_mapicon_dota2_gameasset.*\.png$/i, '')
            .replace(/^\d+px-/, '')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\(Radiant\)/gi, '(Radiant)')

        const imagePath = mapIconPath(folder, filename)
        const id = `${folder}-${filename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`

        return {
            id,
            name: displayName,
            image: imagePath,
            size,
            width,
            height,
            paletteSize: paletteSize ?? 28 // Default to 28px (w-7 equivalent)
        }
    })

// Select map icon - also switches to icon placement mode
const selectMapIcon = (mapIcon: MapIconSelection) => {
    store.selectMapIcon(mapIcon)
}

const containerStyle = computed(() => props.maxHeight ? {
    height: `${props.maxHeight}px`,
    maxHeight: `${props.maxHeight}px`
} : {})
</script>

<template>
    <div class="map-icons-palette flex flex-col" :style="containerStyle">
        <div class="grid grid-cols-5 gap-1 overflow-y-auto" :style="containerStyle">
            <button v-for="icon in mapIconOptions" :key="icon.id" @click="selectMapIcon(icon)"
                :aria-label="`Select ${icon.name}`" :class="[
                    'w-8 h-8 relative transition-all cursor-pointer focus-visible:outline-none flex items-center justify-center',
                    store.selectedMapIcon?.id === icon.id
                        ? 'ring-2 ring-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.65)] scale-110'
                        : 'hover:opacity-80 hover:scale-105'
                ]">
                <img :src="icon.image" :alt="`${icon.name} icon`"
                    :style="{ width: `${icon.paletteSize}px`, height: `${icon.paletteSize}px` }"
                    class="absolute object-contain" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.map-icons-palette {
    background-color: rgba(30, 58, 138, 0.3);
    padding: 0.5rem;
    border-radius: 0.5rem;
    backdrop-filter: blur(4px);
}

.map-icons-palette button {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
}
</style>
