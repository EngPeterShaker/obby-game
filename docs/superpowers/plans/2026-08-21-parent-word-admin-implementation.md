# Parent Word Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a parent add or remove spelling words from the game's
vocabulary at runtime, gated by a lightweight math-problem check, without
touching code or redeploying.

**Architecture:** A new localStorage-backed store (separate from the
game's existing Zustand `persist`/`partialize`) holds parent-added words
and hidden built-in words. A new pure function merges that against the
bundled `vocabulary.json` into an "effective vocabulary" that every
existing game-logic consumer (`pickNextWord`, `pickLetterForChunk` via the
word it checks against, `getTierRewardAction`) reads through instead of
the raw file. A new self-contained modal component (trigger button + math
gate + panel UI, following `SettingsModal.jsx`'s existing pattern exactly)
is the only new UI surface.

**Tech Stack:** React, Zustand (`persist` middleware), Vitest — same stack
as the rest of the project, no new dependencies.

## Global Constraints

- No backend, no server-side auth, no database — pure client-side
  `localStorage`, consistent with this project's static-SPA architecture
  (see `CLAUDE.md`, "Deployment").
- The math gate is friction, not security: single-digit × single-digit
  multiplication (`1-9 × 1-9`), generated fresh each time the gate opens,
  never stored. No PIN, no attempt limit, no lockout.
- Word-list persistence uses a **separate** localStorage key from the
  game's own `persist('obby-save-data', ...)` — do not add
  `addedWords`/`hiddenWords` to `partializeGameState` or the main game
  store's state shape.
- Tier auto-assignment by word length: ≤3 letters → `level_1`, 4 letters →
  `level_2`, 5+ letters → `level_3`. Matches the tier labels already shown
  in `LobbyUI.jsx`'s `levelOptions` (Level 1: Easy/3 Letters, Level 2:
  Medium/4 Letters, Level 3: Hard/5+ Letters).
- A tier must never be left with zero effective words — the panel must
  disable removing a tier's last remaining word.
- All pure decision logic (merge function, tier-assignment function) goes
  in `src/store/gameStore.logic.js`, matching that file's existing
  zero-React/zero-Zustand/zero-R3F pattern, and is unit-tested in
  `src/store/gameStore.logic.test.js` alongside the existing tests there.
- Words are stored/compared uppercase, consistent with `vocabulary.json`'s
  existing all-caps convention.

---

## File Structure

```
src/
├── store/
│   ├── gameStore.logic.js       # MODIFY: add getEffectiveVocabulary,
│   │                             # assignTierByLength
│   ├── gameStore.logic.test.js  # MODIFY: add tests for the two new
│   │                             # functions
│   ├── gameStore.js             # MODIFY: read through
│   │                             # getEffectiveVocabulary instead of raw
│   │                             # vocabData
│   └── customWordsStore.js      # CREATE: new Zustand store, its own
│                                 # persist(), holds addedWords/hiddenWords
├── components/
│   └── WordAdminPanel.jsx       # CREATE: trigger button + math gate +
│                                 # tier-tabbed word list UI
└── App.jsx                      # MODIFY: mount <WordAdminPanel />
    alongside the existing <SettingsModal /> / <ControlsModal />
```

**Responsibility boundaries:**
- `customWordsStore.js` owns *only* the parent's edits (added/hidden
  words) and their persistence — it knows nothing about tiers' word
  lengths, tier assignment, or merging logic.
- `gameStore.logic.js`'s new functions own the *decision logic*
  (how to merge, how to assign a tier) as plain, testable functions —
  they take plain data in, return plain data out, no store coupling.
- `gameStore.js` is the seam: it reads `customWordsStore`'s state and
  calls `getEffectiveVocabulary` once, then passes the merged result
  wherever it currently passes `vocabData`.
- `WordAdminPanel.jsx` is presentation only: reads/calls
  `customWordsStore`'s state/actions and renders the gate + panel. It does
  not implement merge or tier-assignment logic itself — it calls the pure
  functions.

---

### Task 1: Pure logic — effective vocabulary merge and tier assignment

**Files:**
- Modify: `src/store/gameStore.logic.js`
- Test: `src/store/gameStore.logic.test.js`

