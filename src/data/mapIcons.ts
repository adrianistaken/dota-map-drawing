export type MapIconFolder = 'misc' | 'runes' | 'map'

export interface MapIconFile {
    folder: MapIconFolder
    filename: string
    size?: number
    width?: number
    height?: number
    showInPalette?: boolean
    paletteSize?: number // Size in pixels for display in the palette (default: 28px / w-7)
}

export const mapIconFiles: MapIconFile[] = [
    // Misc
    { folder: 'misc', filename: 'Animal_Courier_(Radiant)_mapicon_dota2_gameasset.png', size: 40 },
    { folder: 'misc', filename: 'Flying_Courier_(Radiant)_mapicon_dota2_gameasset.png', width: 65, height: 37 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset green.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Observer_Ward_mapicon_dota2_gameasset red.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Sentry_Ward_mapicon_dota2_gameasset.png', width: 50, height: 30 },
    { folder: 'misc', filename: 'Sentry_Ward_mapicon_dota2_gameasset 2.png', width: 50, height: 30 },

    // Runes/ancients
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasset.png', width: 39, height: 50, showInPalette: false },
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasset red.png', width: 39, height: 50, showInPalette: false },
    { folder: 'runes', filename: '60px-Ancient_mapicon_dota2_gameasse greent.png', width: 39, height: 50, showInPalette: false },

    { folder: 'runes', filename: 'Amplify_Damage_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Arcane_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Bounty_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Haste_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Illusion_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Invisibility_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Regeneration_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Shield_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Water_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },
    { folder: 'runes', filename: 'Wisdom_Rune_mapicon_dota2_gameasset.png', width: 35, height: 40 },

    // Map
    { folder: 'map', filename: 'Lotus_Pool_mapicon_dota2_gameasset.png', size: 54, showInPalette: false },
    { folder: 'map', filename: 'Neutral_Camp_(ancient)_mapicon_dota2_gameasset.png', size: 39, showInPalette: false },
    { folder: 'map', filename: 'Neutral_Camp_(large)_mapicon_dota2_gameasset.png', size: 39, showInPalette: false },
    { folder: 'map', filename: 'Neutral_Camp_(medium)_mapicon_dota2_gameasset.png', size: 39, showInPalette: false },
    { folder: 'map', filename: 'Neutral_Camp_(small)_mapicon_dota2_gameasset.png', size: 39, showInPalette: false },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasset.png', size: 56 },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasset green.png', size: 56 },
    { folder: 'map', filename: 'Roshan_symbol_dota2_gameasse redt.png', size: 56 },

    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasset.png', size: 45, showInPalette: false },
    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasset green.png', size: 45, showInPalette: false },
    { folder: 'map', filename: 'Tower_45_mapicon_dota2_gameasse redt.png', size: 45, showInPalette: false },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasset.png', size: 37, showInPalette: false },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasset red.png', size: 37, showInPalette: false },
    { folder: 'map', filename: 'Tower_90_mapicon_dota2_gameasse greent.png', size: 37, showInPalette: false },

    { folder: 'map', filename: 'Warp_Gate_mapicon_dota2_gameasset.png', size: 45, showInPalette: false },
    { folder: 'map', filename: 'Watcher_mapicon_dota2_gameasset.png', width: 47, height: 35, showInPalette: false },
    { folder: 'map', filename: 'tormentor minimap icon.png', size: 52, showInPalette: false }
]

export const mapIconPath = (folder: MapIconFolder, filename: string) =>
    `/images/icons/${folder}/${encodeURIComponent(filename)}`
