<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore, type MapIconSelection } from '../stores/useEditorStore'

const store = useEditorStore()

const props = defineProps<{
    maxHeight?: number | null
}>()

// Icons now live under /images/icons/misc, /images/icons/runes, and /images/icons/map
const mapIconFiles: { folder: 'misc' | 'runes' | 'map'; filename: string; size?: number; width?: number; height?: number }[] = [
    // Misc
    { folder: 'misc', filename: 'Animal_Courier_(Radiant)_mapicon_dota2_gameasset.png', size: 40 },
    { folder: 'misc', filename: 'Flying_Courier_(Radiant)_mapicon_dota2_gameasset.png', width: 65, height: 37 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset green.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset red.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Sentry_Ward_mapicon_dota2_gameasset.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Sentry_Ward_mapicon_dota2_gameasset 2.png', width: 50, height: 30 },

    // Runes/ancients
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasset.png', width: 36, height: 46 },
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasset red.png', width: 30, height: 36 },
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasse greent.png', width: 30, height: 36 },

    { folder: 'runes', filename: 'Amplify_Damage_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Arcane_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Bounty_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Haste_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Illusion_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Invisibility_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Regeneration_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Shield_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Water_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Wisdom_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },

    // Map
    { folder: 'map', filename: 'Lotus_Pool_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasset.png', size: 56 },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasset green.png', size: 56 },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasse redt.png', size: 56 },
    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasset.png', size: 56 },
    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasset green.png', size: 56 },
    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasse redt.png', size: 56 },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasset.png', size: 56 },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasset red.png', size: 56 },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasse greent.png', size: 56 },
    { folder: 'map', filename: 'Warp_Gate_mapicon_dota2_gameasset.png', size: 58 },
    { folder: 'map', filename: 'Watcher_mapicon_dota2_gameasset.png', size: 54 },
    { folder: 'map', filename: 'tormentor minimap icon.png', size: 60 },
]

// Generate map icon options
const mapIconOptions: MapIconSelection[] = mapIconFiles.map(({ folder, filename, size, width, height }) => {
    // Convert filename to display name
    let displayName = filename
        .replace(/_mapicon_dota2_gameasset.*\.png$/i, '')
        .replace(/^\d+px-/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\(Radiant\)/gi, '(Radiant)')

    const imagePath = `/images/icons/${folder}/${encodeURIComponent(filename)}`
    const id = `${folder}-${filename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`

    return {
        id,
        name: displayName,
        image: imagePath,
        size,
        width,
        height
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
                <img :src="icon.image" :alt="`${icon.name} icon`" class="w-7 absolute object-contain" />
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
