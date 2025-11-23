<script setup lang="ts">
import { useEditorStore, type MapIconSelection } from '../stores/useEditorStore'

const store = useEditorStore()

// Map icons from /images/icons (excluding heroes subdirectory)
const mapIconFiles = [
    '36px-Main_Shop_mapicon_dota2_gameasset.png',
    '36px-Secret_Shop_mapicon_dota2_gameasset.png',
    '36px-Side_Lane_Shop_mapicon_dota2_gameasset.png',
    '60px-Ancient_mapicon_dota2_gameasset.png',
    'Roshan_symbol_dota2_gameasset.png',


    'Amplify_Damage_Rune_mapicon_dota2_gameasset.png',
    'Haste_Rune_mapicon_dota2_gameasset.png',
    'Illusion_Rune_mapicon_dota2_gameasset.png',
    'Invisibility_Rune_mapicon_dota2_gameasset.png',
    'Shield_Rune_mapicon_dota2_gameasset.png',

    'Water_Rune_mapicon_dota2_gameasset.png',
    'Wisdom_Rune_mapicon_dota2_gameasset.png',
    'Regeneration_Rune_mapicon_dota2_gameasset.png',
    'Arcane_Rune_mapicon_dota2_gameasset.png',
    'Bounty_Rune_mapicon_dota2_gameasset.png',

    'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png',
    'Neutral_Camp_(large)_mapicon_dota2_gameasset.png',
    'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png',
    'Neutral_Camp_(small)_mapicon_dota2_gameasset.png',
    'Scan_abilityicon_dota2_gameasset.png',

    'Animal_Courier_(Radiant)_mapicon_dota2_gameasset.png',
    'Flying_Courier_(Radiant)_mapicon_dota2_gameasset.png',
    'Observer_Ward_mapicon_dota2_gameasset.png',
    'Sentry_Ward_mapicon_dota2_gameasset.png',

]

// Generate map icon options
const mapIconOptions: MapIconSelection[] = mapIconFiles.map(filename => {
    // Convert filename to display name
    let displayName = filename
        .replace(/_mapicon_dota2_gameasset\.png$/, '')
        .replace(/^\d+px-/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\(Radiant\)/gi, '(Radiant)')

    const imagePath = `/images/icons/${encodeURIComponent(filename)}`
    const id = filename.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    return {
        id,
        name: displayName,
        image: imagePath
    }
})

// Select map icon - also switches to icon placement mode
const selectMapIcon = (mapIcon: MapIconSelection) => {
    store.selectMapIcon(mapIcon)
}
</script>

<template>
    <div class="map-icons-palette flex flex-col">
        <div class="grid grid-cols-5 gap-1 overflow-y-auto" style="max-height: 400px;">
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
