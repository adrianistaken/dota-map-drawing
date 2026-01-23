<script setup lang="ts">
type Tab = 'tools' | 'boards'

const props = defineProps<{
  activeTab: Tab
}>()

const emit = defineEmits<{
  (e: 'tabChange', tab: Tab): void
}>()

function selectTab(tab: Tab) {
  emit('tabChange', tab)
}
</script>

<template>
  <div class="panel-tabs">
    <button
      @click="selectTab('tools')"
      :class="['tab-button', { active: props.activeTab === 'tools' }]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="tab-icon"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      <span>Tools</span>
    </button>
    <button
      @click="selectTab('boards')"
      :class="['tab-button', { active: props.activeTab === 'boards' }]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="tab-icon"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
      <span>Boards</span>
    </button>
  </div>
</template>

<style scoped>
.panel-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  height: 60px;
  box-sizing: border-box;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.tab-button.active {
  background: rgba(255, 149, 0, 0.15);
  border-color: #ff9500;
  color: #ff9500;
}

.tab-button:focus-visible {
  outline: 2px solid #ff9500;
  outline-offset: 2px;
}
</style>
