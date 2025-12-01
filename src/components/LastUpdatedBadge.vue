<template>
    <div class="last-updated" aria-label="Last updated timestamp">
        Last updated: Nov 30, 2025
    </div>
</template>

<style scoped>
.last-updated {
    position: fixed;
    top: 1.5rem;
    left: 1.5rem;
    padding: 0.4rem 0.85rem;
    color: rgba(255, 255, 255, 0.87);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(6px);
    border-radius: 999px;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    z-index: 1000;
    opacity: 0.9;
    transition: opacity 0.3s ease;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.last-updated:hover {
    opacity: 1;
}

@media (max-width: 600px) {
    .last-updated {
        top: 1rem;
        left: 1rem;
        font-size: 0.85rem;
        padding: 0.35rem 0.7rem;
    }
}
</style>
