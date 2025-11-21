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
  background-image: url('/images/dota2websitebackground.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  overflow: hidden;
}

.map-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 1.5rem;
  box-sizing: border-box;
  /* Semi-transparent overlay to make map more visible */
  background-color: rgba(26, 26, 26, 0.3);
}

.sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  /* Semi-transparent overlay to make sidebar readable */
  background-color: rgba(26, 26, 26, 0.85);
  overflow-y: auto;
}
</style>
