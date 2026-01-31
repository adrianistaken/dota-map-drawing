<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Shuffle from 'shufflejs'
import posthog from 'posthog-js'
import { useEditorStore, type HeroSelection } from '../stores/useEditorStore'
import { heroAttributes, type HeroAttribute } from '../data/heroAttributes'

const store = useEditorStore()

// Attribute filter state
const activeFilter = ref<HeroAttribute | null>(null)

// Attribute filter options
const attributeFilters = [
  { type: 'strength' as HeroAttribute, icon: '/images/icons/attributes/hero_strength.png', label: 'Strength' },
  { type: 'intelligence' as HeroAttribute, icon: '/images/icons/attributes/hero_intelligence.png', label: 'Intelligence' },
  { type: 'agility' as HeroAttribute, icon: '/images/icons/attributes/hero_agility.png', label: 'Agility' },
  { type: 'universal' as HeroAttribute, icon: '/images/icons/attributes/hero_universal.png', label: 'Universal' }
]

// All Dota 2 heroes with their icon filenames
const heroList = [
  'Abaddon', 'Alchemist', 'Ancient_Apparition', 'Anti-Mage', 'Arc_Warden', 'Axe', 'Bane', 'Batrider',
  'Beastmaster', 'Bloodseeker', 'Bounty_Hunter', 'Brewmaster', 'Bristleback', 'Broodmother', 'Centaur_Warrunner',
  'Chaos_Knight', 'Chen', 'Clinkz', 'Clockwerk', 'Crystal_Maiden', 'Dark_Seer', 'Dark_Willow', 'Dawnbreaker',
  'Dazzle', 'Death_Prophet', 'Disruptor', 'Doom', 'Dragon_Knight', 'Drow_Ranger', 'Earth_Spirit', 'Earthshaker',
  'Elder_Titan', 'Ember_Spirit', 'Enchantress', 'Enigma', 'Faceless_Void', 'Grimstroke', 'Gyrocopter', 'Hoodwink',
  'Huskar', 'Invoker', 'Io', 'Jakiro', 'Juggernaut', 'Keeper_of_the_Light', 'Kez', 'Kunkka',
  'Largo', 'Legion_Commander', 'Leshrac', 'Lich', 'Lifestealer', 'Lina', 'Lion', 'Lone_Druid', 'Luna',
  'Lycan', 'Magnus', 'Marci', 'Mars', 'Medusa', 'Meepo', 'Mirana', 'Monkey_King',
  'Morphling', 'Muerta', 'Naga_Siren', 'Nature\'s_Prophet', 'Necrophos', 'Night_Stalker', 'Nyx_Assassin', 'Ogre_Magi',
  'Omniknight', 'Oracle', 'Outworld_Destroyer', 'Pangolier', 'Phantom_Assassin', 'Phantom_Lancer', 'Phoenix', 'Primal_Beast',
  'Puck', 'Pudge', 'Pugna', 'Queen_of_Pain', 'Razor', 'Riki', 'Ringmaster', 'Rubick',
  'Sand_King', 'Shadow_Demon', 'Shadow_Fiend', 'Shadow_Shaman', 'Silencer', 'Skywrath_Mage', 'Slardar', 'Slark',
  'Snapfire', 'Sniper', 'Spectre', 'Spirit_Breaker', 'Storm_Spirit', 'Sven', 'Techies', 'Templar_Assassin',
  'Terrorblade', 'Tidehunter', 'Timbersaw', 'Tinker', 'Tiny', 'Treant_Protector', 'Troll_Warlord', 'Tusk',
  'Underlord', 'Undying', 'Ursa', 'Vengeful_Spirit', 'Venomancer', 'Viper', 'Visage', 'Void_Spirit',
  'Warlock', 'Weaver', 'Windranger', 'Winter_Wyvern', 'Witch_Doctor', 'Wraith_King', 'Zeus'
]

// Generate hero options from the list
const allHeroOptions: HeroSelection[] = heroList.map(heroName => {
  // Convert hero name to filename format
  const filename = `${heroName}_mapicon_dota2_gameasset.png`
  // Convert filename format to display name (replace underscores with spaces, handle special cases)
  const displayName = heroName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  const imagePath = `/images/icons/heroes/${encodeURIComponent(filename)}`

  return {
    id: heroName.toLowerCase().replace(/_/g, '-'),
    name: displayName,
    image: imagePath
  }
})

// Shuffle instance
const heroGrid = ref<HTMLElement | null>(null)
let shuffleInstance: Shuffle | null = null

