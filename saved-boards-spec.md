You are an expert Vue 3 + TypeScript engineer. I want you to implement a “Saved Boards” feature for my Dota 2 minimap drawing app.

Goal
- Users can create up to 3 “saved boards” for free.
- Everything is local-only (stored on the current device, explained more below), no accounts, no backend.
- The app already auto-saves the current board state as the user edits it. Keep that behavior for each individual saved board.
- The “Save Board” action is NOT for saving changes. It is only for “pinning” the current board state into the Saved Boards list (one of the 3 slots).

Key behavior change (important)
- The user always has an active working board ("workspace") that auto-saves continuously (draft/current).
- On first visit, the user’s working board exists but is NOT counted as one of the 3 saved boards.
- When the user clicks “Save Board” (name can be refined), the current workspace board becomes a saved board entry in the Saved Boards list (counting toward the 3).
- After a board is in the Saved Boards list, it continues to auto-save as the user edits it (no explicit save button needed).
- Switching between boards should not lose work: current board auto-saves, then the selected board loads.

Important context
- A “board” is the full state of the minimap workspace: drawings/strokes, placed icons/markers, text labels, and any relevant settings/toggles.
- Board payload must be JSON-serializable. Never store Konva objects directly.

What to build (requirements)

1) Data model
- Define a Board type/interface:
  - id: string (unique)
  - name: string
  - createdAt: number
  - updatedAt: number
  - isSaved: boolean (true if it’s in the Saved Boards list; false if it’s just the working draft)
  - data: { schemaVersion: number; payload: any } (fully serializable)
- Maintain a stable schemaVersion and include a migration mechanism.

2) Persistence
Implement local persistence with an adapter that can be swapped later:
- Preferred: IndexedDB (because board data can be large and updates are frequent). Prioritize this approach first.
- Acceptable: localStorage for MVP if you implement:
  - throttled writes (debounce)
  - size/quota error handling
  - clear failure messaging and no crashes

Persisted items:
- The current workspace board (draft) under a dedicated key (does NOT count toward the 3 saved boards).
- The saved boards collection (max 3).
- More description on how the saved boards works is below*

3) Auto-save rules
- Auto-save the current board whenever the board state changes, but throttle/debounce (ex: every 500ms–1500ms). (This is the same way the app works now)
- Auto-save should write:
  - If the current board isSaved=true: update its entry in the saved boards collection.
  - If isSaved=false: update the draft entry.
- When switching boards:
  - Ensure the current board’s latest state is persisted
  - Then load the selected board into the app state

4) Saved boards limit (3)
- Enforce max of 3 saved boards.
- If user clicks “Save Board” to pin the current working board and already has 3 saved boards:
  - Do NOT overwrite silently.
  - Return a structured error state that the UI can render:
    - { code: 'LIMIT_REACHED', message: '...', savedCount: 3 }
  - Provide helper methods that UI can call to resolve:
    - delete a saved board then retry
    - or “Save As / overwrite existing” only if explicitly chosen

5) Core operations (Pinia store preferred)
Implement a “boards” module/store with:
- initBoards(): loads draft + saved boards from storage
- getDraftBoard()
- getSavedBoards(): returns saved boards metadata (id, name, updatedAt)
- getBoardById(id)
- setCurrentBoard(id | 'draft'): switches current board and loads data into app state
- pinCurrentBoardToSaved(name?): (this is the “Save Board” action)
  - If current is already saved: no-op or rename flow (return status)
  - If current is draft: creates a saved board copy and marks current as that saved board
- createNewDraft(): clears current board to a fresh draft state (does not affect saved boards)
- renameBoard(id, name)
- deleteSavedBoard(id)
- exportBoardState(): produce payload from current app state (to be implemented/integrated)
- importBoardState(payload): load payload into app state (to be implemented/integrated)

Also include:
- currentBoardId in state (either 'draft' or a saved board id)

6) Integration points with existing canvas/state
- Identify how the app currently represents board state.
- Implement these as explicit functions (even if stubs with TODOs if context is missing):
  - serializeCurrentBoard(): JSON payload
  - hydrateBoard(payload): clears current and loads payload
- Ensure data validation before hydrate.

7) Migrations + validation + safety
- Implement validateBoardPayload(payload): boolean + error reasons
- Implement migrateBoardData(data): returns latest schema
- Handle corrupted storage gracefully:
  - if saved boards are corrupted, ignore them and keep app usable
  - if draft is corrupted, reset to empty draft
- Handle quota/storage failures without crashing.

