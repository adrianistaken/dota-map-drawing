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
  const imagePath = `/images/icons/${encodeURIComponent(filename)}`

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
  <div class="hero-palette bg-gray-800 p-4 rounded-lg flex flex-col">
    <h2 class="text-white text-lg font-semibold mb-4">Hero Icons</h2>
    <div class="grid grid-cols-5 gap-2 overflow-y-auto flex-1 min-h-0" style="max-height: 400px;">
      <button v-for="hero in heroOptions" :key="hero.id" @click="selectHero(hero)" :aria-label="`Select ${hero.name}`"
        :class="[
          'w-10 h-10 relative p-1 rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 flex items-center justify-center',
          store.selectedHero?.id === hero.id
            ? 'bg-blue-700/60 border-blue-300 ring-2 ring-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.65)] scale-105'
            : 'bg-gray-700 border-transparent hover:bg-gray-600'
        ]">
        <img :src="hero.image" :alt="`${hero.name} icon`" class="w-5 absolute object-contain scale-125" />
      </button>
    </div>
    <p class="text-gray-400 text-xs mt-4 text-center">
      Click an icon to select it, then click anywhere on the map to place it.
    </p>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