// Helper function to get hero attribute by ID
const getHeroAttribute = (heroId: string): HeroAttribute => {
  const heroName = heroList.find(h => h.toLowerCase().replace(/_/g, '-') === heroId)
  return heroName ? heroAttributes[heroName] : 'universal'
}

// Toggle attribute filter
const toggleFilter = (attribute: HeroAttribute) => {
  const isActivating = activeFilter.value !== attribute

  if (activeFilter.value === attribute) {
    activeFilter.value = null
  } else {
    activeFilter.value = attribute
  }

  // Track filter usage
  posthog.capture('hero_filter_clicked', {
    filter: attribute,
    action: isActivating ? 'activate' : 'deactivate'
  })
}

// Select hero icon - also switches to icon placement mode
const selectHero = (hero: HeroSelection) => {
  store.selectHero(hero)
}

// Initialize shuffle.js
onMounted(() => {
  if (heroGrid.value) {
    shuffleInstance = new Shuffle(heroGrid.value, {
      itemSelector: '.hero-item',
      speed: 180,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      useTransforms: false,
      staggerAmount: 12,
      staggerAmountMax: 150,
      columnWidth: 0,
      gutterWidth: 3,
      isCentered: true
    })
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (shuffleInstance) {
    shuffleInstance.destroy()
    shuffleInstance = null
  }
})

// Watch for filter changes and apply shuffle filter
watch(activeFilter, (newFilter) => {
  if (!shuffleInstance) return

  if (newFilter === null) {
    shuffleInstance.filter()
  } else {
    shuffleInstance.filter((element) => {
      const attribute = element.getAttribute('data-attribute')
      return attribute === newFilter
    })
  }

  // Force layout update to recalculate container height
  shuffleInstance.update()
})
</script>

<template>
  <div class="hero-palette p-2 flex flex-col" style="height: 100%; max-height: 100%;">
    <!-- Attribute Filters -->
    <div class="attribute-filters mb-3 flex gap-2 justify-center pt-2 py-3 border-b border-gray-700">
      <button v-for="filter in attributeFilters" :key="filter.type" @click="toggleFilter(filter.type)"
        :aria-label="`Filter by ${filter.label}`" :aria-pressed="activeFilter === filter.type" :class="[
          'attribute-filter-btn w-7 h-7 relative transition-all duration-300 cursor-pointer flex items-center justify-center',
          activeFilter === filter.type
            ? 'ring-2 ring-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] scale-105 opacity-100'
            : 'opacity-60 hover:opacity-90 hover:scale-105'
        ]">
        <img :src="filter.icon" :alt="`${filter.label} attribute`" class="w-6 absolute object-contain" />
      </button>
    </div>

    <!-- Hero Grid -->
    <div ref="heroGrid" class="hero-grid">
      <div v-for="hero in allHeroOptions" :key="hero.id" :data-hero-id="hero.id"
        :data-attribute="getHeroAttribute(hero.id)" class="hero-item">
        <button @click="selectHero(hero)" :aria-label="`Select ${hero.name}`" :class="[
          'hero-button w-8 h-8 relative cursor-pointer focus-visible:outline-none flex items-center justify-center',
          store.selectedHero?.id === hero.id
            ? 'ring-2 ring-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.65)] scale-110'
            : 'hover:opacity-80 hover:scale-105'
        ]">
          <img :src="hero.image" :alt="`${hero.name} icon`" class="w-7 absolute object-contain" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-palette {
  background-color: transparent;
}

.attribute-filters {
  flex-shrink: 0;
}

.attribute-filters button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}

/* Remove all focus states on attribute filter buttons */
.attribute-filter-btn:focus,
.attribute-filter-btn:focus-visible,
.attribute-filter-btn:active {
  outline: none !important;
}

/* Remove default focus ring - active state is controlled by Vue */
.attribute-filter-btn:focus:not(:focus-visible) {
  outline: none;
}

.hero-grid {
  position: relative;
  width: 100%;
  overflow: hidden;
  padding-right: 0.1rem;
}

.hero-item {
  width: 32px;
  height: 32px;
  margin: 0 4px 4px 0;
}

.hero-button {
  transition: transform 0.18s ease-out, opacity 0.18s ease-out, box-shadow 0.18s ease-out;
  transform-origin: center;
}

.hero-button img {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  transform: translateZ(0);
}

.hero-grid .shuffle-item {
  position: absolute;
  transition: top 180ms cubic-bezier(0.4, 0, 0.2, 1),
              left 180ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 180ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.hero-grid .shuffle-item--hidden {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.7);
}

.hero-grid .shuffle-item--visible {
  opacity: 1;
  transform: scale(1);
}

.hero-palette button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}
</style>
