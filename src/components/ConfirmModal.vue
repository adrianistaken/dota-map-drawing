<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'default'
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'default',
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('cancel')
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel')
  }
}

watch(
  () => props.visible,
  (open: boolean) => {
    if (open) {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayClick">
        <div class="modal-card" role="dialog" aria-modal="true">
          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-message">{{ message }}</p>
          <div class="modal-actions">
            <button class="modal-button cancel-button" @click="emit('cancel')">
              {{ cancelLabel }}
            </button>
            <button
              :class="['modal-button', 'confirm-button', variant]"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.modal-card {
  background: linear-gradient(160deg, rgba(22, 26, 38, 0.97), rgba(14, 16, 24, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.75rem 2rem;
  min-width: 320px;
  max-width: 400px;
  text-align: center;
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.93);
}

.modal-message {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.625rem;
  justify-content: center;
}

.modal-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.confirm-button.default {
  background: #ff9500;
  color: white;
}

.confirm-button.default:hover {
  background: #e68600;
}

.confirm-button.danger {
  background: #ef4444;
  color: white;
}

.confirm-button.danger:hover {
  background: #dc2626;
}

/* Transition */
.modal-enter-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active {
  transition: opacity 0.15s ease-in;
}

.modal-enter-active .modal-card {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out;
}

.modal-leave-active .modal-card {
  transition: transform 0.15s ease-in, opacity 0.12s ease-in;
}

.modal-enter-from {
  opacity: 0;
}

.modal-enter-from .modal-card {
  opacity: 0;
  transform: scale(0.9) translateY(12px);
}

.modal-leave-to {
  opacity: 0;
}

.modal-leave-to .modal-card {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
