import { heroAttributes } from '../data/heroAttributes'

export interface TILineup {
  tournament: string
  radiantHeroes: string[]
  direHeroes: string[]
}

// TI Grand Finals lineups - hardcoded for easy maintenance
// Format: Radiant team (5 heroes), Dire team (5 heroes)
const TI_LINEUPS: TILineup[] = [
  {
    tournament: 'TI1',
    radiantHeroes: ['Chen', 'Beastmaster', 'Slardar', 'Weaver', 'Puck'],
    direHeroes: ['Nature\'s_Prophet', 'Doom', 'Storm_Spirit', 'Sand_King', 'Lich']
  },
  {
    tournament: 'TI2',
    radiantHeroes: ['Rubick', 'Leshrac', 'Juggernaut', 'Lone_Druid', 'Nyx_Assassin'],
    direHeroes: ['Dark_Seer', 'Naga_Siren', 'Templar_Assassin', 'Tidehunter', 'Keeper_of_the_Light']
  },
  {
    tournament: 'TI3',
    radiantHeroes: ['Io', 'Nature\'s_Prophet', 'Crystal_Maiden', 'Puck', 'Chaos_Knight'],
    direHeroes: ['Batrider', 'Alchemist', 'Rubick', 'Enigma', 'Templar_Assassin']
  },
  {
    tournament: 'TI4',
    radiantHeroes: ['Shadow_Shaman', 'Brewmaster', 'Rubick', 'Doom', 'Ember_Spirit'],
    direHeroes: ['Ancient_Apparition', 'Nature\'s_Prophet', 'Weaver', 'Sand_King', 'Venomancer']
  },
  {
    tournament: 'TI5',
    radiantHeroes: ['Clockwerk', 'Lina', 'Winter_Wyvern', 'Phantom_Lancer', 'Dragon_Knight'],
    direHeroes: ['Gyrocopter', 'Naga_Siren', 'Storm_Spirit', 'Earthshaker', 'Ancient_Apparition']
  },
  {
    tournament: 'TI6',
    radiantHeroes: ['Elder_Titan', 'Batrider', 'Keeper_of_the_Light', 'Anti-Mage', 'Axe'],
    direHeroes: ['Mirana', 'Timbersaw', 'Vengeful_Spirit', 'Slark', 'Night_Stalker']
  },
  {
    tournament: 'TI7',
    radiantHeroes: ['Venomancer', 'Shadow_Shaman', 'Sand_King', 'Centaur_Warrunner', 'Death_Prophet'],
    direHeroes: ['Earthshaker', 'Lich', 'Dark_Seer', 'Necrophos', 'Juggernaut']
  },
  {
    tournament: 'TI8',
    radiantHeroes: ['Nature\'s_Prophet', 'Rubick', 'Magnus', 'Ember_Spirit', 'Zeus'],
    direHeroes: ['Earthshaker', 'Terrorblade', 'Silencer', 'Kunkka', 'Batrider']
  },
  {
    tournament: 'TI9',
    radiantHeroes: ['Io', 'Tiny', 'Abaddon', 'Timbersaw', 'Gyrocopter'],
    direHeroes: ['Chen', 'Omniknight', 'Bristleback', 'Earth_Spirit', 'Windranger']
  },
  {
    tournament: 'TI10',
    radiantHeroes: ['Tiny', 'Lycan', 'Kunkka', 'Skywrath_Mage', 'Enchantress'],
    direHeroes: ['Magnus', 'Bane', 'Winter_Wyvern', 'Ember_Spirit', 'Terrorblade']
  }
]

// Position templates for lane generation
const LANE_POSITIONS = {
  radiant: [
    { x: 114.61, y: 137.13 },  // Safe lane support
    { x: 193.37, y: 136.94 },  // Safe lane support
    { x: 445.28, y: 389.04 },  // Mid
    { x: 657.02, y: 579.38 },  // Offlane
    { x: 714.64, y: 558.00 }   // Offlane support
  ],
  dire: [
    { x: 102.16, y: 309.01 },  // Offlane
    { x: 170.62, y: 309.73 },  // Offlane support
    { x: 357.63, y: 469.88 },  // Mid
    { x: 614.70, y: 703.62 },  // Safe lane support
    { x: 684.85, y: 711.33 }   // Safe lane carry
  ]
}

// Validate hero names on load (development only)
if (import.meta.env.DEV) {
  TI_LINEUPS.forEach(lineup => {
    lineup.radiantHeroes.forEach(hero => {
      if (!heroAttributes[hero]) {
        console.warn(`TI Lineup ${lineup.tournament}: Hero "${hero}" not found in heroAttributes`)
      }
    })
    lineup.direHeroes.forEach(hero => {
      if (!heroAttributes[hero]) {
        console.warn(`TI Lineup ${lineup.tournament}: Hero "${hero}" not found in heroAttributes`)
      }
    })
  })
}

// Add random variance to position (±8 pixels)
export const randomizePosition = (pos: { x: number; y: number }): { x: number; y: number } => {
  return {
    x: pos.x + (Math.random() * 16 - 8),
    y: pos.y + (Math.random() * 16 - 8)
  }
}

// Get position templates
export const getPositionTemplates = () => LANE_POSITIONS

// Get all TI lineups
export const getTILineups = (): TILineup[] => {
  return TI_LINEUPS
}

// Select a random lineup from the parsed lineups
// Optionally exclude a specific tournament to prevent consecutive duplicates
export const selectRandomLineup = (lineups: TILineup[], excludeTournament?: string): TILineup => {
  // Filter out the excluded tournament if provided
  const availableLineups = excludeTournament
    ? lineups.filter(lineup => lineup.tournament !== excludeTournament)
    : lineups

  // If filtering resulted in empty array (shouldn't happen with 10 lineups), use all lineups
  const selectionPool = availableLineups.length > 0 ? availableLineups : lineups

  const randomIndex = Math.floor(Math.random() * selectionPool.length)
  return selectionPool[randomIndex]
}
