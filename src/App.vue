<script setup lang="ts">
import { ref } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import HeroPalette from './components/HeroPalette.vue'
import MapIconsPalette from './components/MapIconsPalette.vue'

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)
</script>

<template>
  <div class="app-container">
    <!-- Map Canvas on the left -->
    <div class="map-section">
      <MapCanvas ref="mapCanvasRef" />
    </div>

    <!-- Right sidebar with three-box layout -->
    <div class="sidebar">
      <div class="sidebar-left">
        <HeroPalette />
      </div>
      <div class="sidebar-right">
        <MapIconsPalette />
        <Toolbar :map-canvas-ref="mapCanvasRef" />
      </div>
    </div>
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
  flex-direction: row;
  gap: 0.75rem;
  padding: 0;
  /* Semi-transparent overlay to make sidebar readable */
  background-color: transparent;
  overflow-y: auto;
  align-self: center;
  max-height: 100%;
}

.sidebar-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-height: 600px;
}

.sidebar-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  max-height: 600px;
}
</style>
