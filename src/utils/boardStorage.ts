/**
 * Board Storage Layer
 *
 * Provides abstraction over IndexedDB (primary) and localStorage (fallback)
 * for storing board data. Uses adapter pattern for swappable backends.
 */

import type { Board } from '../stores/useBoardsStore'
import { reportError } from './errorHandler'

// IndexedDB configuration
const DB_NAME = 'dota-map-drawing'
const DB_VERSION = 1
const STORE_NAME_BOARDS = 'boards'
const STORE_NAME_METADATA = 'metadata'

/**
 * Storage adapter interface
 * All storage backends must implement this interface
 */
export interface BoardStorageAdapter {
  // Board CRUD operations
  getBoard(id: string): Promise<Board | null>
  getAllBoards(): Promise<Board[]>
  saveBoard(board: Board): Promise<void>
  deleteBoard(id: string): Promise<void>

  // Metadata operations
  getMetadata(key: string): Promise<string | null>
  setMetadata(key: string, value: string): Promise<void>

  // Utility methods
  isAvailable(): Promise<boolean>
  clear(): Promise<void>
}

/**
 * IndexedDB Adapter (Primary storage backend)
 *
 * Uses IndexedDB for better performance with large payloads and higher quota
 */
class IndexedDBAdapter implements BoardStorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null

  /**
   * Get or create IndexedDB database connection
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create boards object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME_BOARDS)) {
          db.createObjectStore(STORE_NAME_BOARDS, { keyPath: 'id' })
        }

        // Create metadata object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME_METADATA)) {
          db.createObjectStore(STORE_NAME_METADATA)
        }
      }
    })

    return this.dbPromise
  }

  async getBoard(id: string): Promise<Board | null> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_BOARDS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_BOARDS)

      return new Promise((resolve, reject) => {
        const request = store.get(id)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = () => {
          reject(new Error(`Failed to get board ${id}`))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'getting board',
        extra: { boardId: id }
      })
      return null
    }
  }

  async getAllBoards(): Promise<Board[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_BOARDS], 'readonly')
      const store = transaction.objectStore(STORE_NAME_BOARDS)

      return new Promise((resolve, reject) => {
        const request = store.getAll()

        request.onsuccess = () => {
          resolve(request.result || [])
        }

        request.onerror = () => {
          reject(new Error('Failed to get all boards'))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'getting all boards'
      })
      return []
    }
  }

  async saveBoard(board: Board): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_BOARDS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_BOARDS)

      // Update timestamp
      board.updatedAt = Date.now()

      return new Promise((resolve, reject) => {
        const request = store.put(board)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          reject(new Error(`Failed to save board ${board.id}`))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'saving board',
        boardId: board.id,
        extra: {
          boardName: board.name,
          isSaved: board.isSaved
        }
      })
      throw error
    }
  }

  async deleteBoard(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_BOARDS], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_BOARDS)

      return new Promise((resolve, reject) => {
        const request = store.delete(id)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          reject(new Error(`Failed to delete board ${id}`))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'deleting board',
        extra: { boardId: id }
      })
      throw error
    }
  }

  async getMetadata(key: string): Promise<string | null> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_METADATA], 'readonly')
      const store = transaction.objectStore(STORE_NAME_METADATA)

      return new Promise((resolve, reject) => {
        const request = store.get(key)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = () => {
          reject(new Error(`Failed to get metadata ${key}`))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'getting metadata',
        extra: { key }
      })
      return null
    }
  }

  async setMetadata(key: string, value: string): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_METADATA], 'readwrite')
      const store = transaction.objectStore(STORE_NAME_METADATA)

      return new Promise((resolve, reject) => {
        const request = store.put(value, key)

        request.onsuccess = () => {
          resolve()
        }

        request.onerror = () => {
          reject(new Error(`Failed to set metadata ${key}`))
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'setting metadata',
        extra: { key, value }
      })
      throw error
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if IndexedDB exists
      if (!window.indexedDB) {
        return false
      }

      // Try to open a connection
      const db = await this.getDB()

      // Check if required object stores exist
      const hasBoards = db.objectStoreNames.contains(STORE_NAME_BOARDS)
      const hasMetadata = db.objectStoreNames.contains(STORE_NAME_METADATA)

      return hasBoards && hasMetadata
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'checking availability',
        level: 'warning'
      })
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction([STORE_NAME_BOARDS, STORE_NAME_METADATA], 'readwrite')

      const boardsStore = transaction.objectStore(STORE_NAME_BOARDS)
      const metadataStore = transaction.objectStore(STORE_NAME_METADATA)

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = boardsStore.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(new Error('Failed to clear boards'))
        }),
        new Promise<void>((resolve, reject) => {
          const request = metadataStore.clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(new Error('Failed to clear metadata'))
        })
      ])
    } catch (error) {
      reportError(error, {
        source: 'IndexedDBAdapter',
        operation: 'clearing storage'
      })
      throw error
    }
  }
}

/**
 * LocalStorage Adapter (Fallback storage backend)
 *
 * Uses localStorage when IndexedDB is unavailable
 * Less performant and lower quota, but more widely supported
 */
