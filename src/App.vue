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
const isMobileLayout = ref(false)

const updateLayoutMode = () => {
  isMobileLayout.value = window.innerWidth <= 900
}

const handleResize = () => {
  updateLayoutMode()
}

// Watch for changes to mapCanvasRef (in case future hooks are needed)
watch(mapCanvasRef, () => {}, { immediate: true })

// Also update on window resize
onMounted(() => {
  // Load persisted state from localStorage
  store.loadState()

  handleResize()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="app-container" :class="{ 'mobile-layout': isMobileLayout }">
    <div class="layout-grid">
      <aside class="side-panel left-panel">
        <div class="panel-surface tools-surface fill-vertical">
          <Toolbar :map-canvas-ref="mapCanvasRef" />
        </div>
      </aside>

      <main class="center-panel">
        <div class="map-frame">
          <MapCanvas ref="mapCanvasRef" />
          <LastUpdatedBadge />
          <SocialLinks />
        </div>
      </main>

      <aside class="side-panel right-panel">
        <div class="panel-surface hero-surface">
          <HeroPalette />
        </div>
        <div class="panel-surface icons-surface">
          <MapIconsPalette />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  --side-panel-width: 300px;
  --grid-gap: 1.25rem;
  --panel-padding: 1rem;
  width: 100%;
  min-height: 100vh;
  background-image: url('/images/dota2websitebackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  box-sizing: border-box;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(240px, var(--side-panel-width)) minmax(0, 1fr) minmax(240px, var(--side-panel-width));
  grid-template-rows: 1fr;
  gap: var(--grid-gap);
  width: 100%;
  height: 100vh;
  align-items: stretch;
}

.side-panel {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(12, 24, 48, 0.75), rgba(8, 16, 34, 0.85));
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.right-panel {
  border-right: none;
  border-left: 1px solid rgba(255, 255, 255, 0.04);
}

.panel-surface {
  background-color: rgba(12, 24, 48, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);
  /* padding: var(--panel-padding); */
}

.fill-vertical {
  height: 100%;
}

.center-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.map-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(140deg, rgba(10, 10, 20, 0.55), rgba(20, 34, 72, 0.4));
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.4);
}

.map-frame :deep(canvas) {
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.25);
}

.right-panel .panel-surface {
  overflow: hidden;
}

.hero-surface {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hero-surface :deep(.hero-palette) {
  height: 100%;
}

.icons-surface {
  flex: 0 0 auto;
}

@media (max-width: 900px) {
  .app-container {
    padding: 0;
  }

  .layout-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: auto;
  }

  .side-panel {
    min-height: auto;
    order: 2;
  }

  .right-panel {
    order: 3;
  }

  .center-panel {
    order: 1;
    height: auto;
  }

  .panel-surface,
  .map-frame {
    border-radius: 0.75rem;
  }

  .tools-surface {
    position: static;
  }

  .hero-surface {
    max-height: 18rem;
  }
}
</style>