**Interfaces:**
- Consumes: nothing new (pure functions over plain data).
- Produces:
  - `assignTierByLength(word: string): 'level_1' | 'level_2' | 'level_3'`
  - `getEffectiveVocabulary(vocabData: object, customWords: {addedWords: {level_1: string[], level_2: string[], level_3: string[]}, hiddenWords: string[]}): object`
    — returns a new object shaped exactly like `vocabData` (same
    `tierReward` per tier, `words` array replaced by the merged list).
    Task 3 imports and calls both of these by these exact names.

- [ ] **Step 1: Write failing tests for `assignTierByLength`**

```js
// append to src/store/gameStore.logic.test.js
import { assignTierByLength, getEffectiveVocabulary } from './gameStore.logic.js'

describe('assignTierByLength', () => {
  it('assigns 3-letter-or-shorter words to level_1', () => {
    expect(assignTierByLength('CAT')).toBe('level_1')
    expect(assignTierByLength('GO')).toBe('level_1')
  })

  it('assigns 4-letter words to level_2', () => {
    expect(assignTierByLength('JUMP')).toBe('level_2')
  })

  it('assigns 5-or-more-letter words to level_3', () => {
    expect(assignTierByLength('SPACE')).toBe('level_3')
    expect(assignTierByLength('ROCKETSHIP')).toBe('level_3')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: FAIL — `assignTierByLength` not exported.

- [ ] **Step 3: Implement `assignTierByLength`**

```js
// append to src/store/gameStore.logic.js
export function assignTierByLength(word) {
  if (word.length <= 3) return 'level_1'
  if (word.length === 4) return 'level_2'
  return 'level_3'
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (3 new tests)

- [ ] **Step 5: Write failing tests for `getEffectiveVocabulary`**

```js
// append to src/store/gameStore.logic.test.js
describe('getEffectiveVocabulary', () => {
  const baseVocab = {
    level_1: { tierReward: { type: 'color', value: 'blue' }, words: ['CAT', 'DOG'] },
    level_2: { tierReward: { type: 'trail', value: 'orange' }, words: ['JUMP'] },
    level_3: { tierReward: { type: 'color', value: 'gold' }, words: ['SPACE'] },
  }

  it('passes through unchanged when no customization exists', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG'])
    expect(result.level_2.words).toEqual(['JUMP'])
    expect(result.level_3.words).toEqual(['SPACE'])
  })

  it('excludes a hidden built-in word', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: ['CAT'] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['DOG'])
  })

  it('includes an added word in its tier', () => {
    const customWords = { addedWords: { level_1: ['SUN'], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG', 'SUN'])
  })

  it('resolves a word both added and hidden as hidden (hidden wins)', () => {
    const customWords = { addedWords: { level_1: ['SUN'], level_2: [], level_3: [] }, hiddenWords: ['SUN'] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG'])
  })

  it('passes tierReward through unchanged', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.tierReward).toEqual({ type: 'color', value: 'blue' })
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: FAIL — `getEffectiveVocabulary` not exported.

- [ ] **Step 7: Implement `getEffectiveVocabulary`**

```js
// append to src/store/gameStore.logic.js
const TIERS = ['level_1', 'level_2', 'level_3']

export function getEffectiveVocabulary(vocabData, customWords) {
  const { addedWords, hiddenWords } = customWords
  const result = {}

  for (const tier of TIERS) {
    const builtin = vocabData[tier].words.filter((w) => !hiddenWords.includes(w))
    const added = (addedWords[tier] || []).filter((w) => !hiddenWords.includes(w))
    result[tier] = {
      tierReward: vocabData[tier].tierReward,
      words: [...builtin, ...added],
    }
  }

  return result
}
```

(The "hidden wins" resolution in the test above falls out naturally: both
`builtin` and `added` filter out anything in `hiddenWords`, so a word that
is simultaneously in `addedWords` and `hiddenWords` is excluded from both
sides of the merge.)

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (8 new tests total across both functions)

- [ ] **Step 9: Run the full existing suite to confirm no regressions**

Run: `npx vitest run`
Expected: PASS (existing 32 tests + 8 new = 40 tests, 0 failures, 0
warnings — see `CLAUDE.md`'s "Testing" section on why `jsdom` matters here;
no config change needed in this task, just confirming nothing broke)

- [ ] **Step 10: Commit**

```bash
git add src/store/gameStore.logic.js src/store/gameStore.logic.test.js
git commit -m "Add pure functions for effective vocabulary merge and tier assignment"
```

---

### Task 2: Custom words store (localStorage, separate from game state)

**Files:**
- Create: `src/store/customWordsStore.js`

**Interfaces:**
- Consumes: nothing (standalone Zustand store).
- Produces: `useCustomWordsStore` — a Zustand hook/store exposing:
  - State: `addedWords: {level_1: string[], level_2: string[], level_3: string[]}`, `hiddenWords: string[]`
  - Actions: `addWord(word: string, tier: string): void`,
    `removeAddedWord(word: string, tier: string): void`,
    `hideBuiltinWord(word: string): void`,
    `restoreDefaults(): void` (clears `hiddenWords` only, leaves
    `addedWords` untouched per spec §6).
  Task 3 imports `useCustomWordsStore` from this file by this exact name.

- [ ] **Step 1: Write the store**

```js
// src/store/customWordsStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCustomWordsStore = create(
  persist(
    (set) => ({
      addedWords: { level_1: [], level_2: [], level_3: [] },
      hiddenWords: [],

      addWord: (word, tier) => set((state) => {
        if (state.addedWords[tier].includes(word)) return state
        return {
          addedWords: {
            ...state.addedWords,
            [tier]: [...state.addedWords[tier], word],
          },
        }
      }),

      removeAddedWord: (word, tier) => set((state) => ({
        addedWords: {
          ...state.addedWords,
          [tier]: state.addedWords[tier].filter((w) => w !== word),
        },
      })),

      hideBuiltinWord: (word) => set((state) => (
        state.hiddenWords.includes(word)
          ? state
          : { hiddenWords: [...state.hiddenWords, word] }
      )),

      restoreDefaults: () => set({ hiddenWords: [] }),
    }),
    {
      name: 'obby-custom-vocab',
    }
  )
)
```

(No `partialize` needed here — unlike the main game store, every field in
this store is meant to persist; there's no transient/session-only state to
exclude.)

- [ ] **Step 2: Verify the store compiles and its shape is correct**

This store has no dedicated unit tests of its own — Task 1's tests already
cover the merge logic that consumes this store's data shape, and Task 5's
manual browser playtest exercises every one of this store's actions
(`addWord`, `removeAddedWord`, `hideBuiltinWord`, `restoreDefaults`)
end-to-end, including persistence across a page reload. Writing a third,
narrower layer of tests just for this store's internals would duplicate
both of those without adding real coverage.

Run: `npm run build`
Expected: compiles cleanly, confirming the file's imports/exports and
`persist(...)` usage are valid.

Run: `npx vitest run`
Expected: existing suite still passes (this task adds no new tests, so
the count should be unchanged from Task 1's final count).

- [ ] **Step 3: Commit**

```bash
git add src/store/customWordsStore.js
git commit -m "Add localStorage-backed custom words store"
```

---

### Task 3: Wire the effective vocabulary into gameStore.js

**Files:**
- Modify: `src/store/gameStore.js`

**Interfaces:**
- Consumes: `getEffectiveVocabulary` from `./gameStore.logic.js` (Task 1),
  `useCustomWordsStore` from `./customWordsStore.js` (Task 2).
- Produces: every place in `gameStore.js` that currently reads the raw
  `vocabData` import now reads the merged result instead. No new exports
  — this task changes internal wiring only.

- [ ] **Step 1: Read the current `src/store/gameStore.js` in full**

Confirm the exact current call sites before editing — `vocabData` is
currently referenced directly in: the top-level `targetWord` initializer
(line 25, `pickNextWord('level_1', [], vocabData)`), `progressLevel`
(via `pickLetterForChunk` — note: `pickLetterForChunk` takes `targetWord`
and `inventoryLength`, not `vocabData`, so it does NOT need the merged
vocab directly), `collectLetter`'s `applyCognitiveStrike` call, `getTierRewardAction`
call, and `pickNextWord` call, and `startGame`'s `pickNextWord` call.

- [ ] **Step 2: Add the import and a helper to compute the effective vocabulary on demand**

```js
// src/store/gameStore.js — add these imports at the top, alongside the existing ones
import { getChunkWeights, pickChunkType, applyCognitiveStrike, pickNextWord, getTierRewardAction, pickLetterForChunk, getEffectiveVocabulary } from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'
import { useCustomWordsStore } from './customWordsStore.js'

