<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBoardsStore, type Board } from '../stores/useBoardsStore'

const props = defineProps<{
  board: Board
  slotNumber: number
  isActive: boolean
}>()

const boardsStore = useBoardsStore()
const isEditing = ref(false)
const editedName = ref(props.board.name)

const formattedDate = computed(() => {
  const date = new Date(props.board.updatedAt)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
})

function startEditing() {
  isEditing.value = true
  editedName.value = props.board.name
}

function cancelEditing() {
  isEditing.value = false
  editedName.value = props.board.name
}

async function saveName() {
  const trimmed = editedName.value.trim()
  if (trimmed && trimmed !== props.board.name) {
    await boardsStore.renameBoard(props.board.id, trimmed)
  }
  isEditing.value = false
}

async function handleOpen() {
  if (props.isActive) return

  const result = await boardsStore.setCurrentBoard(props.board.id)
  if (!result.success) {
    alert(`Failed to open board: ${result.error.message}`)
  }
}

async function handleClear() {
  const confirmed = confirm(
    `Delete "${props.board.name}"? This cannot be undone.`
  )
  if (confirmed) {
    const result = await boardsStore.deleteSavedBoard(props.board.id)
    if (!result.success) {
      alert(`Failed to delete board: ${result.error.message}`)
    }
  }
}
</script>

<template>
  <div :class="['board-slot', { active: isActive }]">
    <!-- Thumbnail -->
    <div class="slot-thumbnail">
      <img
        v-if="board.thumbnail"
        :src="board.thumbnail"
        :alt="`${board.name} preview`"
        class="thumbnail-image"
      />
      <div v-else class="thumbnail-placeholder">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="placeholder-icon"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    </div>

    <!-- Metadata -->
    <div class="slot-header">
      <span class="slot-number">#{{ slotNumber }}</span>
      <span class="slot-date">{{ formattedDate }}</span>
    </div>

    <!-- Name -->
    <div class="slot-name">
      <input
        v-if="isEditing"
        v-model="editedName"
        @blur="saveName"
        @keydown.enter="saveName"
        @keydown.esc="cancelEditing"
        class="name-input"
        maxlength="50"
        autofocus
      />
      <button v-else @click="startEditing" class="name-button">
        {{ board.name }}
      </button>
    </div>

    <!-- Actions -->
    <div class="slot-actions">
      <button
        @click="handleOpen"
        class="action-button open-button"
        :disabled="isActive"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="action-icon"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{{ isActive ? 'Active' : 'Open' }}</span>
      </button>
      <button @click="handleClear" class="action-button clear-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="action-icon"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        <span>Clear</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.board-slot {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s;
}

.board-slot.active {
  background: rgba(255, 149, 0, 0.1);
  border-color: #ff9500;
  box-shadow: 0 0 0 3px rgba(255, 149, 0, 0.2);
}

.slot-thumbnail {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.375rem;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.2);
}

.placeholder-icon {
  width: 3rem;
  height: 3rem;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.slot-number {
  color: #ff9500;
  font-weight: 600;
}

.slot-date {
  color: rgba(255, 255, 255, 0.5);
}

.slot-name {
  margin: 0.125rem 0;
}

.name-button {
  width: 100%;
  text-align: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  padding: 0.375rem 0.5rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.name-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.name-input {
  width: 100%;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #ff9500;
  border-radius: 0.25rem;
  padding: 0.375rem 0.5rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.name-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 149, 0, 0.3);
}

.slot-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.open-button {
  background: #4f76e2;
  color: white;
}

.open-button:hover:not(:disabled) {
  background: #3d5fc4;
}

.open-button:disabled {
  background: rgba(79, 118, 226, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.clear-button {
  background: #ef4444;
  color: white;
}

.clear-button:hover {
  background: #dc2626;
}

/* Mobile adjustments */
@media (max-width: 900px) {
  .board-slot {
    width: 140px;
    padding: 0.5rem;
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .slot-thumbnail {
    aspect-ratio: 1;
    max-height: 80px;
  }

  .placeholder-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .slot-header {
    font-size: 0.625rem;
  }

  .slot-name {
    margin: 0;
  }

  .name-button {
    padding: 0.25rem 0.375rem;
    font-size: 0.6875rem;
  }

  .name-input {
    padding: 0.25rem 0.375rem;
    font-size: 0.6875rem;
  }

  .slot-actions {
    gap: 0.375rem;
  }

  .action-button {
    padding: 0.25rem 0.375rem;
    font-size: 0.625rem;
    gap: 0.125rem;
  }

  .action-icon {
    width: 0.75rem;
    height: 0.75rem;
  }

  .action-button span {
    display: none;
  }
}
</style>
