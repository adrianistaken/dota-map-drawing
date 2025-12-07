const STORAGE_KEY = 'dota-map-editor-state'
const STORAGE_VERSION = '1.0.0'

export interface PersistedState {
    strokes: Array<{
        id: string
        points: number[]
        color: string
        strokeWidth: number
        brushType?: 'standard' | 'dotted' | 'arrow'
        arrowAngle?: number
    }>
    icons: Array<{
        id: string
        x: number
        y: number
        image: string
        size?: number
        width?: number
        height?: number
    }>
    preferences: {
        brushColor: string
        brushSize: number
        brushType: 'standard' | 'dotted' | 'arrow'
        useSimpleMap: boolean
        autoPlaceIcons?: boolean
        autoPlaceBuildings?: boolean
        autoPlaceWatchers?: boolean
        autoPlaceStructures?: boolean
    }
    version: string
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
    try {
        const test = '__localStorage_test__'
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
    } catch {
        return false
    }
}

/**
 * Save state to localStorage with error handling
 */
export function saveStateToStorage(state: PersistedState): void {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage is not available, state will not be persisted')
        return
    }

    try {
        const serialized = JSON.stringify(state)
        localStorage.setItem(STORAGE_KEY, serialized)
    } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded, cannot save state')
        } else {
            console.error('Failed to save state to localStorage:', error)
        }
    }
}

/**
 * Load state from localStorage with validation
 */
export function loadStateFromStorage(): PersistedState | null {
    if (!isLocalStorageAvailable()) {
        return null
    }

    try {
        const serialized = localStorage.getItem(STORAGE_KEY)
        if (!serialized) {
            return null
        }

        const state = JSON.parse(serialized) as PersistedState

        // Validate state structure
        if (!state || typeof state !== 'object') {
            console.warn('Invalid state structure in localStorage, clearing')
            localStorage.removeItem(STORAGE_KEY)
            return null
        }

        // Validate required fields
        if (!Array.isArray(state.strokes) || !Array.isArray(state.icons) || !state.preferences) {
            console.warn('Invalid state structure in localStorage, clearing')
            localStorage.removeItem(STORAGE_KEY)
            return null
        }

        return state
    } catch (error) {
        console.error('Failed to load state from localStorage:', error)
        // Clear corrupted data
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            // Ignore errors when clearing
        }
        return null
    }
}

/**
 * Clear persisted state from localStorage
 */
export function clearStateFromStorage(): void {
    if (!isLocalStorageAvailable()) {
        return
    }

    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.error('Failed to clear state from localStorage:', error)
    }
}

/**
 * Debounce function to batch multiple calls
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null
            func(...args)
        }

        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(later, wait)
    }
}

export { STORAGE_KEY, STORAGE_VERSION }
