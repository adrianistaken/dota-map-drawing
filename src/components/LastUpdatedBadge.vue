<template>
    <div class="last-updated" aria-label="Last updated timestamp">
        Last updated: Dec 6, 2025
    </div>
</template>

<style scoped>
.last-updated {
    position: absolute;
    top: 1rem;
    left: 1rem;
    padding: 0.25rem 0.5rem;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    border-radius: 999px;
    font-size: 0.75rem;
    letter-spacing: 0.01em;
    z-index: 10;
    opacity: 0.9;
    transition: opacity 0.3s ease, transform 0.3s ease;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.last-updated:hover {
    opacity: 1;
    transform: translateY(-2px);
}

@media (max-width: 600px) {
    .last-updated {
        top: 0.75rem;
        left: 0.75rem;
        font-size: 0.85rem;
        padding: 0.35rem 0.7rem;
    }
}
</style>
