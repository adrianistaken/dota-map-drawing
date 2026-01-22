/**
 * Boards Pinia Store
 *
 * Manages saved boards, draft board, and board switching
 * Integrates with editor store for serialization/hydration
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBoardStorage, type BoardStorageAdapter } from '../utils/boardStorage'
import { useEditorStore, type Stroke, type Icon, type BrushType } from './useEditorStore'
import { debounce } from '../utils/persistence'

// Constants
export const BOARD_SCHEMA_VERSION = 1
export const MAX_SAVED_BOARDS = 3
export const MAX_BOARD_NAME_LENGTH = 50
export const DRAFT_BOARD_ID = '__draft__'
export const METADATA_KEY_LAST_OPENED = 'lastOpenedBoardId'

// TypeScript Interfaces
export interface Board {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  isSaved: boolean
  slotNumber: number | null  // 1, 2, or 3 (null for draft)
  thumbnail: string | null   // Base64 data URL
  data: BoardData
}

export interface BoardData {
  schemaVersion: number
  payload: BoardPayload
}

export interface BoardPayload {
  strokes: Stroke[]
  icons: Icon[]
  preferences: BoardPreferences
}

export interface BoardPreferences {
  brushColor: string
  brushSize: number
  brushType: BrushType
  heroIconSize: number
  useSimpleMap: boolean
  autoPlaceBuildings: boolean
  autoPlaceWatchers: boolean
  autoPlaceStructures: boolean
  autoPlaceNeutralCamps: boolean
  autoPlaceRunes: boolean
}

export interface BoardError {
  code: 'LIMIT_REACHED' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'STORAGE_ERROR' | 'CORRUPTED_DATA'
  message: string
  details?: any
}

export type BoardResult<T> =
  | { success: true; data: T }
  | { success: false; error: BoardError }

/**
 * Boards Store
 */