class LocalStorageAdapter implements BoardStorageAdapter {
  private readonly BOARDS_KEY = 'dota-boards'
  private readonly METADATA_KEY_PREFIX = 'dota-meta-'

  /**
   * Get all boards from localStorage
   */
  private getAllBoardsFromStorage(): Board[] {
    try {
      const serialized = localStorage.getItem(this.BOARDS_KEY)
      if (!serialized) {
        return []
      }

      const boards = JSON.parse(serialized) as Board[]
      return Array.isArray(boards) ? boards : []
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'parsing boards from localStorage'
      })
      return []
    }
  }

  /**
   * Save all boards to localStorage
   */
  private saveAllBoardsToStorage(boards: Board[]): void {
    try {
      const serialized = JSON.stringify(boards)
      localStorage.setItem(this.BOARDS_KEY, serialized)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        reportError(error, {
          source: 'LocalStorageAdapter',
          operation: 'saving boards to localStorage',
          extra: { boardCount: boards.length, isQuotaError: true }
        })
        throw new Error('Storage quota exceeded. Delete old boards to continue.')
      }
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'saving boards to localStorage',
        extra: { boardCount: boards.length }
      })
      throw error
    }
  }

  async getBoard(id: string): Promise<Board | null> {
    try {
      const boards = this.getAllBoardsFromStorage()
      return boards.find(b => b.id === id) || null
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'getting board',
        extra: { boardId: id }
      })
      return null
    }
  }

  async getAllBoards(): Promise<Board[]> {
    try {
      return this.getAllBoardsFromStorage()
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'getting all boards'
      })
      return []
    }
  }

  async saveBoard(board: Board): Promise<void> {
    try {
      const boards = this.getAllBoardsFromStorage()
      const index = boards.findIndex(b => b.id === board.id)

      // Update timestamp
      board.updatedAt = Date.now()

      if (index >= 0) {
        // Update existing board
        boards[index] = board
      } else {
        // Add new board
        boards.push(board)
      }

      this.saveAllBoardsToStorage(boards)
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'saving board',
        boardId: board.id,
        extra: {
          boardName: board.name,
          isSaved: board.isSaved
        }
      })
      throw error
    }
  }

  async deleteBoard(id: string): Promise<void> {
    try {
      const boards = this.getAllBoardsFromStorage()
      const filtered = boards.filter(b => b.id !== id)
      this.saveAllBoardsToStorage(filtered)
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'deleting board',
        extra: { boardId: id }
      })
      throw error
    }
  }

  async getMetadata(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.METADATA_KEY_PREFIX + key)
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'getting metadata',
        extra: { key }
      })
      return null
    }
  }

  async setMetadata(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.METADATA_KEY_PREFIX + key, value)
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'setting metadata',
        extra: { key, value }
      })
      throw error
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.BOARDS_KEY)

      // Clear all metadata keys
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.METADATA_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      reportError(error, {
        source: 'LocalStorageAdapter',
        operation: 'clearing storage'
      })
      throw error
    }
  }
}

/**
 * Create storage adapter with automatic fallback
 *
 * Tries IndexedDB first, falls back to localStorage if unavailable
 */
export async function createBoardStorage(): Promise<BoardStorageAdapter> {
  // Try IndexedDB first
  const idbAdapter = new IndexedDBAdapter()
  if (await idbAdapter.isAvailable()) {
    console.log('[BoardStorage] Using IndexedDB')
    return idbAdapter
  }

  // Fallback to localStorage
  console.warn('[BoardStorage] IndexedDB unavailable, falling back to localStorage')
  const lsAdapter = new LocalStorageAdapter()
  if (await lsAdapter.isAvailable()) {
    console.log('[BoardStorage] Using localStorage')
    return lsAdapter
  }

  // No storage available
  throw new Error('No storage adapter available. Both IndexedDB and localStorage are unavailable.')
}
