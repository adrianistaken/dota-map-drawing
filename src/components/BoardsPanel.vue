<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useBoardsStore } from '../stores/useBoardsStore'
import BoardSlot from './BoardSlot.vue'

const props = defineProps<{
  mapCanvasRef?: any
}>()

const boardsStore = useBoardsStore()
const isCapturingThumbnails = ref(false)

// Create array of 3 slots (1, 2, 3)
const slots = computed(() => {
  return [1, 2, 3].map(slotNum => {
    const board = boardsStore.savedBoards.find(b => b.slotNumber === slotNum)
    return {
      slotNumber: slotNum,
      board: board || null
    }
  })
})

onMounted(async () => {
  if (!boardsStore.isInitialized) {
    await boardsStore.initBoards()
  }
})

async function handleSaveToSlot(slotNumber: number) {
  const result = await boardsStore.pinCurrentBoardToSaved(slotNumber)

  if (!result.success) {
    if (result.error.code === 'LIMIT_REACHED') {
      alert(result.error.message)
    } else if (result.error.code === 'STORAGE_ERROR' && result.error.message.includes('occupied')) {
      alert(`Slot ${slotNumber} is already occupied. Please clear it first.`)
    } else {
      alert('Failed to save board. Please try again.')
    }
  } else {
    // Capture thumbnail for newly saved board
    if (props.mapCanvasRef) {
      setTimeout(async () => {
        await captureThumbnails()
      }, 100)
    }
  }
}

async function captureThumbnails() {
  if (!props.mapCanvasRef || isCapturingThumbnails.value) return

  try {
    isCapturingThumbnails.value = true
    await boardsStore.captureAllThumbnails(props.mapCanvasRef)
  } finally {
    isCapturingThumbnails.value = false
  }
}

// Expose methods for parent component
defineExpose({
  captureThumbnails
})
</script>

<template>
  <div class="boards-panel">
    <div class="boards-header">
      <h3 class="boards-title">Saved Boards</h3>
      <p class="boards-subtitle">
        {{ boardsStore.savedBoardsCount }} / {{ boardsStore.MAX_SAVED_BOARDS }} slots used
      </p>
    </div>

    <div class="boards-list">
      <!-- Loop through 3 slots -->
      <template v-for="slot in slots" :key="slot.slotNumber">
        <!-- Filled slot -->
        <BoardSlot
          v-if="slot.board"
          :board="slot.board"
          :slot-number="slot.slotNumber"
          :is-active="boardsStore.currentBoardId === slot.board.id"
        />

        <!-- Empty slot -->
        <div v-else class="board-slot empty">
          <button
            @click="handleSaveToSlot(slot.slotNumber)"
            class="save-button"
            :disabled="!boardsStore.canSaveMore"
          >
            <div class="plus-icon-wrapper">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="plus-icon"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span class="save-text">Save Current Board</span>
          </button>
        </div>
      </template>
    </div>

    <!-- Loading overlay -->
    <div v-if="boardsStore.isLoading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.boards-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  position: relative;
  overflow-y: auto;
}

.boards-header {
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.boards-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.25rem 0;
}

.boards-subtitle {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.boards-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.board-slot.empty {
  background: rgba(255, 255, 255, 0.03);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Match the height of filled slots */
  min-height: 200px;
  transition: all 0.2s;
}

.board-slot.empty:hover {
  border-color: rgba(255, 149, 0, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.save-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 1rem;
  width: 100%;
  height: 100%;
  transition: color 0.2s;
}

.save-button:hover:not(:disabled) {
  color: #ff9500;
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.plus-icon-wrapper {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) .plus-icon-wrapper {
  background: rgba(255, 149, 0, 0.15);
}

.plus-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.save-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  z-index: 10;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ff9500;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
