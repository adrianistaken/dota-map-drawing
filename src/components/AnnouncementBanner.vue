<script setup lang="ts">
import { ref, onMounted } from 'vue'
import posthog from 'posthog-js'

/**
 * Banner version - INCREMENT THIS NUMBER for each new announcement.
 * Users who dismissed a lower version will see the new banner.
 */
const BANNER_VERSION = 1
const STORAGE_KEY = 'dismissed-banner-version'

const props = defineProps<{
  message: string
  linkText?: string
  linkAction?: () => void
}>()

const isVisible = ref(false)

type BannerDismissReason = 'x_button' | 'link_click'

function shouldShowBanner(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return true
    return BANNER_VERSION > parseInt(stored, 10)
  } catch {
    // localStorage might be unavailable
    return true
  }
}

function handleDismiss(reason: BannerDismissReason): void {
  posthog.capture('announcement_banner_dismissed', {
    property: 'value',
    banner_version: BANNER_VERSION,
    reason,
    link_text: props.linkText ?? null,
  })

  isVisible.value = false
  try {
    localStorage.setItem(STORAGE_KEY, BANNER_VERSION.toString())
  } catch {
    // localStorage might be unavailable
  }
}

function handleLinkClick(): void {
  posthog.capture('announcement_banner_link_clicked', {
    property: 'value',
    banner_version: BANNER_VERSION,
    link_text: props.linkText ?? null,
  })

  if (props.linkAction) {
    props.linkAction()
  }
  handleDismiss('link_click')
}

onMounted(() => {
  isVisible.value = shouldShowBanner()
})
</script>

<template>
  <Transition name="banner-slide">
    <div v-if="isVisible" class="announcement-banner">
      <div class="banner-glow"></div>
      <div class="banner-shimmer"></div>
      <div class="banner-content">
        <span class="banner-message">{{ message }}</span>
        <button v-if="linkText" class="banner-link" @click="handleLinkClick">
          {{ linkText }}
        </button>
      </div>
      <button class="banner-dismiss" @click="handleDismiss('x_button')" aria-label="Dismiss announcement">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.announcement-banner {
  position: absolute;
  top: 0;
  left: -1.25rem;
  width: calc(100% + 2.5rem);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.625rem 3rem;
  background: rgba(15, 20, 30, 0.95);
  backdrop-filter: blur(12px);
  overflow: hidden;
  box-sizing: border-box;
  animation: holographic-border 6s linear infinite;
}

@keyframes holographic-border {
  0% {
    filter: hue-rotate(0deg) brightness(1);
  }

  50% {
    filter: hue-rotate(15deg) brightness(1.15);
  }

  100% {
    filter: hue-rotate(0deg) brightness(1);
  }
}

/* Animated holographic border (bottom edge only) */
.announcement-banner::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg,
      rgba(100, 180, 255, 0.7),
      rgba(180, 130, 255, 0.7),
      rgba(255, 180, 100, 0.5),
      rgba(100, 255, 200, 0.7),
      rgba(100, 180, 255, 0.7));
  background-size: 300% 100%;
  animation: holographic-shift 6s linear infinite;
  pointer-events: none;
}

/* Enhanced inner glow with pulsing effect */
.banner-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%,
      rgba(140, 180, 255, 0.18) 0%,
      rgba(180, 130, 255, 0.12) 40%,
      transparent 80%);
  pointer-events: none;
  animation: banner-pulse 3s ease-in-out infinite;
}

@keyframes banner-pulse {

  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }
}

/* Shimmer effect that sweeps across */
.banner-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%);
  transform: translateX(-100%);
  animation: shimmer-sweep 4s ease-in-out infinite;
  animation-delay: 1s;
  pointer-events: none;
}

@keyframes shimmer-sweep {

  0%,
  20% {
    transform: translateX(-100%);
  }

  30%,
  100% {
    transform: translateX(200%);
  }
}

@keyframes holographic-shift {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 300% 50%;
  }
}

.banner-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  z-index: 1;
}

.banner-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.banner-link {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  padding: 0.25rem 0.625rem;
  color: rgba(180, 210, 255, 1);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.banner-link:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(180, 210, 255, 0.5);
  color: #fff;
}

.banner-dismiss {
  position: absolute;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0.25rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: color 0.2s ease;
  z-index: 1;
}

.banner-dismiss:hover {
  color: rgba(255, 255, 255, 0.8);
}

/* Vue transition */
.banner-slide-enter-active {
  animation: banner-enter 0.4s ease-out;
}

.banner-slide-leave-active {
  animation: banner-leave 0.3s ease-in forwards;
}

@keyframes banner-enter {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes banner-leave {
  from {
    opacity: 1;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    transform: translateY(-100%);
  }
}

/* Mobile adjustments */
@media (max-width: 900px) {
  .announcement-banner {
    left: 0;
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 1rem;
  }

  .banner-content {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .banner-message {
    font-size: 0.6875rem;
  }

  .banner-link {
    padding: 0.1875rem 0.5rem;
    font-size: 0.6875rem;
  }

  .banner-dismiss {
    right: 0.5rem;
  }
}
</style>
