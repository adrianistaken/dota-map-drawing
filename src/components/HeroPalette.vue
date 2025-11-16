<script setup lang="ts">
import { useEditorStore } from '../stores/useEditorStore'

const store = useEditorStore()

// Number of hero icons to display (using same icon repeated)
const heroCount = 20

// Select hero icon - sets tool to icon placement mode
const selectHero = () => {
  store.setTool('icon')
}
</script>

<template>
  <div class="hero-palette bg-gray-800 p-4 rounded-lg">
    <h2 class="text-white text-lg font-semibold mb-4">Hero Icons</h2>
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="i in heroCount"
        :key="i"
        @click="selectHero"
        :class="[
          'w-12 h-12 p-1 rounded transition-all hover:scale-110',
          store.currentTool === 'icon'
            ? 'bg-blue-600 ring-2 ring-blue-400'
            : 'bg-gray-700 hover:bg-gray-600'
        ]"
      >
        <img
          src="/images/Abaddon_minimap_icon.webp"
          alt="Hero Icon"
          class="w-full h-full object-contain"
        />
      </button>
    </div>
    <p class="text-gray-400 text-xs mt-4 text-center">
      Click an icon to place it on the map
    </p>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>