8) Developer ergonomics
- Keep storage behind a small interface so later we can add:
  - cloud storage adapter (Supabase/Firebase/MySQL API)
  - optional account sync
- Provide a few example usage snippets of store methods (not full UI).

UI placeholders
- Include clearly marked placeholder sections/comments in the code where the UI will call:
  - pinCurrentBoardToSaved
  - setCurrentBoard
  - deleteSavedBoard
  - etc.

Saved Boards + Workspace System (Slot-Based Saving)
Concepts:
A workspace is the active canvas in the center of the app where the user draws, places icons, and edits the map.
A slot is an empty container that can hold one saved board.
A board is a saved snapshot of a workspace that lives inside a slot.
Users can have a maximum of 3 saved boards (3 slots).
The workspace always exists and is auto-saved locally, but it is not a saved board unless the user explicitly saves it into a slot.
Initial State:
On first load:
All 3 slots are empty.
The workspace behaves exactly like the app currently does.
No board is opened yet.
The workspace is independent.
If at least one board exists:
The workspace automatically opens the last opened board.
If the last opened board no longer exists, open the first available board.
If no boards exist, fall back to empty workspace.
Slot UI:
Each empty slot shows a “+” button.
Clicking the “+”:
Saves the current workspace into that slot.
Creates a new board containing the full serialized workspace state:
drawings
icons
markers
text
any relevant board settings
That slot is now filled and displays the board preview instead of the “+”.
Once a slot contains a board:
The “+” is no longer shown.
The slot displays:
A name input field
Two buttons: Open and Clear
Saved Board Layout:
Each filled slot shows:
Name input
Editable directly
Saves automatically on blur
Stored with the board data
Buttons
Open
Clear
Buttons Behavior:
Open:
Shows a confirmation prompt:
“This will replace your current workspace. Continue?”
If confirmed:
Loads that board into the workspace
Replaces the current workspace state
Sets this board as the “active” board
All subsequent changes in the workspace auto-save directly into this board
Store this board as lastOpenedBoard
Clear:
Shows a confirmation prompt:
“This will permanently delete this board. Are you sure?”
If confirmed:
Deletes the board from that slot
Frees the slot
Shifts all boards after it upward so there are no gaps
If the cleared board was the currently opened board:
If another board exists, automatically open the next available board
Otherwise, return to an empty workspace state
Workspace Behavior:
The workspace can be in one of two modes:
Editing a saved board
Changes auto-save directly to that board
The corresponding slot is visually highlighted (glow outline)
Independent workspace
Only happens when there are no saved boards yet
Changes live only in the workspace until saved into a slot
Auto-Save Rules:
If a board is currently opened:
Every change auto-saves to that board
If no board is opened:
Changes remain only in the workspace until saved via a slot
Visual Indicators:
The slot whose board is currently active:
Has a subtle glow or highlight
Indicates: “This board is being edited”
Slot Availability:
There are always exactly 3 slots.
A slot shows:
“+” if empty
Board UI if filled
When all 3 slots are filled:
No “+” buttons exist
The user must Clear a board to free a slot before saving a new one
Behavior Summary:
Workspace is where you work.
Slots are where you store versions you care about.
There is no generic “Save” button.
“Saving” only means committing the workspace into a slot.
Opening a board replaces the workspace.
Editing a board auto-updates that slot.
Clearing removes a board and compacts the slots.
Mental Model:
This behaves exactly like save slots in a video game:
You can play freely in the workspace.
You choose when to save into a slot.
Slots are stable until overwritten or cleared.
Editing a loaded slot updates that slot automatically.
The user always knows which slot is active.

Deliverables
- Pinia store/module with types and persistence.
- Storage adapter (IndexedDB preferred) + fallback plan if needed.
- Helpers for migrations/validation/id generation.
- Minimal integration stubs for serialize/hydrate with TODOs if necessary.

UI:
I'm attaching some screenshots to help you understand the look of this implementation, but basically it's this.

The panel that lives on the left side of the screen will now have two tabs you can switch to. One is the "Tools", which is what already exists. The other is "Boards", which is new implementation here.

When you switch tabs, it changes the whole look of that side panel to show the appropriate things. Tools shows what exists now, boards shows the boards you have saved, or the empty saved slots.

When a saved slot is populated with a board, there will be an input field underneath it centered on one row, and the row under that (structurally) are two buttons, the open and clear buttons. You can see them in the screenshots.

The rest of the UI around the app will not change.


Final:

Focus on keeping everything clean and maintainable and put good thorough thought into every implementation. Things should remain readable for any developer while also being functional. You are a seasoned senior developer. Show that through your code and decision making and architecture. Thanks.