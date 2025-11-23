<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import HeroPalette from './components/HeroPalette.vue'
import MapIconsPalette from './components/MapIconsPalette.vue'
import SocialLinks from './components/SocialLinks.vue'
import { useEditorStore } from './stores/useEditorStore'

const store = useEditorStore()

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)
const sidebarHeight = ref<number | null>(null)

// Watch for map height changes and update sidebar height
const updateSidebarHeight = () => {
  if (mapCanvasRef.value) {
    const height = mapCanvasRef.value.getStageHeight?.()
    if (height) {
      sidebarHeight.value = height - 90
    }
  }
}

// Watch for changes to mapCanvasRef and update height
watch(mapCanvasRef, () => {
  // Small delay to ensure the component is fully mounted
  setTimeout(updateSidebarHeight, 100)
}, { immediate: true })

// Also update on window resize
onMounted(() => {
  // Load persisted state from localStorage
  store.loadState()

  window.addEventListener('resize', () => {
    setTimeout(updateSidebarHeight, 100)
  })

  // Initial update after a short delay to ensure map is loaded
  setTimeout(updateSidebarHeight, 500)
})
</script>

<template>
  <div class="app-container">
    <!-- Map Canvas on the left -->
    <div class="map-section">
      <MapCanvas ref="mapCanvasRef" />
    </div>

    <!-- Right sidebar with three-box layout -->
    <div class="sidebar" :style="sidebarHeight ? { height: `${sidebarHeight}px` } : {}">
      <div class="sidebar-top">
        <HeroPalette />
      </div>
      <div class="sidebar-bottom">
        <MapIconsPalette />
        <Toolbar :map-canvas-ref="mapCanvasRef" />
      </div>
    </div>
    <SocialLinks />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-image: url('/images/dota2websitebackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  overflow: hidden;
  padding: 1.5rem;
  box-sizing: border-box;
  gap: 1.5rem;
  align-items: center;
  justify-content: center;
}

.map-section {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  box-sizing: border-box;
  /* Semi-transparent overlay to make map more visible */
  /* background-color: rgba(26, 26, 26, 0.3); */
  flex-shrink: 0;
}

.sidebar {
  width: 510px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
  /* Semi-transparent overlay to make sidebar readable */
  background-color: transparent;
  overflow: hidden;
  align-self: center;
  flex-shrink: 0;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-top>* {
  height: 100%;
  min-height: 0;
}

.sidebar-bottom {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  flex-shrink: 0;
  height: fit-content;
  overflow: visible;
}

.sidebar-bottom>* {
  flex: 1;
  min-width: 0;
  height: fit-content;
}
</style>