// add this helper function near the top of the file, after the imports:
function getCurrentVocab() {
  const customWords = useCustomWordsStore.getState()
  return getEffectiveVocabulary(vocabData, customWords)
}
```

(This computes the merge fresh on each call rather than memoizing — the
merge is cheap (a filter + spread over small arrays, at most a few dozen
words total) and correctness matters more than micro-optimizing a
rarely-hot path. Word list edits happen far less often than gameplay
frames, so there's no performance concern here.)

- [ ] **Step 3: Replace every direct `vocabData` reference with `getCurrentVocab()`**

```js
// Replace this line (the top-level targetWord initializer):
// targetWord: pickNextWord('level_1', [], vocabData),
// with:
targetWord: pickNextWord('level_1', [], getCurrentVocab()),
```

```js
// Inside collectLetter, replace:
// const result = applyCognitiveStrike(
//   { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
//   vocabData
// )
// with:
const result = applyCognitiveStrike(
  { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
  getCurrentVocab()
)
```

```js
// Still inside collectLetter (word-completed branch), replace:
// const reward = getTierRewardAction(state.currentTier, vocabData)
// ...
// const nextWord = pickNextWord(state.currentTier, newMastered, vocabData)
// with:
const currentVocab = getCurrentVocab()
const reward = getTierRewardAction(state.currentTier, currentVocab)
// ... (rewardPatch logic unchanged)
const nextWord = pickNextWord(state.currentTier, newMastered, currentVocab)
```

```js
// Inside startGame, replace:
// const nextWord = pickNextWord(tier, get().masteredWords, vocabData)
// with:
const nextWord = pickNextWord(tier, get().masteredWords, getCurrentVocab())
```

Leave `progressLevel`'s `pickLetterForChunk(state.targetWord, state.inventory.length)`
call unchanged — that function takes the target word string directly, not
a `vocabData`-shaped object, so it's unaffected by this change.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: all existing tests still pass. If any test in
`gameStore.test.js` directly asserts against the raw built-in
`vocabulary.json` word lists (e.g. expecting `pickNextWord` to only ever
return a hardcoded built-in word), it will still pass unmodified, since
with no custom words added/hidden, `getCurrentVocab()` returns the exact
same word lists as the raw `vocabData` (confirmed by Task 1's first test:
"passes through unchanged when no customization exists").

- [ ] **Step 5: Manual verification via build**

Run: `npm run build`
Expected: compiles cleanly, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.js
git commit -m "Read vocabulary through the effective (merged) vocab everywhere"
```

---

### Task 4: WordAdminPanel — math gate + tier-tabbed word management UI

**Files:**
- Create: `src/components/WordAdminPanel.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useCustomWordsStore` (Task 2) for state/actions;
  `getEffectiveVocabulary`, `assignTierByLength` (Task 1) for computing
  what to display and where a new word goes; `vocabData` (the raw JSON,
  to know which words are "built-in" vs. "added" for each tier, so the
  panel can tell whether removing a word should call `hideBuiltinWord` or
  `removeAddedWord`).
- Produces: `<WordAdminPanel />`, a self-contained component (mounts its
  own floating trigger button + modal, following `SettingsModal.jsx`'s
  exact pattern) — no props, no exports besides the component itself.

- [ ] **Step 1: Read the current `src/components/SettingsModal.jsx` in full**

This is the pattern to follow exactly: a component that renders a
`<>...</>` fragment containing (a) an absolutely-positioned floating
button that toggles local `useState` open/closed, and (b) a conditionally-
rendered fixed-position modal overlay with backdrop-click-to-close. Match
its visual style (dark semi-transparent panels, rounded corners,
`backdropFilter: 'blur(...)'`) so the new panel looks native to this UI,
not bolted on.

- [ ] **Step 2: Write the component**

```jsx
// src/components/WordAdminPanel.jsx
import { useState } from 'react'
import { useCustomWordsStore } from '../store/customWordsStore.js'
import { getEffectiveVocabulary, assignTierByLength } from '../store/gameStore.logic.js'
import vocabData from '../data/vocabulary.json'

const TIER_LABELS = {
  level_1: 'Level 1: Easy',
  level_2: 'Level 2: Medium',
  level_3: 'Level 3: Hard',
}

function generateMathProblem() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a * b }
}

export function WordAdminPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [problem, setProblem] = useState(generateMathProblem)
  const [answerInput, setAnswerInput] = useState('')
  const [gateError, setGateError] = useState('')
  const [activeTier, setActiveTier] = useState('level_1')
  const [newWordInput, setNewWordInput] = useState('')
  const [wordError, setWordError] = useState('')

  const addedWords = useCustomWordsStore((state) => state.addedWords)
  const hiddenWords = useCustomWordsStore((state) => state.hiddenWords)
  const addWord = useCustomWordsStore((state) => state.addWord)
  const removeAddedWord = useCustomWordsStore((state) => state.removeAddedWord)
  const hideBuiltinWord = useCustomWordsStore((state) => state.hideBuiltinWord)
  const restoreDefaults = useCustomWordsStore((state) => state.restoreDefaults)

  const effectiveVocab = getEffectiveVocabulary(vocabData, { addedWords, hiddenWords })

  function openPanel() {
    setIsOpen(true)
    setUnlocked(false)
    setProblem(generateMathProblem())
    setAnswerInput('')
    setGateError('')
  }

  function checkGate() {
    if (Number(answerInput) === problem.answer) {
      setUnlocked(true)
      setGateError('')
    } else {
      setGateError('Try again')
      setProblem(generateMathProblem())
      setAnswerInput('')
    }
  }

  function handleAddWord() {
    const word = newWordInput.trim().toUpperCase()
    if (!word) {
      setWordError('Enter a word')
      return
    }
    if (!/^[A-Z]+$/.test(word)) {
      setWordError('Letters only')
      return
    }
    const tier = assignTierByLength(word)
    if (effectiveVocab[tier].words.includes(word)) {
      setWordError('Already in the list')
      return
    }
    addWord(word, tier)
    setNewWordInput('')
    setWordError('')
    setActiveTier(tier)
  }

  function handleRemoveWord(word, tier) {
    const isBuiltin = vocabData[tier].words.includes(word)
    if (isBuiltin) {
      hideBuiltinWord(word)
    } else {
      removeAddedWord(word, tier)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={openPanel}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '24rem',
          zIndex: 30,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          padding: '0.6rem 1.1rem',
          borderRadius: '0.8rem',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span>🔒</span>
        <span>Word Admin</span>
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false)
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '1.2rem',
          border: '2px solid #374151',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.8rem',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🔒 Parent Access</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer' }}
          >
            ✖
          </button>
        </div>

        {!unlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ fontSize: '1.2rem' }}>
              What is {problem.a} × {problem.b}?
            </div>
            <input
              type="number"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkGate()}
              style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #4b5563', fontSize: '1rem' }}
            />
            {gateError && <div style={{ color: '#ef4444' }}>{gateError}</div>}
            <button
              onClick={checkGate}
              style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Unlock
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {Object.keys(TIER_LABELS).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: activeTier === tier ? '2px solid #3b82f6' : '1px solid #4b5563',
                    background: activeTier === tier ? 'rgba(59,130,246,0.2)' : '#111827',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {TIER_LABELS[tier]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {effectiveVocab[activeTier].words.map((word) => {
                const canRemove = effectiveVocab[activeTier].words.length > 1
                return (
                  <span
                    key={word}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#374151',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '0.5rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {word}
                    <button
                      onClick={() => canRemove && handleRemoveWord(word, activeTier)}
                      disabled={!canRemove}
                      title={canRemove ? 'Remove' : "Can't remove the last word in a tier"}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: canRemove ? '#ef4444' : '#6b7280',
                        cursor: canRemove ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                placeholder="Add a word..."
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #4b5563' }}
              />
              <button
                onClick={handleAddWord}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Add
              </button>
            </div>
            {wordError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{wordError}</div>}

            <button
              onClick={restoreDefaults}
              style={{ backgroundColor: '#374151', color: '#d1d5db', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Restore All Defaults
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Mount it in App.jsx**

```jsx
// src/App.jsx — add the import
import { WordAdminPanel } from './components/WordAdminPanel.jsx'

// add it as a sibling to the existing <SettingsModal /> / <ControlsModal />:
// <SettingsModal />
// <ControlsModal />
// <WordAdminPanel />
```

- [ ] **Step 4: Manual verification (no browser available in this environment — trace through the code)**

Read the finished `WordAdminPanel.jsx` and confirm, by tracing the code:
1. Opening the panel always shows the math gate first (`unlocked` starts
   `false` on every `openPanel()` call), never the word list directly.
2. A wrong answer clears the input and generates a new problem, not the
   same one repeated.
3. Adding a word that's a duplicate (case-insensitive, since input is
   uppercased before comparison) shows an error and does not call
   `addWord`.
4. Removing the last word in a tier is actually prevented — trace
   `canRemove` for a tier with exactly one word: `effectiveVocab[activeTier].words.length > 1`
   evaluates to `false`, disabling the button.
5. `handleRemoveWord` correctly distinguishes built-in vs. added words by
   checking against the RAW `vocabData` (not the merged `effectiveVocab`)
   — confirm this is intentional: checking against `effectiveVocab` would
   be wrong here since a hidden built-in word wouldn't appear in it at all
   in a way that could be re-hidden, but more importantly a word that's
   both a raw built-in AND has somehow been added would need the built-in
   check to fire — this shouldn't be reachable given the duplicate check
   in `handleAddWord`, but confirm the logic doesn't break if it happened.

Then also run:
Run: `npm run build`
Expected: compiles cleanly.

Run: `npx vitest run`
Expected: all existing tests still pass (this task adds no new automated
tests — it's a UI component, consistent with this project's testing
philosophy of not writing rendering tests; the logic it depends on is
already tested in Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/components/WordAdminPanel.jsx src/App.jsx
git commit -m "Add parent word admin panel with math-problem access gate"
```

---

### Task 5: Full manual verification and browser playtest

**Files:** none — this task is verification only.

- [ ] **Step 1: Start the dev server and open it in a real browser**

Run: `npm run dev`

Open the printed local URL in a browser (per `CLAUDE.md`: never open
`index.html` directly as a `file://` path — it must be served by Vite).

- [ ] **Step 2: Verify the trigger button appears and doesn't clash with existing UI**

In the Lobby screen, confirm the new "🔒 Word Admin" button is visible,
doesn't overlap the existing "⚙️ Settings" and "How to Play" buttons, and
looks visually consistent with them (dark translucent background, similar
sizing).

- [ ] **Step 3: Verify the math gate**

Click the Word Admin button. Confirm a random single-digit × single-digit
problem appears. Enter a wrong answer — confirm an error shows and a new
problem appears. Enter the correct answer (computed by hand) — confirm
the panel unlocks and shows the tier-tabbed word list.

- [ ] **Step 4: Verify add/remove**

Add a 3-letter word (e.g. "BEE") — confirm it appears under Level 1: Easy.
Add a 5-letter word (e.g. "HOUSE") — confirm it appears under Level 3:
Hard. Try adding "BEE" again — confirm the "Already in the list" error
shows and it isn't duplicated. Remove a word you just added — confirm it
disappears. Remove a built-in word (e.g. "CAT" from Level 1) — confirm it
disappears from the list.

- [ ] **Step 5: Verify persistence**

Refresh the browser page. Reopen the Word Admin panel (re-solving the math
gate). Confirm your added words are still there and "CAT" is still hidden
— this proves `localStorage` persistence under the `obby-custom-vocab` key
is actually working, not just in-memory for the session.

- [ ] **Step 6: Verify the last-word-removal guard**

Pick a tier and remove words down to exactly one remaining. Confirm the
✕ button on that last word is disabled (grayed out, tooltip explains why),
and cannot be clicked to remove it.

- [ ] **Step 7: Verify "Restore All Defaults"**

With at least one built-in word hidden, click "Restore All Defaults".
Confirm all previously-hidden built-in words reappear. Confirm any
parent-added words are NOT removed by this action (only hidden words are
restored, per spec §6).

- [ ] **Step 8: Verify the added word actually appears in real gameplay**

Click PLAY, select the tier you added a word to as the difficulty, and
play until the target word cycles to your added word (or note it directly
via the HUD/console) — confirm your custom word is actually selectable as
a `targetWord` during real play, not just visible in the admin panel.
This is the end-to-end proof that Task 3's wiring (`gameStore.js` reading
through `getCurrentVocab()`) actually reaches gameplay.

- [ ] **Step 9: Final full-suite check and commit**

Run: `npx vitest run` and `npm run build` one more time to confirm the
final state is clean.

```bash
git add -A
git commit -m "Verify parent word admin panel end-to-end" --allow-empty
```

(Use `--allow-empty` since this task makes no code changes — it exists to
mark the verification milestone in history if no fixes were needed during
manual testing. If Step 1-8 surfaced a bug, fix it first, then this final
commit captures the actual fix and isn't empty.)
