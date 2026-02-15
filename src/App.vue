<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import HeroPalette from './components/HeroPalette.vue'
import MapIconsPalette from './components/MapIconsPalette.vue'
import SocialLinks from './components/SocialLinks.vue'
import PanelTabs from './components/PanelTabs.vue'
import BoardsPanel from './components/BoardsPanel.vue'
import AnnouncementBanner from './components/AnnouncementBanner.vue'
import { useEditorStore } from './stores/useEditorStore'
import { useBoardsStore } from './stores/useBoardsStore'
import { Toaster } from 'vue-sonner'

const store = useEditorStore()
const boardsStore = useBoardsStore()

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)
const boardsPanelRef = ref<InstanceType<typeof BoardsPanel> | null>(null)
const isMobileLayout = ref(false)
const activeTab = ref<'tools' | 'boards'>('tools')

const updateLayoutMode = () => {
  isMobileLayout.value = window.innerWidth <= 900
}

const handleResize = () => {
  updateLayoutMode()
}

async function handleTabChange(tab: 'tools' | 'boards') {
  activeTab.value = tab

  // Capture thumbnails when switching to Boards tab
  if (tab === 'boards' && boardsPanelRef.value) {
    // Small delay to ensure panel is visible
    setTimeout(() => {
      boardsPanelRef.value?.captureThumbnails()
    }, 100)
  }
}

// Watch for changes to mapCanvasRef (in case future hooks are needed)
watch(mapCanvasRef, () => { }, { immediate: true })

// Save state before page unload to prevent data loss
const handleBeforeUnload = () => {
  // Force an immediate save (bypassing debounce) when page is about to close
  if (boardsStore.isInitialized) {
    boardsStore.persistCurrentBoard()
  }
}

// Also update on window resize
onMounted(async () => {
  // Initialize boards store first (handles editor hydration)
  await boardsStore.initBoards()

  // Note: store.loadState() is no longer called here
  // The boards store handles loading the appropriate board state

  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="app-container" :class="{ 'mobile-layout': isMobileLayout }">
    <Toaster
      position="bottom-right"
      richColors
      :duration="3000"
      class="app-toaster"
      :toastOptions="{
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          borderTop: '1px solid #2a2a2a',
          borderRight: '1px solid #2a2a2a',
          borderBottom: '1px solid #2a2a2a'
        }
      }"
    />
    <div class="layout-grid">
      <aside class="side-panel left-panel">
        <div class="panel-surface tools-surface fill-vertical">
          <PanelTabs :active-tab="activeTab" @tab-change="handleTabChange" />
          <div v-show="activeTab === 'tools'" class="panel-content">
            <Toolbar :map-canvas-ref="mapCanvasRef" />
          </div>
          <div v-show="activeTab === 'boards'" class="panel-content">
            <BoardsPanel ref="boardsPanelRef" :map-canvas-ref="mapCanvasRef" />
          </div>
        </div>
      </aside>

      <main class="center-panel">
        <AnnouncementBanner
          message="New: Save up to 3 boards! Switch between strategies instantly."
          link-text="Try it"
          :link-action="() => handleTabChange('boards')"
        />
        <div class="map-frame">
          <MapCanvas ref="mapCanvasRef" />
        </div>
      </main>

      <aside class="side-panel right-panel">
        <div class="panel-surface right-panel-content fill-vertical">
          <div class="right-panel-section social-section p-2">
            <SocialLinks />
          </div>
          <div class="right-panel-section hero-section p-2 pt-0 flex-1 overflow-y-auto">
            <div class="border-t border-gray-700">
              <HeroPalette />
            </div>
          </div>
          <div class="right-panel-section icons-section p-2">
            <div class="pt-2 border-t border-gray-700">
              <MapIconsPalette />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  --side-panel-width: 240px;
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
  grid-template-columns: minmax(200px, var(--side-panel-width)) minmax(0, 1fr) minmax(200px, var(--side-panel-width));
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
  background: rgba(12, 24, 48, 0.75);
  background-color: #121212d6;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.right-panel {
  border-right: none;
  border-left: 1px solid rgba(255, 255, 255, 0.04);
}

.panel-surface {
  /* background-color: rgba(12, 24, 48, 0.75); */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);
}

.fill-vertical {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.center-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.social-surface {
  flex: 0 0 auto;
}

.map-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(140deg, rgb(13 13 18 / 55%), rgb(18 19 22 / 40%));
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.4);
}

.map-frame :deep(canvas) {
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.25);
}

.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.right-panel-section {
  display: flex;
  flex-direction: column;
}

.social-section {
  flex: 0 0 auto;
}

.hero-section {
  flex: 1 1 auto;
  min-height: 0;
}

.hero-section :deep(.hero-palette) {
  height: 100%;
  width: 100%;
}

.icons-section {
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
    width: 100%;
    flex-direction: column;
    /* padding-top: 2rem; */
  }


  .panel-surface,
  .map-frame {
    border-radius: 0.75rem;
  }

  .tools-surface {
    position: static;
  }

  .hero-section {
    max-height: 20rem;
  }

  .map-frame {
    width: 100%;
    padding: 0;
  }
}

/* Toast positioning - fixed in bottom-right of map area */
:deep(.app-toaster) {
  position: fixed !important;
  bottom: 2rem !important;
  right: calc(var(--side-panel-width) + var(--grid-gap) + .55rem) !important;
  left: auto !important;
  z-index: 9999 !important;
  pointer-events: none !important;
}

:deep(.app-toaster > *) {
  pointer-events: auto !important;
}

/* Toast styling to match app theme */
:deep([data-sonner-toast]) {
  background: rgba(12, 24, 48, 0.75) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
  color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 0.5rem !important;
  padding: 1rem !important;
}

/* Success toast - subtle green accent */
:deep([data-sonner-toast][data-type="success"]) {
  border-left: 3px solid #10b981 !important;
}

/* Error toast - subtle red accent */
:deep([data-sonner-toast][data-type="error"]) {
  border-left: 3px solid #ef4444 !important;
}

/* Info toast - subtle blue accent */
:deep([data-sonner-toast][data-type="info"]) {
  border-left: 3px solid #3b82f6 !important;
}

/* Warning toast - subtle yellow accent */
:deep([data-sonner-toast][data-type="warning"]) {
  border-left: 3px solid #f59e0b !important;
}

/* Toast icon styling */
:deep([data-sonner-toast] [data-icon]) {
  opacity: 0.9;
}

/* Toast title/description */
:deep([data-sonner-toast] [data-title]) {
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* Toast dark background styling */
:deep([data-sonner-toast]) {
  background: #1a1a1a !important;
  color: #ffffff !important;
  border-top: 1px solid #2a2a2a !important;
  border-right: 1px solid #2a2a2a !important;
  border-bottom: 1px solid #2a2a2a !important;
}

@media (max-width: 900px) {
  :deep(.app-toaster) {
    right: 1rem !important;
  }
}
</style>