export const useBoardsStore = defineStore('boards', () => {
  // State
  const currentBoardId = ref<string>(DRAFT_BOARD_ID)
  const draftBoard = ref<Board | null>(null)
  const savedBoards = ref<Board[]>([])
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const lastError = ref<BoardError | null>(null)

  // Storage adapter (lazy initialized)
  let storageAdapter: BoardStorageAdapter | null = null

  // Computed properties
  const currentBoard = computed(() => {
    if (currentBoardId.value === DRAFT_BOARD_ID) {
      return draftBoard.value
    }
    return savedBoards.value.find(b => b.id === currentBoardId.value) || null
  })

  const isCurrentBoardSaved = computed(() => {
    return currentBoardId.value !== DRAFT_BOARD_ID
  })

  const canSaveMore = computed(() => {
    return savedBoards.value.length < MAX_SAVED_BOARDS
  })

  const savedBoardsCount = computed(() => savedBoards.value.length)

  /**
   * Generate UUID v4
   */
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Create a fresh board with empty state
   */
  function createFreshBoard(id: string, name: string, isSaved: boolean, slotNumber: number | null = null): Board {
    return {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isSaved,
      slotNumber,
      thumbnail: null,
      data: {
        schemaVersion: BOARD_SCHEMA_VERSION,
        payload: {
          strokes: [],
          icons: [],
          preferences: {
            brushColor: '#ff2929',
            brushSize: 5,
            brushType: 'standard',
            heroIconSize: 64,
            useSimpleMap: false,
            autoPlaceBuildings: false,
            autoPlaceWatchers: false,
            autoPlaceStructures: false,
            autoPlaceNeutralCamps: false,
            autoPlaceRunes: false
          }
        }
      }
    }
  }

  /**
   * Validate board payload structure
   */
  function validateBoardPayload(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
      errors.push('Payload is not an object')
      return { valid: false, errors }
    }

    // Validate strokes
    if (!Array.isArray(payload.strokes)) {
      errors.push('strokes must be an array')
    } else {
      payload.strokes.forEach((stroke: any, i: number) => {
        if (!stroke.id || typeof stroke.id !== 'string') {
          errors.push(`stroke[${i}].id is invalid`)
        }
        if (!Array.isArray(stroke.points)) {
          errors.push(`stroke[${i}].points must be an array`)
        }
        if (!stroke.color || typeof stroke.color !== 'string') {
          errors.push(`stroke[${i}].color is invalid`)
        }
        if (typeof stroke.strokeWidth !== 'number') {
          errors.push(`stroke[${i}].strokeWidth must be a number`)
        }
      })
    }

    // Validate icons
    if (!Array.isArray(payload.icons)) {
      errors.push('icons must be an array')
    } else {
      payload.icons.forEach((icon: any, i: number) => {
        if (!icon.id || typeof icon.id !== 'string') {
          errors.push(`icon[${i}].id is invalid`)
        }
        if (typeof icon.x !== 'number' || typeof icon.y !== 'number') {
          errors.push(`icon[${i}] position is invalid`)
        }
        if (!icon.image || typeof icon.image !== 'string') {
          errors.push(`icon[${i}].image is invalid`)
        }
      })
    }

    // Validate preferences
    if (!payload.preferences || typeof payload.preferences !== 'object') {
      errors.push('preferences must be an object')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Migrate board data to latest schema version
   */
  function migrateBoardData(data: BoardData): BoardPayload {
    let payload = data.payload

    // Schema version 1 is current, no migrations needed yet
    // Future migrations would go here:
    // if (data.schemaVersion < 2) {
    //   payload = migrateV1ToV2(payload)
    // }

    return payload
  }

  /**
   * Serialize current board state from editor store
   */
  function serializeCurrentBoard(): BoardPayload {
    const editorStore = useEditorStore()

    return {
      strokes: JSON.parse(JSON.stringify(editorStore.strokes)),
      icons: JSON.parse(JSON.stringify(editorStore.icons)),
      preferences: {
        brushColor: editorStore.brushColor,
        brushSize: editorStore.brushSize,
        brushType: editorStore.brushType,
        heroIconSize: editorStore.heroIconSize,
        useSimpleMap: editorStore.useSimpleMap,
        autoPlaceBuildings: editorStore.autoPlaceBuildings,
        autoPlaceWatchers: editorStore.autoPlaceWatchers,
        autoPlaceStructures: editorStore.autoPlaceStructures,
        autoPlaceNeutralCamps: editorStore.autoPlaceNeutralCamps,
        autoPlaceRunes: editorStore.autoPlaceRunes
      }
    }
  }

  /**
   * Hydrate editor store from board payload
   */
  async function hydrateEditorWithBoard(boardId: string): Promise<void> {
    const board = getBoardById(boardId)
    if (!board) {
      throw new Error(`Cannot hydrate: board ${boardId} not found`)
    }

    // Validate payload
    const validation = validateBoardPayload(board.data.payload)
    if (!validation.valid) {
      console.error('[BoardsStore] Invalid payload:', validation.errors)
      throw new Error('Board payload validation failed')
    }

    // Migrate if needed
    let payload = board.data.payload
    if (board.data.schemaVersion < BOARD_SCHEMA_VERSION) {
      payload = migrateBoardData(board.data)
    }

    const editorStore = useEditorStore()

    // Clear current state (don't save to history)
    editorStore.strokes = []
    editorStore.icons = []
    editorStore.undoStack = []
    editorStore.redoStack = []

    // Load payload
    editorStore.strokes = JSON.parse(JSON.stringify(payload.strokes))
    editorStore.icons = JSON.parse(JSON.stringify(payload.icons))

    // Load preferences
    editorStore.brushColor = payload.preferences.brushColor
    editorStore.brushSize = payload.preferences.brushSize
    editorStore.brushType = payload.preferences.brushType
    editorStore.heroIconSize = payload.preferences.heroIconSize
    editorStore.useSimpleMap = payload.preferences.useSimpleMap
    editorStore.autoPlaceBuildings = payload.preferences.autoPlaceBuildings
    editorStore.autoPlaceWatchers = payload.preferences.autoPlaceWatchers
    editorStore.autoPlaceStructures = payload.preferences.autoPlaceStructures
    editorStore.autoPlaceNeutralCamps = payload.preferences.autoPlaceNeutralCamps
    editorStore.autoPlaceRunes = payload.preferences.autoPlaceRunes

    // Ensure auto-placed icons are synced
    editorStore.ensureAutoPlacedIcons()
  }

  /**
   * Persist current board to storage
   */
  async function persistCurrentBoard(): Promise<void> {
    if (!storageAdapter) return

    try {
      isSaving.value = true

      const payload = serializeCurrentBoard()
      const now = Date.now()

      if (currentBoardId.value === DRAFT_BOARD_ID) {
        // Update draft
        if (draftBoard.value) {
          draftBoard.value.data.payload = payload
          draftBoard.value.updatedAt = now

          await storageAdapter.saveBoard(draftBoard.value)
        }
      } else {
        // Update saved board
        const board = savedBoards.value.find(b => b.id === currentBoardId.value)
        if (board) {
          board.data.payload = payload
          board.updatedAt = now

          await storageAdapter.saveBoard(board)
        }
      }
    } catch (err) {
      console.error('[BoardsStore] persistCurrentBoard failed:', err)
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Debounced auto-save (called by editor store on every change)
   */
  const debouncedAutoSave = debounce(async () => {
    await persistCurrentBoard()
  }, 500)

  function autoSaveCurrentBoard(): void {
    debouncedAutoSave()
  }

  /**
   * Get draft board
   */
  function getDraftBoard(): Board | null {
    return draftBoard.value
  }

  /**
   * Get saved boards metadata
   */
  function getSavedBoards(): Array<Pick<Board, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'slotNumber'>> {
    return savedBoards.value.map(b => ({
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      slotNumber: b.slotNumber
    }))
  }

  /**
   * Get board by ID
   */
  function getBoardById(id: string): Board | null {
    if (id === DRAFT_BOARD_ID) {
      return draftBoard.value
    }
    return savedBoards.value.find(b => b.id === id) || null
  }

  /**
   * Check if current workspace has unsaved changes
   * For MVP, we always auto-save, so this returns false
   */
  function hasUnsavedChanges(): boolean {
    // TODO: Implement diff checking if needed
    return false
  }

  /**
   * Initialize boards store
   * Loads draft and saved boards from storage, determines last opened
   */
  async function initBoards(): Promise<void> {
    if (isInitialized.value) return

    try {
      isLoading.value = true

      // Get storage adapter
      storageAdapter = await createBoardStorage()

      // Load draft board
      const draft = await storageAdapter.getBoard(DRAFT_BOARD_ID)
      if (draft) {
        draftBoard.value = draft
      } else {
        // Create fresh draft
        draftBoard.value = createFreshBoard(DRAFT_BOARD_ID, 'Draft', false)
        await storageAdapter.saveBoard(draftBoard.value)
      }

      // Load saved boards
      const allBoards = await storageAdapter.getAllBoards()
      savedBoards.value = allBoards
        .filter(b => b.isSaved && b.id !== DRAFT_BOARD_ID)
        .slice(0, MAX_SAVED_BOARDS)
        .sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0))

      // Determine current board
      const lastOpenedId = await storageAdapter.getMetadata(METADATA_KEY_LAST_OPENED)
      if (lastOpenedId && savedBoards.value.some(b => b.id === lastOpenedId)) {
        currentBoardId.value = lastOpenedId
        await hydrateEditorWithBoard(lastOpenedId)
      } else if (savedBoards.value.length > 0) {
        // If no last opened, but boards exist, open the first one
        currentBoardId.value = savedBoards.value[0].id
        await hydrateEditorWithBoard(savedBoards.value[0].id)
      } else {
        // No saved boards, use draft
        currentBoardId.value = DRAFT_BOARD_ID
        await hydrateEditorWithBoard(DRAFT_BOARD_ID)
      }

      isInitialized.value = true
      console.log('[BoardsStore] Initialized with', savedBoards.value.length, 'saved boards')
    } catch (err) {
      console.error('[BoardsStore] Init failed:', err)
      lastError.value = {
        code: 'STORAGE_ERROR',
        message: 'Failed to initialize boards',
        details: err
      }

      // Fallback: create in-memory draft
      draftBoard.value = createFreshBoard(DRAFT_BOARD_ID, 'Draft', false)
      currentBoardId.value = DRAFT_BOARD_ID
      isInitialized.value = true
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Switch to a different board
   * Prompts if current is unsaved draft, auto-saves otherwise
   */
  async function setCurrentBoard(id: string): Promise<BoardResult<void>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      // Check if switching from unsaved draft
      if (!isCurrentBoardSaved.value && hasUnsavedChanges()) {
        // TODO: UI should show confirmation dialog
        // For now, we auto-save current draft
        await persistCurrentBoard()
      } else {
        // Auto-save current board
        await persistCurrentBoard()
      }

      // Load target board
      const targetBoard = getBoardById(id)
      if (!targetBoard) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Board ${id} not found` }
        }
      }

      // Hydrate editor with target board
      await hydrateEditorWithBoard(id)

      // Update current board ID
      currentBoardId.value = id

      // Save to metadata
      await storageAdapter.setMetadata(METADATA_KEY_LAST_OPENED, id)

      console.log('[BoardsStore] Switched to board:', id)
      return { success: true, data: undefined }
    } catch (err) {
      console.error('[BoardsStore] setCurrentBoard failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to switch board', details: err }
      }
    }
  }

  /**
   * Pin current workspace to saved boards (save to slot)
   */
  async function pinCurrentBoardToSaved(slotNumber: number, name?: string): Promise<BoardResult<Board>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      // Check limit
      if (savedBoards.value.length >= MAX_SAVED_BOARDS) {
        return {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_SAVED_BOARDS} boards reached. Clear a board first.`,
            details: { savedCount: savedBoards.value.length }
          }
        }
      }

      // Check if slot already occupied
      const existingInSlot = savedBoards.value.find(b => b.slotNumber === slotNumber)
      if (existingInSlot) {
        return {
          success: false,
          error: {
            code: 'STORAGE_ERROR',
            message: `Slot ${slotNumber} is already occupied`,
            details: { existingBoardId: existingInSlot.id }
          }
        }
      }

      // If current board is already saved, just rename
      if (isCurrentBoardSaved.value) {
        if (name) {
          return await renameBoard(currentBoardId.value, name)
        }
        return { success: true, data: currentBoard.value! }
      }

      // Create new saved board from current workspace
      const payload = serializeCurrentBoard()
      const newBoard: Board = {
        id: generateUUID(),
        name: name || `Board ${slotNumber}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSaved: true,
        slotNumber,
        thumbnail: null,  // Will be set later when capturing
        data: {
          schemaVersion: BOARD_SCHEMA_VERSION,
          payload
        }
      }

      // Save to storage
      await storageAdapter.saveBoard(newBoard)

      // Add to saved boards
      savedBoards.value.push(newBoard)
      savedBoards.value.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0))

      // Switch to this board as current
      currentBoardId.value = newBoard.id
      await storageAdapter.setMetadata(METADATA_KEY_LAST_OPENED, newBoard.id)

      console.log('[BoardsStore] Pinned board to slot', slotNumber)
      return { success: true, data: newBoard }
    } catch (err) {
      console.error('[BoardsStore] pinCurrentBoardToSaved failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to save board', details: err }
      }
    }
  }

  /**
   * Create new draft (clear workspace)
   */
  async function createNewDraft(): Promise<void> {
    if (!storageAdapter) return

    try {
      // Save current board first
      await persistCurrentBoard()

      // Create fresh draft
      const freshDraft = createFreshBoard(DRAFT_BOARD_ID, 'Draft', false)
      draftBoard.value = freshDraft

      // Save to storage
      await storageAdapter.saveBoard(freshDraft)

      // Switch to draft
      currentBoardId.value = DRAFT_BOARD_ID

      // Clear editor state
      const editorStore = useEditorStore()
      editorStore.clearMap()

      console.log('[BoardsStore] Created new draft')
    } catch (err) {
      console.error('[BoardsStore] createNewDraft failed:', err)
    }
  }

  /**
   * Rename a board
   */
  async function renameBoard(id: string, name: string): Promise<BoardResult<Board>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      const board = getBoardById(id)
      if (!board) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } }
      }

      // Validate name
      const trimmedName = name.trim().slice(0, MAX_BOARD_NAME_LENGTH)
      if (!trimmedName) {
        return { success: false, error: { code: 'VALIDATION_FAILED', message: 'Board name cannot be empty' } }
      }

      // Update name
      board.name = trimmedName
      board.updatedAt = Date.now()

      // Save to storage
      await storageAdapter.saveBoard(board)

      console.log('[BoardsStore] Renamed board:', id, 'to', trimmedName)
      return { success: true, data: board }
    } catch (err) {
      console.error('[BoardsStore] renameBoard failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to rename board', details: err }
      }
    }
  }

  /**
   * Delete a saved board
   */
  async function deleteSavedBoard(id: string): Promise<BoardResult<void>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      const boardIndex = savedBoards.value.findIndex(b => b.id === id)
      if (boardIndex === -1) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } }
      }

      // Delete from storage
      await storageAdapter.deleteBoard(id)

      // Remove from saved boards
      savedBoards.value.splice(boardIndex, 1)

      // If this was the current board, clear workspace (per spec)
      if (currentBoardId.value === id) {
        await createNewDraft()
      }

      console.log('[BoardsStore] Deleted board:', id)
      return { success: true, data: undefined }
    } catch (err) {
      console.error('[BoardsStore] deleteSavedBoard failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to delete board', details: err }
      }
    }
  }

  /**
   * Duplicate current board to a specific slot
   * Creates a copy with new UUID, keeps working on current board
   */
  async function duplicateCurrentBoardToSlot(slotNumber: number, name?: string): Promise<BoardResult<Board>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      // Check limit
      if (savedBoards.value.length >= MAX_SAVED_BOARDS) {
        return {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_SAVED_BOARDS} boards reached. Clear a board first.`,
            details: { savedCount: savedBoards.value.length }
          }
        }
      }

      // Check if slot occupied
      const existingInSlot = savedBoards.value.find(b => b.slotNumber === slotNumber)
      if (existingInSlot) {
        return {
          success: false,
          error: { code: 'STORAGE_ERROR', message: 'Slot occupied' }
        }
      }

      // Serialize current workspace (draft or saved board)
      const payload = serializeCurrentBoard()

      // Create new board with new ID
      const newBoard: Board = {
        id: generateUUID(),
        name: name || `Board ${slotNumber}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSaved: true,
        slotNumber,
        thumbnail: null,
        data: {
          schemaVersion: BOARD_SCHEMA_VERSION,
          payload
        }
      }

      // Save to storage
      await storageAdapter.saveBoard(newBoard)

      // Add to saved boards
      savedBoards.value.push(newBoard)
      savedBoards.value.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0))

      // If currently on draft, switch to the newly saved board
      // If on a saved board, keep working on current
      if (currentBoardId.value === DRAFT_BOARD_ID) {
        currentBoardId.value = newBoard.id
        await storageAdapter.setMetadata(METADATA_KEY_LAST_OPENED, newBoard.id)
      }

      console.log('[BoardsStore] Duplicated current board to slot', slotNumber)
      return { success: true, data: newBoard }
    } catch (err) {
      console.error('[BoardsStore] duplicateCurrentBoardToSlot failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to duplicate board', details: err }
      }
    }
  }

  /**
   * Create fresh empty board in a specific slot and switch to it
   */
  async function createFreshBoardInSlot(slotNumber: number): Promise<BoardResult<Board>> {
    if (!storageAdapter) {
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Storage not initialized' }
      }
    }

    try {
      // Check limit
      if (savedBoards.value.length >= MAX_SAVED_BOARDS) {
        return {
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `Maximum ${MAX_SAVED_BOARDS} boards reached. Clear a board first.`,
            details: { savedCount: savedBoards.value.length }
          }
        }
      }

      // Check if slot occupied
      const existingInSlot = savedBoards.value.find(b => b.slotNumber === slotNumber)
      if (existingInSlot) {
        return {
          success: false,
          error: { code: 'STORAGE_ERROR', message: 'Slot occupied' }
        }
      }

      // Create fresh empty board
      const freshBoard = createFreshBoard(
        generateUUID(),
        `Board ${slotNumber}`,
        true,
        slotNumber
      )

      // Save to storage
      await storageAdapter.saveBoard(freshBoard)

      // Add to saved boards
      savedBoards.value.push(freshBoard)
      savedBoards.value.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0))

      // Switch to this new empty board
      await setCurrentBoard(freshBoard.id)

      console.log('[BoardsStore] Created fresh board in slot', slotNumber)
      return { success: true, data: freshBoard }
    } catch (err) {
      console.error('[BoardsStore] createFreshBoardInSlot failed:', err)
      return {
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to create new board', details: err }
      }
    }
  }

  /**
   * Capture thumbnail for current board
   * Uses Konva stage toDataURL method
   */
  function captureThumbnail(stageRef: any): string | null {
    try {
      if (!stageRef || !stageRef.getStage) {
        console.warn('[BoardsStore] No stage reference available for thumbnail capture')
        return null
      }

      const stage = stageRef.getStage()
      if (!stage) {
        console.warn('[BoardsStore] Stage not found')
        return null
      }

      // Get current stage dimensions
      const stageWidth = stage.width()
      const stageHeight = stage.height()

      // Calculate scale to fit 300x300 thumbnail while maintaining aspect ratio
      const targetSize = 300
      const scale = Math.min(targetSize / stageWidth, targetSize / stageHeight)

      // Capture the entire stage scaled down to thumbnail size
      const dataURL = stage.toDataURL({
        pixelRatio: scale * 2, // 2x for retina
        x: 0,
        y: 0,
        width: stageWidth,
        height: stageHeight
      })

      return dataURL
    } catch (err) {
      console.error('[BoardsStore] captureThumbnail failed:', err)
      return null
    }
  }

  /**
   * Update thumbnail for a specific board
   */
  async function updateBoardThumbnail(boardId: string, thumbnail: string): Promise<void> {
    if (!storageAdapter) return

    try {
      const board = getBoardById(boardId)
      if (!board) {
        console.warn('[BoardsStore] Board not found for thumbnail update:', boardId)
        return
      }

      board.thumbnail = thumbnail
      board.updatedAt = Date.now()

      await storageAdapter.saveBoard(board)
    } catch (err) {
      console.error('[BoardsStore] updateBoardThumbnail failed:', err)
    }
  }

  /**
   * Capture thumbnails for all boards when switching to Boards tab
   */
  async function captureAllThumbnails(stageRef: any): Promise<void> {
    if (!stageRef) return

    try {
      // Capture thumbnail for current board
      const thumbnail = captureThumbnail(stageRef)
      if (thumbnail && currentBoard.value) {
        await updateBoardThumbnail(currentBoard.value.id, thumbnail)
      }

      console.log('[BoardsStore] Captured thumbnail for current board')
    } catch (err) {
      console.error('[BoardsStore] captureAllThumbnails failed:', err)
    }
  }

  return {
    // State
    currentBoardId,
    draftBoard,
    savedBoards,
    isInitialized,
    isLoading,
    isSaving,
    lastError,

    // Computed
    currentBoard,
    isCurrentBoardSaved,
    canSaveMore,
    savedBoardsCount,

    // Constants
    MAX_SAVED_BOARDS,

    // Actions
    initBoards,
    getDraftBoard,
    getSavedBoards,
    getBoardById,
    setCurrentBoard,
    pinCurrentBoardToSaved,
    createNewDraft,
    renameBoard,
    deleteSavedBoard,
    duplicateCurrentBoardToSlot,
    createFreshBoardInSlot,
    autoSaveCurrentBoard,
    captureThumbnail,
    updateBoardThumbnail,
    captureAllThumbnails,
    persistCurrentBoard
  }
})
