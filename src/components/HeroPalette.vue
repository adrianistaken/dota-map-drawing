<script setup lang="ts">
import { useEditorStore, type HeroSelection } from '../stores/useEditorStore'

const store = useEditorStore()

// Placeholder hero data (using the same icon repeated for now)
const heroCount = 20
const heroOptions: HeroSelection[] = Array.from({ length: heroCount }, (_, index) => ({
  id: `abaddon-${index + 1}`,
  name: `Abaddon ${index + 1}`,
  image: '/images/Abaddon_minimap_icon.webp'
}))

// Select hero icon - also switches to icon placement mode
const selectHero = (hero: HeroSelection) => {
  store.selectHero(hero)
}
</script>

<template>
  <div class="hero-palette bg-gray-800 p-4 rounded-lg">
    <h2 class="text-white text-lg font-semibold mb-4">Hero Icons</h2>
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="hero in heroOptions"
        :key="hero.id"
        @click="selectHero(hero)"
        :aria-label="`Select ${hero.name}`"
        :class="[
          'w-12 h-12 p-1 rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800',
          store.selectedHero?.id === hero.id
            ? 'bg-blue-700/60 border-blue-300 ring-2 ring-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.65)] scale-105'
            : 'bg-gray-700 border-transparent hover:bg-gray-600'
        ]"
      >
        <img
          :src="hero.image"
          :alt="`${hero.name} icon`"
          class="w-full h-full object-contain"
        />
      </button>
    </div>
    <p class="text-gray-400 text-xs mt-4 text-center">
      Click an icon to select it, then click anywhere on the map to place it.
    </p>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>

