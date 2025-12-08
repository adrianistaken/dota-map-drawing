<script setup lang="ts">
import { useEditorStore, type HeroSelection } from '../stores/useEditorStore'

const store = useEditorStore()

// All Dota 2 heroes with their icon filenames
const heroList = [
  'Abaddon', 'Alchemist', 'Ancient_Apparition', 'Anti-Mage', 'Arc_Warden', 'Axe', 'Bane', 'Batrider',
  'Beastmaster', 'Bloodseeker', 'Bounty_Hunter', 'Brewmaster', 'Bristleback', 'Broodmother', 'Centaur_Warrunner',
  'Chaos_Knight', 'Chen', 'Clinkz', 'Clockwerk', 'Crystal_Maiden', 'Dark_Seer', 'Dark_Willow', 'Dawnbreaker',
  'Dazzle', 'Death_Prophet', 'Disruptor', 'Doom', 'Dragon_Knight', 'Drow_Ranger', 'Earth_Spirit', 'Earthshaker',
  'Elder_Titan', 'Ember_Spirit', 'Enchantress', 'Enigma', 'Faceless_Void', 'Grimstroke', 'Gyrocopter', 'Hoodwink',
  'Huskar', 'Invoker', 'Io', 'Jakiro', 'Juggernaut', 'Keeper_of_the_Light', 'Kez', 'Kunkka',
  'Legion_Commander', 'Leshrac', 'Lich', 'Lifestealer', 'Lina', 'Lion', 'Lone_Druid', 'Luna',
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
const heroOptions: HeroSelection[] = heroList.map(heroName => {
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

// Select hero icon - also switches to icon placement mode
const selectHero = (hero: HeroSelection) => {
  store.selectHero(hero)
}
</script>

<template>
  <div class="hero-palette p-2 flex flex-col" style="height: 100%; max-height: 100%;">
    <div class="hero-grid">
      <button v-for="hero in heroOptions" :key="hero.id" @click="selectHero(hero)" :aria-label="`Select ${hero.name}`"
        :class="[
          'w-8 h-8 relative transition-all cursor-pointer focus-visible:outline-none flex items-center justify-center',
          store.selectedHero?.id === hero.id
            ? 'ring-2 ring-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.65)] scale-110'
            : 'hover:opacity-80 hover:scale-105'
        ]">
        <img :src="hero.image" :alt="`${hero.name} icon`" class="w-7 absolute object-contain" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero-palette {
  background-color: transparent;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(28px, 1fr));
  gap: 0.25rem;
  width: 100%;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.1rem;
  /* small inset to avoid accidental horizontal scroll */
}

.hero-palette button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}
</style>
