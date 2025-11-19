<script setup lang="ts">
import { ref } from 'vue'
import MapCanvas from './components/MapCanvas.vue'
import Toolbar from './components/Toolbar.vue'
import HeroPalette from './components/HeroPalette.vue'

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)
</script>

<template>
  <div class="app-container">
    <!-- Map Canvas on the left -->
    <div class="map-section">
      <MapCanvas ref="mapCanvasRef" />
    </div>

    <!-- Right sidebar with palette and toolbar -->
    <div class="sidebar">
      <HeroPalette />
      <Toolbar :map-canvas-ref="mapCanvasRef" />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #1a1a1a;
  overflow: hidden;
}

.map-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  background-color: #2a2a2a;
  padding: 1.5rem;
  box-sizing: border-box;
}

.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #1a1a1a;
  overflow-y: auto;
}
</style>
