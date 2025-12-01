<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import HeroPalette from './components/HeroPalette.vue'
import MapIconsPalette from './components/MapIconsPalette.vue'
import SocialLinks from './components/SocialLinks.vue'
import LastUpdatedBadge from './components/LastUpdatedBadge.vue'
import { useEditorStore } from './stores/useEditorStore'

const store = useEditorStore()

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)
const sidebarHeight = ref<number | null>(null)
const isMobileLayout = ref(false)
const toolsWrapperRef = ref<HTMLElement | null>(null)
const toolsHeight = ref<number | null>(null)

const updateLayoutMode = () => {
  isMobileLayout.value = window.innerWidth <= 900
}

const handleResize = () => {
  updateLayoutMode()
  setTimeout(() => {
    updateSidebarHeight()
    updateToolsHeight()
  }, 100)
}

const updateToolsHeight = () => {
  if (toolsWrapperRef.value) {
    toolsHeight.value = toolsWrapperRef.value.offsetHeight
  } else {
    toolsHeight.value = null
  }
}

// Watch for map height changes and update sidebar height
const updateSidebarHeight = () => {
  if (mapCanvasRef.value && !isMobileLayout.value) {
    const height = mapCanvasRef.value.getStageHeight?.()
    if (height) {
      sidebarHeight.value = height
    }
  } else {
    sidebarHeight.value = null
  }
}

// Watch for changes to mapCanvasRef and update height
watch(mapCanvasRef, () => {
  // Small delay to ensure the component is fully mounted
  setTimeout(updateSidebarHeight, 100)
}, { immediate: true })

watch(toolsWrapperRef, () => {
  setTimeout(updateToolsHeight, 50)
})

// Also update on window resize
onMounted(() => {
  // Load persisted state from localStorage
  store.loadState()

  handleResize()
  window.addEventListener('resize', handleResize)

  // Initial update after a short delay to ensure map is loaded
  setTimeout(() => {
    updateSidebarHeight()
    updateToolsHeight()
  }, 500)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="app-container">
    <div class="main-content">
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
          <MapIconsPalette :max-height="toolsHeight" />
          <div ref="toolsWrapperRef">
            <Toolbar :map-canvas-ref="mapCanvasRef" />
          </div>
        </div>
      </div>
    </div>
    <LastUpdatedBadge />
    <SocialLinks />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background-image: url('/images/dota2websitebackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.main-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1.5rem;
  box-sizing: border-box;
  width: min(100%, 1400px);
  margin: 0 auto;
}

.map-section {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  box-sizing: border-box;
  flex: 0 0 auto;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  flex-shrink: 0;
  height: fit-content;
  overflow: visible;
  align-items: stretch;
}

.sidebar-bottom>* {
  min-width: 0;
  height: 100%;
}

@media (max-width: 900px) {
  .app-container {
    justify-content: flex-start;
  }

  .main-content {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 1rem;
    padding-top: 4.5rem; /* leave room for fixed badges on small screens */
    gap: 1rem;
  }

  .map-section {
    flex: 1 1 auto;
    width: 100%;
  }

  .sidebar {
    width: 100%;
    height: auto !important;
  }

  .sidebar-bottom {
    flex-direction: column;
  }

  .sidebar-bottom>* {
    width: 100%;
  }

  .sidebar-top {
    max-height: 16rem;
    flex: initial;
  }
}
</style>
