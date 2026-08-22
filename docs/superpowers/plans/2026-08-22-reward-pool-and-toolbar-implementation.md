# Reward Pool Variety + Toolbar Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single fixed cosmetic reward per difficulty tier with
a per-tier pool of rewards (so repeat word completions grant variety
instead of duplicate no-ops), fix the celebration banner to key off an
actual completion event rather than `targetWord` identity, and consolidate
three independently-floating, always-visible toolbar buttons (Settings,
Controls, Word Admin) into a single lobby-only dropdown menu.

**Architecture:** Two independent phases sharing no code dependency between
them (they touch overlapping files but not overlapping logic — safe to
build in either order, done here as reward-pool first since it's the
higher-value bug fix). Phase 1 (Tasks 1-3): `vocabulary.json`'s per-tier
`tierReward` becomes `rewardPool` (an array); a new pure `pickReward`
function in `gameStore.logic.js` selects an unowned reward preferentially,
falling back to a random already-owned one only once the pool is
exhausted; `gameStore.js`'s `collectLetter` records the actual grant
(`lastReward`, `rewardEventId`) as transient state; `OverlayUI.jsx`'s
celebration effect watches `rewardEventId` instead of `targetWord`
(fixing a false-positive-on-downgrade bug) and renders the real reward.
Phase 2 (Tasks 4-5): `SettingsModal.jsx`, `ControlsModal.jsx`, and
`WordAdminPanel.jsx` become controlled components (`isOpen`/`onClose`
props, no self-mounted trigger button); a new `TopMenu.jsx` owns the
single trigger button, the dropdown, and which panel (if any) is open,
mounted in place of the three components in `App.jsx`.

**Tech Stack:** React, Zustand, Vitest — same stack as the rest of the
project, no new dependencies.

## Global Constraints

- `pickReward` and all other tier/word-selection decision logic lives in
  `src/store/gameStore.logic.js`, matching that file's existing
  zero-React/zero-Zustand/zero-R3F pure-function pattern, and is unit
  tested in `src/store/gameStore.logic.test.js`.
- A reward is only pushed into `unlockedColors`/`unlockedTrails` when it's
  genuinely new to the player (`isNew: true`) — once a tier's whole reward
  pool is owned, completions re-equip a random already-owned item rather
  than duplicating an array entry. This is the core bug fix motivating
  Phase 1; do not regress to unconditional pushing.
- The celebration banner must fire on an actual word completion only —
  never on a cognitive-strike tier downgrade (which also changes
  `targetWord` but is not a completion). Do not key the celebration
  effect off `targetWord` identity; use the dedicated `rewardEventId`
  counter instead.
- `lastReward` and `rewardEventId` are transient, session-only state —
  excluded from `partializeGameState` in `src/store/gameStore.js` (do not
  add them to the persisted fields).
- Phase 2's three panel components (`SettingsModal`, `ControlsModal`,
  `WordAdminPanel`) must not regress any existing behavior when converted
  to controlled components — in particular, `WordAdminPanel`'s math-gate
  reset (fresh problem, cleared input, cleared error) must still happen
  every time the panel opens, and its existing `gameState === 'lobby'` gate
  (added in a prior fix) must be preserved or superseded correctly by
  `TopMenu`'s own lobby-only gating (not both silently fighting each
  other).
- `TopMenu` renders only when `gameState === 'lobby'` — Settings/Controls/
  Word Admin are pre-game or parent-only concerns with no reason to be on
  screen mid-run.

---

## File Structure

```
src/
├── data/
│   └── vocabulary.json          # MODIFY: tierReward -> rewardPool (array)
│                                  # per tier
├── store/
│   ├── gameStore.logic.js       # MODIFY: remove getTierRewardAction, add
│   │                              # getRewardPool + pickReward
│   ├── gameStore.logic.test.js  # MODIFY: replace getTierRewardAction
│   │                              # tests with pickReward tests, update
│   │                              # getEffectiveVocabulary fixtures
│   ├── gameStore.js             # MODIFY: collectLetter uses pickReward,
│   │                              # records lastReward/rewardEventId
│   └── gameStore.test.js        # MODIFY: update reward-completion test,
│                                  # add pool-exhaustion + event-id tests
├── components/
│   ├── LobbyUI.jsx              # MODIFY: COLOR_NAMES/new TRAIL_NAMES
│   │                              # maps for the new reward-pool values
│   ├── OverlayUI.jsx             # MODIFY: celebration effect + banner
│   │                              # keyed off rewardEventId, real
│   │                              # rewardPop keyframe (fadeIn was
│   │                              # referenced but never defined)
│   ├── SettingsModal.jsx        # MODIFY: controlled component
│   ├── ControlsModal.jsx        # MODIFY: controlled component
│   ├── WordAdminPanel.jsx       # MODIFY: controlled component
│   └── TopMenu.jsx              # CREATE: single trigger + dropdown +
│                                  # panel-open state, mounts the three
│                                  # panels above
└── App.jsx                      # MODIFY: replace 3 imports/mounts with
                                   # one <TopMenu />
```

**Responsibility boundaries:**
- `gameStore.logic.js`'s `pickReward` is a pure function: given a tier, the
  player's current unlocked sets, and the vocab data, it returns a reward
  decision — it does not know about Zustand, React, or how the caller
  applies that decision to state.
- `gameStore.js`'s `collectLetter` owns *applying* the pure decision to
  state (whether to push into `unlockedColors`/`unlockedTrails`, what to
  equip, what to record for the celebration to observe) — it does not
  reimplement the selection logic itself.
- `OverlayUI.jsx` only *observes* `lastReward`/`rewardEventId` and renders
  a celebration — it has no reward-selection logic of its own.
- `TopMenu.jsx` owns menu-open/panel-open UI state and gameState gating;
  `SettingsModal`/`ControlsModal`/`WordAdminPanel` only own their own
  panel's internal content and behavior once told to be open — none of the
  three know about each other or about the menu that opens them.

---

### Task 1: Reward pool data + pure `pickReward` function

**Files:**
- Modify: `src/data/vocabulary.json`
- Modify: `src/store/gameStore.logic.js`
- Modify: `src/store/gameStore.logic.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `getRewardPool(tier: string, vocabData: object): Array<{type: 'color'|'trail', value: string, label: string}>`
  - `pickReward(tier: string, unlocked: {colors: string[], trails: string[]}, vocabData: object): {type, value, label, isNew: boolean}`
  - Task 2 imports and calls `pickReward` by this exact name/signature.
  - `getEffectiveVocabulary` (already exists) must be updated to pass
    through `rewardPool` instead of `tierReward` per tier — Task 2/3 rely
    on tier objects shaped `{rewardPool: [...], words: [...]}`, not
    `{tierReward: {...}, words: [...]}`.

- [ ] **Step 1: Replace `vocabulary.json`'s `tierReward` with `rewardPool`**

Read the current file first — confirm it still has exactly this shape
before editing (three tiers, each with a single `tierReward` object and a
`words` array):

```json
{
  "level_1": {
    "tierReward": { "type": "color", "value": "blue" },
    "words": ["CAT", "DOG", "SUN", "HAT", "ONE", "TWO", "SIX", "TEN"]
  },
  "level_2": {
    "tierReward": { "type": "trail", "value": "orange" },
    "words": ["JUMP", "FAST", "BIRD", "STAR", "FOUR", "FIVE", "NINE"]
  },
  "level_3": {
    "tierReward": { "type": "color", "value": "gold" },
    "words": ["SPACE", "ROCKET", "PLANET", "THREE", "SEVEN", "EIGHT"]
  }
}
```

Replace the whole file with:

```json
{
  "level_1": {
    "rewardPool": [
      { "type": "color", "value": "#fb7185", "label": "Coral Blush" },
      { "type": "color", "value": "#fde047", "label": "Lemon Sparkle" },
      { "type": "color", "value": "#a3e635", "label": "Lime Zest" },
      { "type": "color", "value": "#5eead4", "label": "Aqua Mint" },
      { "type": "color", "value": "#93c5fd", "label": "Sky Powder" },
      { "type": "color", "value": "#d8b4fe", "label": "Lilac Dream" },
      { "type": "color", "value": "#fdba74", "label": "Peach Glow" },
      { "type": "color", "value": "#f9a8d4", "label": "Cotton Candy" }
    ],
    "words": ["CAT", "DOG", "SUN", "HAT", "ONE", "TWO", "SIX", "TEN"]
  },
  "level_2": {
    "rewardPool": [
      { "type": "trail", "value": "#fb923c", "label": "Sunset Streak" },
      { "type": "trail", "value": "#4ade80", "label": "Emerald Streak" },
      { "type": "trail", "value": "#38bdf8", "label": "Sky Streak" },
      { "type": "trail", "value": "#f472b6", "label": "Bubblegum Streak" },
      { "type": "trail", "value": "#a78bfa", "label": "Violet Streak" },
      { "type": "trail", "value": "#22d3ee", "label": "Aqua Streak" },
      { "type": "trail", "value": "#fbbf24", "label": "Amber Streak" }
    ],
    "words": ["JUMP", "FAST", "BIRD", "STAR", "FOUR", "FIVE", "NINE"]
  },
  "level_3": {
    "rewardPool": [
      { "type": "color", "value": "#eab308", "label": "Champion Gold" },
      { "type": "trail", "value": "#f43f5e", "label": "Ruby Blaze" },
      { "type": "color", "value": "#0ea5e9", "label": "Sapphire Shine" },
      { "type": "trail", "value": "#a855f7", "label": "Amethyst Rush" },
      { "type": "color", "value": "#059669", "label": "Jade Legend" },
      { "type": "trail", "value": "#db2777", "label": "Magenta Comet" },
      { "type": "color", "value": "#7c3aed", "label": "Cosmic Violet" },
      { "type": "trail", "value": "#f59e0b", "label": "Solar Flare" }
    ],
    "words": ["SPACE", "ROCKET", "PLANET", "THREE", "SEVEN", "EIGHT"]
  }
}
```

- [ ] **Step 2: Update `getEffectiveVocabulary` to pass through `rewardPool`**

Read the current `src/store/gameStore.logic.js` in full first — locate the
`getEffectiveVocabulary` function's `result[tier] = { tierReward: ..., words: ... }`
line and change `tierReward: vocabData[tier].tierReward` to
`rewardPool: vocabData[tier].rewardPool`. Do not touch anything else in
that function — the builtin/added/hidden merge logic for `words` is
unrelated to this change and must stay exactly as-is.

- [ ] **Step 3: Write failing tests for `pickReward`**

Read the current `src/store/gameStore.logic.test.js` in full first. Locate
the `describe('getTierRewardAction', ...)` block — you will replace it
entirely with the block below (do not leave the old block in place
alongside the new one; `getTierRewardAction` is being removed from
`gameStore.logic.js` in Step 4, so its test must go too, not just be
supplemented):

```js
// replace the entire describe('getTierRewardAction', ...) block with:
describe('pickReward', () => {
  const noneUnlocked = { colors: [], trails: [] }

  it("returns a reward from the tier's pool", () => {
    const reward = pickReward('level_1', noneUnlocked, vocabData)
    expect(vocabData.level_1.rewardPool.map((r) => r.value)).toContain(reward.value)
    expect(reward.type).toBe('color')
  })

  it('marks the reward isNew when the player does not already have it', () => {
    const reward = pickReward('level_1', noneUnlocked, vocabData)
    expect(reward.isNew).toBe(true)
  })

  it('never returns a reward the player already owns while locked ones remain', () => {
    const pool = vocabData.level_2.rewardPool // all type: trail
    const ownsAllButOne = { colors: [], trails: pool.slice(0, -1).map((r) => r.value) }
    const lastLocked = pool[pool.length - 1].value

    for (let i = 0; i < 20; i++) {
      const reward = pickReward('level_2', ownsAllButOne, vocabData)
      expect(reward.value).toBe(lastLocked)
      expect(reward.isNew).toBe(true)
    }
  })

  it('falls back to a random already-owned reward (isNew: false) once the whole pool is unlocked', () => {
    const pool = vocabData.level_1.rewardPool
    const ownsEverything = { colors: pool.map((r) => r.value), trails: [] }
    const reward = pickReward('level_1', ownsEverything, vocabData)
    expect(pool.map((r) => r.value)).toContain(reward.value)
    expect(reward.isNew).toBe(false)
  })
})
```

Also update the import line at the top of the file: replace
`getTierRewardAction` with `pickReward` in the destructured import from
`./gameStore.logic.js`.

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: FAIL — `pickReward` not exported yet.

- [ ] **Step 5: Implement `getRewardPool` and `pickReward`, remove `getTierRewardAction`**

In `src/store/gameStore.logic.js`, find and DELETE this function entirely:

```js
export function getTierRewardAction(tier, vocabData) {
  return vocabData[tier].tierReward
}
```

Replace it with:

```js
// Picks a reward for completing a word in `tier`. `unlocked` is
// { colors: string[], trails: string[] } — the player's current unlocked
// sets, used to prefer a reward the player doesn't have yet over the
// tier's whole pool.
//
// Returns { type, value, label, isNew }. `isNew` tells the caller whether
// to actually push `value` into the relevant unlocked array (true) or just
// re-equip an already-owned item as a "remix" once every reward in the
// tier's pool has been claimed (false) — this is what prevents repeat
// completions from pushing duplicate entries into
// unlockedColors/unlockedTrails.
export function getRewardPool(tier, vocabData) {
  return vocabData[tier].rewardPool
}

export function pickReward(tier, unlocked, vocabData) {
  const pool = getRewardPool(tier, vocabData)

  const isUnlocked = (reward) =>
    (reward.type === 'color' ? unlocked.colors : unlocked.trails).includes(reward.value)

  const locked = pool.filter((reward) => !isUnlocked(reward))
  const candidates = locked.length > 0 ? locked : pool
  const reward = candidates[Math.floor(Math.random() * candidates.length)]

  return { ...reward, isNew: locked.length > 0 }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS. Some of the existing `getEffectiveVocabulary` tests will
now FAIL because their fixtures still use `tierReward` — this is expected
and fixed in Step 7, not a regression to chase down yet.

- [ ] **Step 7: Update `getEffectiveVocabulary`'s test fixtures**

In the same test file, find the `describe('getEffectiveVocabulary', ...)`
block's `baseVocab` fixture:

```js
// current (to be replaced):
const baseVocab = {
  level_1: { tierReward: { type: 'color', value: 'blue' }, words: ['CAT', 'DOG'] },
  level_2: { tierReward: { type: 'trail', value: 'orange' }, words: ['JUMP'] },
  level_3: { tierReward: { type: 'color', value: 'gold' }, words: ['SPACE'] },
}
```

Replace with:

```js
const baseVocab = {
  level_1: { rewardPool: [{ type: 'color', value: '#0000ff', label: 'Blue' }], words: ['CAT', 'DOG'] },
  level_2: { rewardPool: [{ type: 'trail', value: '#ffa500', label: 'Orange' }], words: ['JUMP'] },
  level_3: { rewardPool: [{ type: 'color', value: '#ffd700', label: 'Gold' }], words: ['SPACE'] },
}
```

Then find the test `it('passes tierReward through unchanged', ...)` and
replace it entirely with:

```js
it('passes rewardPool through unchanged', () => {
  const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: [] }
  const result = getEffectiveVocabulary(baseVocab, customWords)
  expect(result.level_1.rewardPool).toEqual([{ type: 'color', value: '#0000ff', label: 'Blue' }])
})
```

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including every other pre-existing
`getEffectiveVocabulary` test (they only assert on `.words`, not on
`.tierReward`/`.rewardPool`, so they're unaffected by this data-shape
change — confirm this is actually true by reading them, don't just assume).

- [ ] **Step 9: Run the build**

Run: `npm run build`
Expected: compiles cleanly (confirms `vocabulary.json`'s new shape is
valid JSON and nothing else in the codebase still expects `.tierReward` at
build-analysis time — though the real cross-file check happens in Task 2).

- [ ] **Step 10: Commit**

```bash
git add src/data/vocabulary.json src/store/gameStore.logic.js src/store/gameStore.logic.test.js
git commit -m "Replace fixed tier reward with a reward pool + pickReward selection"
```

---

### Task 2: Wire `pickReward` into `collectLetter`, add celebration-tracking state

**Files:**
- Modify: `src/store/gameStore.js`
- Modify: `src/store/gameStore.test.js`

**Interfaces:**
- Consumes: `pickReward` from `./gameStore.logic.js` (Task 1).
- Produces: two new store fields, `lastReward: {word, type, value, label, isNew} | null`
  and `rewardEventId: number` (starts at 0, increments by 1 on every real
  word completion). Task 3 (`OverlayUI.jsx`) reads both of these by these
  exact names.

- [ ] **Step 1: Read the current `src/store/gameStore.js` in full**

Confirm the exact current shape of `collectLetter`'s word-completed branch
before editing — it currently calls `getTierRewardAction` (which no
longer exists after Task 1) and unconditionally pushes into
`unlockedColors`/`unlockedTrails`. You are replacing that call and that
unconditional push, not adding alongside it.

- [ ] **Step 2: Write failing tests**

Read the current `src/store/gameStore.test.js` in full first, then find
the existing test `it('applies the cosmetic reward on word completion', ...)`
inside the `describe('collectLetter', ...)` block and replace it entirely
with:

```js
import vocabData from '../data/vocabulary.json'
// (add this import near the top of the file if not already present)

// replace the existing 'applies the cosmetic reward on word completion' test with:
it("applies a cosmetic reward from the tier's pool on word completion", () => {
  useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
  useGameStore.getState().collectLetter('T')
  const state = useGameStore.getState()
  const poolValues = vocabData.level_1.rewardPool.map((r) => r.value)
  expect(poolValues).toContain(state.equippedColor)
  expect(state.unlockedColors).toContain(state.equippedColor)
  // Started with the default 12-color unlockedColors array (none of which
  // are in the level_1 pool), so this is always a fresh unlock, not a
  // duplicate re-push.
  expect(state.unlockedColors).toHaveLength(13)
})

it('does not grow unlockedColors once the whole tier reward pool is already owned', () => {
  const allPoolValues = vocabData.level_1.rewardPool.map((r) => r.value)
  const currentColors = useGameStore.getState().unlockedColors
  useGameStore.setState({ unlockedColors: [...currentColors, ...allPoolValues] })
  useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
  useGameStore.getState().collectLetter('T')
  const state = useGameStore.getState()
  // Pool exhausted -> pickReward returns isNew: false -> no push, just a
  // re-equip.
  expect(state.unlockedColors).toHaveLength(currentColors.length + allPoolValues.length)
  expect(allPoolValues).toContain(state.equippedColor)
})

it('records lastReward and bumps rewardEventId on real word completion', () => {
  useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0, rewardEventId: 0 })
  useGameStore.getState().collectLetter('T')
  const state = useGameStore.getState()
  expect(state.rewardEventId).toBe(1)
  expect(state.lastReward).toMatchObject({ word: 'CAT', isNew: true })
})

it('does NOT bump rewardEventId on a cognitive-strike downgrade (no reward granted)', () => {
  useGameStore.setState({
    inventory: [], targetWord: 'CAT', currentTier: 'level_2',
    cognitiveStrikes: 2, rewardEventId: 0, lastReward: null,
  })
  useGameStore.getState().collectLetter('X') // decoy -> 3rd strike -> downgrade, not a completion
  const state = useGameStore.getState()
  expect(state.currentTier).toBe('level_1') // downgrade did happen
  expect(state.rewardEventId).toBe(0) // but no reward event fired
  expect(state.lastReward).toBeNull()
})
```

Note: the first new test asserts `unlockedColors` has length 13. This has
been confirmed against the current codebase: `gameStore.js`'s initial
`unlockedColors` array has exactly 12 entries (verified by direct count),
so 12 + 1 newly-unlocked pool color = 13 is correct as written. If your
read of the current file shows a different count (e.g. another concurrent
change added/removed a default color since this plan was written),
recompute as (actual count + 1) and note the discrepancy in your report —
but treat 13 as the expected, verified value unless you find otherwise.

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: FAIL — `lastReward`/`rewardEventId` don't exist yet, and
`collectLetter` still calls the now-removed `getTierRewardAction`
(this will actually throw, not just fail an assertion — confirm the
failure mode you see and note it in your report).

- [ ] **Step 4: Add `lastReward`/`rewardEventId` state fields**

In `src/store/gameStore.js`, find the state field block (near
`sessionCoins: 0, totalCoins: 0,`) and add, right after `totalCoins: 0,`:

```js
  // Transient, session-only celebration data (never persisted). `lastReward`
  // describes the reward actually granted on the most recent word
  // completion; `rewardEventId` is a monotonic counter OverlayUI watches to
  // trigger the celebration exactly once per real completion — it must NOT
  // be bumped on a cognitive-downgrade targetWord change (see collectLetter).
  lastReward: null,
  rewardEventId: 0,
```

- [ ] **Step 5: Update the import line**

Change:
```js
import { getChunkWeights, pickChunkType, applyCognitiveStrike, pickNextWord, getTierRewardAction, pickLetterForChunk, getEffectiveVocabulary } from './gameStore.logic.js'
```
to:
```js
import { getChunkWeights, pickChunkType, applyCognitiveStrike, pickNextWord, pickReward, pickLetterForChunk, getEffectiveVocabulary } from './gameStore.logic.js'
```

- [ ] **Step 6: Rewrite `collectLetter`'s word-completed branch**

Find this block (the exact current contents, read the file to confirm
before replacing):

```js
      const currentVocab = getCurrentVocab()
      const reward = getTierRewardAction(state.currentTier, currentVocab)
      const rewardPatch = reward.type === 'color'
        ? { unlockedColors: [...state.unlockedColors, reward.value], equippedColor: reward.value }
        : { unlockedTrails: [...state.unlockedTrails, reward.value], equippedTrail: reward.value }

      const nextWord = pickNextWord(state.currentTier, newMastered, currentVocab)

      return {
        inventory: [],
        cognitiveStrikes: 0,
        mechanicalDeaths: 0,
        masteredWords: newMastered,
        targetWord: nextWord,
        ...rewardPatch,
      }
```

Replace with:

```js
      const currentVocab = getCurrentVocab()
      const reward = pickReward(
        state.currentTier,
        { colors: state.unlockedColors, trails: state.unlockedTrails },
        currentVocab
      )
      // Only push into the unlocked array on a genuinely new reward — once a
      // tier's whole pool is owned, `pickReward` returns isNew: false and we
      // just re-equip an already-owned item instead of adding a duplicate.
      const rewardPatch = reward.type === 'color'
        ? {
            unlockedColors: reward.isNew ? [...state.unlockedColors, reward.value] : state.unlockedColors,
            equippedColor: reward.value,
          }
        : {
            unlockedTrails: reward.isNew ? [...state.unlockedTrails, reward.value] : state.unlockedTrails,
            equippedTrail: reward.value,
          }

      const nextWord = pickNextWord(state.currentTier, newMastered, currentVocab)

      return {
        inventory: [],
        cognitiveStrikes: 0,
        mechanicalDeaths: 0,
        masteredWords: newMastered,
        targetWord: nextWord,
        lastReward: { word: state.targetWord, ...reward },
        rewardEventId: state.rewardEventId + 1,
        ...rewardPatch,
      }
```

Note `lastReward.word` is captured from `state.targetWord` (the word that
was JUST completed), not `nextWord` (the one that's about to start) — this
matters for the celebration banner in Task 3, which needs to say which
word was completed, not which word comes next.

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: PASS (all 4 new/replaced tests plus all pre-existing tests in
this file).

- [ ] **Step 8: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass, no regressions in `gameStore.logic.test.js` from
Task 1 either.

- [ ] **Step 9: Run the build**

Run: `npm run build`
Expected: compiles cleanly.

- [ ] **Step 10: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js
git commit -m "Record reward grants as transient lastReward/rewardEventId state"
```

---

### Task 3: Celebration banner keyed off rewardEventId, real reward display, color/trail name maps

**Files:**
- Modify: `src/components/OverlayUI.jsx`
- Modify: `src/components/LobbyUI.jsx`

**Interfaces:**
- Consumes: `lastReward`, `rewardEventId` from the store (Task 2).
- Produces: no new exports — this is a leaf UI task.

- [ ] **Step 1: Read the current `src/components/OverlayUI.jsx` in full**

Confirm the exact current shape of the `OverlayUI` component's state reads,
refs, and the "Word completed celebration" `useEffect` + its rendered
banner JSX before editing. Note specifically: the celebration effect
currently watches `targetWord` via a `prevTargetWord` ref, and the banner's
`animation: 'fadeIn 0.2s'` references a `@keyframes fadeIn` that is NOT
defined anywhere in this file or the codebase (confirmed: grep for
`@keyframes fadeIn` across `src/` returns nothing) — so the celebration
banner currently renders instantly with no animation at all, despite the
`animation` CSS property being set. You are fixing this as part of this
task by defining a real keyframe animation, not just changing the trigger
condition.

- [ ] **Step 2: Replace the store reads and refs**

Find:
```js
  const targetWord = useGameStore((state) => state.targetWord)
```
Replace with:
```js
  const lastReward = useGameStore((state) => state.lastReward)
  const rewardEventId = useGameStore((state) => state.rewardEventId)
```

Find:
```js
  const prevTargetWord = useRef(targetWord)
```
Replace with:
```js
  const prevRewardEventId = useRef(rewardEventId)
```

Find:
```js
  const [celebrationMessage, setCelebrationMessage] = useState(null)
```
Replace with:
```js
  const [celebration, setCelebration] = useState(null)
```

- [ ] **Step 3: Replace the celebration `useEffect`**

Find:
```js
  // Word completed celebration
  useEffect(() => {
    if (prevTargetWord.current && prevTargetWord.current !== targetWord && gameState === 'playing') {
      playWin()
      setCelebrationMessage(`🎉 WORD COMPLETED: ${prevTargetWord.current}! Reward Unlocked!`)
      const timeout = setTimeout(() => setCelebrationMessage(null), 2500)
      prevTargetWord.current = targetWord
      return () => clearTimeout(timeout)
    }
    prevTargetWord.current = targetWord
  }, [targetWord, gameState, playWin])
```

Replace with:
```js
  // Word completed celebration — keyed off rewardEventId (bumped ONLY in
  // gameStore's word-completion branch), not off targetWord changing. A
  // cognitive-strike downgrade also changes targetWord without completing a
  // word; watching targetWord directly (the old approach) fired this same
  // "WORD COMPLETED! Reward Unlocked!" banner on a downgrade too, a false
  // positive. rewardEventId only advances on an actual completion.
  useEffect(() => {
    if (rewardEventId !== prevRewardEventId.current && lastReward && gameState === 'playing') {
      playWin()
      setCelebration(lastReward)
      const timeout = setTimeout(() => setCelebration(null), 3200)
      prevRewardEventId.current = rewardEventId
      return () => clearTimeout(timeout)
    }
    prevRewardEventId.current = rewardEventId
  }, [rewardEventId, lastReward, gameState, playWin])
```

- [ ] **Step 4: Add a real keyframe animation and replace the celebration banner JSX**

Find the JSX section that starts with (locate the exact current opening —
it's the first thing rendered inside `{gameState === 'playing' && (<>`):
```jsx
          <WordProgressHUD />
```

Insert a `<style>` block with real keyframes immediately before it:
```jsx
          <style>{`
            @keyframes rewardPop {
              0% { transform: scale(0.6); opacity: 0; }
              60% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>

          <WordProgressHUD />
```

Then find the celebration banner block:
```jsx
          {/* Celebration Banner */}
          {celebrationMessage && (
            <div style={{
              position: 'absolute',
              top: '8rem',
              backgroundColor: 'rgba(22, 163, 74, 0.95)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '1.2rem',
              fontSize: '1.35rem',
              fontWeight: 'bold',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              border: '3px solid #86efac',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              animation: 'fadeIn 0.2s',
            }}>
              <div>{celebrationMessage}</div>
              <div style={{ fontSize: '0.95rem', color: '#bbf7d0', fontWeight: 'normal' }}>
                ⭐ Added to your Mastered Trophy Shelf & Unlocked New Outfit!
              </div>
            </div>
          )}
```

Replace entirely with:
```jsx
          {/* Celebration Banner */}
          {celebration && (
            <div style={{
              position: 'absolute',
              top: '7rem',
              backgroundColor: 'rgba(22, 163, 74, 0.97)',
              color: 'white',
              padding: '1.2rem 2.4rem',
              borderRadius: '1.4rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 0 0 6px rgba(134, 239, 172, 0.25)',
              border: '3px solid #86efac',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'rewardPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                🎉 WORD COMPLETED: {celebration.word}!
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '0.5rem 1rem',
                borderRadius: '0.9rem',
              }}>
                <span style={{
                  width: '1.6rem',
                  height: '1.6rem',
                  borderRadius: '50%',
                  backgroundColor: celebration.value,
                  border: '2px solid white',
                  boxShadow: `0 0 14px ${celebration.value}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
                  {celebration.isNew
                    ? `New ${celebration.type === 'trail' ? 'Trail' : 'Outfit'}: ${celebration.label}!`
                    : `Bonus Remix: ${celebration.label}!`}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#bbf7d0', fontWeight: 'normal' }}>
                {celebration.isNew
                  ? '⭐ Added to your Mastered Trophy Shelf & Outfit Closet!'
                  : '⭐ Added to your Mastered Trophy Shelf — equipped as a fresh look!'}
              </div>
            </div>
          )}
```

Do NOT touch the separate "Wrong Letter Alert Banner" block just above
this one — it also references `animation: 'fadeIn 0.2s'` and is equally
undefined, but fixing that is out of scope for this task (it's a
pre-existing, unrelated issue affecting a different banner).

- [ ] **Step 5: Update `LobbyUI.jsx`'s color/trail name maps for the new pool values**

Read the current `src/components/LobbyUI.jsx` in full first. Find the
`COLOR_NAMES` object:

```js
const COLOR_NAMES = {
  '#ff1493': 'Neon Pink',
  'hotpink': 'Neon Pink',
  '#00e5ff': 'Electric Cyan',
  '#10b981': 'Emerald Green',
  '#8b5cf6': 'Royal Purple',
  '#f97316': 'Blaze Orange',
  '#facc15': 'Sunburst Gold',
  '#ef4444': 'Crimson Red',
  '#14b8a6': 'Diamond Teal',
  '#6366f1': 'Cosmic Indigo',
  '#ec4899': 'Bubblegum Pink',
  '#1e293b': 'Stealth Midnight',
  '#f8fafc': 'Cloud White',
  'blue': 'Electric Blue',
  'gold': 'Champion Gold',
}
```

Replace the last two lines (`'blue': ...`, `'gold': ...` — these were the
old fixed-tier-reward values, now dead since the reward pool uses hex
values instead) and add the new reward-pool color entries, plus a new
`TRAIL_NAMES` map:

```js
const COLOR_NAMES = {
  '#ff1493': 'Neon Pink',
  'hotpink': 'Neon Pink',
  '#00e5ff': 'Electric Cyan',
  '#10b981': 'Emerald Green',
  '#8b5cf6': 'Royal Purple',
  '#f97316': 'Blaze Orange',
  '#facc15': 'Sunburst Gold',
  '#ef4444': 'Crimson Red',
  '#14b8a6': 'Diamond Teal',
  '#6366f1': 'Cosmic Indigo',
  '#ec4899': 'Bubblegum Pink',
  '#1e293b': 'Stealth Midnight',
  '#f8fafc': 'Cloud White',
  // Level 1 reward-pool colors (src/data/vocabulary.json)
  '#fb7185': 'Coral Blush',
  '#fde047': 'Lemon Sparkle',
  '#a3e635': 'Lime Zest',
  '#5eead4': 'Aqua Mint',
  '#93c5fd': 'Sky Powder',
  '#d8b4fe': 'Lilac Dream',
  '#fdba74': 'Peach Glow',
  '#f9a8d4': 'Cotton Candy',
  // Level 3 reward-pool colors
  '#eab308': 'Champion Gold',
  '#0ea5e9': 'Sapphire Shine',
  '#059669': 'Jade Legend',
  '#7c3aed': 'Cosmic Violet',
}

const TRAIL_NAMES = {
  // Level 2 reward-pool trails
  '#fb923c': 'Sunset Streak',
  '#4ade80': 'Emerald Streak',
  '#38bdf8': 'Sky Streak',
  '#f472b6': 'Bubblegum Streak',
  '#a78bfa': 'Violet Streak',
  '#22d3ee': 'Aqua Streak',
  '#fbbf24': 'Amber Streak',
  // Level 3 reward-pool trails
  '#f43f5e': 'Ruby Blaze',
  '#a855f7': 'Amethyst Rush',
  '#db2777': 'Magenta Comet',
  '#f59e0b': 'Solar Flare',
}
```

Then find where the trail buttons are rendered (search for where a trail
value is displayed as button text — it currently just renders `{trail}`
raw) and change it to `{TRAIL_NAMES[trail] || trail}`, matching the
pattern `COLOR_NAMES[color] || color` already used for colors elsewhere in
this same file.

- [ ] **Step 6: Manual verification via code trace (no browser available)**

Trace through: word "CAT" is completed with `cognitiveStrikes === 0` in
`level_1` → `pickReward` returns some `{type:'color', value:'#fb7185', label:'Coral Blush', isNew:true}` (assuming none of the pool is owned yet) →
`gameStore.js` sets `lastReward: {word:'CAT', type:'color', value:'#fb7185', label:'Coral Blush', isNew:true}` and `rewardEventId: 1` → `OverlayUI`'s
effect sees `rewardEventId (1) !== prevRewardEventId.current (0)` and
`lastReward` truthy → shows the banner reading "WORD COMPLETED: CAT!" with
a coral swatch and "New Outfit: Coral Blush!". Confirm this trace holds
against your actual final code, citing file:line.

Separately trace the downgrade case: 3 wrong letters on a `level_2` word →
`applyCognitiveStrike` returns a non-null `targetWord` (the downgrade
path) → `collectLetter`'s wrong-letter branch returns early WITHOUT ever
touching `lastReward`/`rewardEventId` (confirm this branch never even
calls `pickReward` — it shouldn't, since granting a reward on a failure
would be its own bug) → `rewardEventId` stays unchanged → `OverlayUI`'s
effect condition `rewardEventId !== prevRewardEventId.current` is false →
no false-positive celebration. Confirm this holds against your actual
final code.

- [ ] **Step 7: Run the full test suite and build**

Run: `npx vitest run` — expect all tests still pass (this task touches no
test files, only UI components).
Run: `npm run build` — expect a clean compile.

- [ ] **Step 8: Commit**

```bash
git add src/components/OverlayUI.jsx src/components/LobbyUI.jsx
git commit -m "Fix celebration banner to key off actual completion event, show real reward"
```

---

### Task 4: Convert SettingsModal, ControlsModal, WordAdminPanel to controlled components

**Files:**
- Modify: `src/components/SettingsModal.jsx`
- Modify: `src/components/ControlsModal.jsx`
- Modify: `src/components/WordAdminPanel.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: all three components now accept `{ isOpen, onClose }` as props
  instead of managing their own `isOpen` state and rendering their own
  floating trigger button. Task 5 (`TopMenu.jsx`) renders all three,
  passing these props.

- [ ] **Step 1: Read the current `src/components/SettingsModal.jsx` in full**

Confirm its exact current shape: a `useState` for `isOpen`, a floating
trigger `<button>` rendered when `!isOpen` is NOT the pattern here —
actually confirm by reading: this component currently renders the trigger
button AND conditionally the modal, structured as a `<>` fragment with the
button always present and the modal dialog conditionally shown alongside
it (not an early-return-if-closed pattern like `WordAdminPanel` uses).
Note which pattern each of the three components actually uses before
editing, since they may differ from each other.

- [ ] **Step 2: Convert `SettingsModal.jsx` to a controlled component**

Change the function signature from:
```js
export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
```
to:
```js
export function SettingsModal({ isOpen, onClose }) {
```

Remove the `import { useState } from 'react'` line if `useState` is no
longer used anywhere else in this file (check first — if any OTHER piece
of local state in this component still uses `useState`, keep the import
and just remove the now-unused `isOpen` state).

Remove the entire floating trigger `<button>` block (the one with
`⚙️ Settings` text and the `onClick={() => setIsOpen(true)}` handler) —
delete it completely, do not leave a commented-out remnant.

Replace every remaining `setIsOpen(false)` call in this file (in the
backdrop-click handler, the ✖ close button, and the "Save & Apply" button
at the bottom) with `onClose()`.

- [ ] **Step 3: Convert `ControlsModal.jsx` the same way**

Read the current file in full first. Apply the same transformation:
function signature becomes `export function ControlsModal({ isOpen, onClose })`,
remove its floating `🎮 How to Play & Controls` trigger button entirely,
replace every `setIsOpen(false)` with `onClose()`. This file already
imports `useEffect` for its device-detection logic — keep that import,
only remove `useState` if (after removing the `isOpen` state) nothing else
in the file still uses it (check the `activeTab` state, which does use
`useState` — so the import stays, just remove the specific
`const [isOpen, setIsOpen] = useState(false)` line).

- [ ] **Step 4: Convert `WordAdminPanel.jsx` the same way, preserving the math-gate reset**

Read the current file in full first. This one is different from the other
two: it has an `openPanel()` function that both sets `isOpen(true)` AND
resets the math gate (`setUnlocked(false)`, fresh `generateMathProblem()`,
clears input/error) — that reset logic must still happen every time the
panel opens, but there's no longer an `onClick={openPanel}` trigger button
inside this component to hang it on.

Change the function signature from:
```js
export function WordAdminPanel() {
  const gameState = useGameStore((state) => state.gameState)
  const [isOpen, setIsOpen] = useState(false)
```
to:
```js
export function WordAdminPanel({ isOpen, onClose }) {
```

Add `useEffect` to the React import at the top of the file:
```js
import { useState, useEffect } from 'react'
```

Delete the `openPanel` function entirely:
```js
  function openPanel() {
    setIsOpen(true)
    setUnlocked(false)
    setProblem(generateMathProblem())
    setAnswerInput('')
    setGateError('')
  }
```

Replace it with a `useEffect` that does the same reset, but triggered by
`isOpen` becoming true (rather than by a click handler that no longer
exists in this component):
```js
  // Reset the math gate every time the panel is opened (previously done
  // inline in this component's own trigger button's onClick before that
  // button moved out to TopMenu.jsx).
  useEffect(() => {
    if (isOpen) {
      setUnlocked(false)
      setProblem(generateMathProblem())
      setAnswerInput('')
      setGateError('')
    }
  }, [isOpen])
```

Remove the existing `if (gameState !== 'lobby') return null` line and the
`useGameStore` import/read for `gameState` — this component no longer
needs to know about `gameState` itself, since `TopMenu.jsx` (Task 5) will
only ever render it (and pass `isOpen: true`) while already in the lobby.
Also remove the `import { useGameStore } from '../store/gameStore.js'`
import line if nothing else in this file still uses `useGameStore` (check
first — the rest of the component's word-management logic uses
`useCustomWordsStore`, a different import, so `useGameStore` should now be
entirely unused here).

Remove the entire floating trigger `<button>` block (the one with
`🔒 Word Admin` text and `onClick={openPanel}`) and its surrounding
`if (!isOpen) { return (...) }` wrapper — replace that whole block with a
simple:
```js
  if (!isOpen) return null
```

Replace every remaining `setIsOpen(false)` call (backdrop click, ✖ close
button) with `onClose()`.

- [ ] **Step 5: Run the full test suite and build**

Run: `npx vitest run` — expect all tests still pass (none of these three
files have dedicated tests; this confirms no OTHER file's tests broke from
the signature change — though nothing else imports these three components
yet at this point, since Task 5 hasn't wired them into `TopMenu` yet, so a
clean pass here mostly just confirms no syntax errors).
Run: `npm run build` — this WILL likely still succeed even though `App.jsx`
still renders `<SettingsModal />`/`<ControlsModal />`/`<WordAdminPanel />`
with no props (since `isOpen`/`onClose` are just undefined props, not a
runtime error) — but functionally the panels will now always render as
closed/never-openable until Task 5 rewires `App.jsx`. This is expected and
temporary; do not try to work around it by keeping `App.jsx` un-migrated
after Task 5.

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsModal.jsx src/components/ControlsModal.jsx src/components/WordAdminPanel.jsx
git commit -m "Convert SettingsModal, ControlsModal, WordAdminPanel to controlled components"
```

---

### Task 5: TopMenu — single trigger + dropdown, mounted in App.jsx

**Files:**
- Create: `src/components/TopMenu.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `SettingsModal`, `ControlsModal`, `WordAdminPanel` (Task 4,
  all now controlled components taking `{isOpen, onClose}`).
- Produces: `<TopMenu />`, mounted in `App.jsx` in place of the three
  individually-mounted components.

- [ ] **Step 1: Read the current `src/App.jsx` in full**

Confirm its exact current import list and JSX mount order before editing
— you are replacing exactly the `SettingsModal`/`ControlsModal`/
`WordAdminPanel` imports and their three mount lines, and nothing else in
this file (leave `SplashScreen`, `TouchSwipeController`, etc. untouched).

- [ ] **Step 2: Write `TopMenu.jsx`**

```jsx
// src/components/TopMenu.jsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { SettingsModal } from './SettingsModal.jsx'
import { ControlsModal } from './ControlsModal.jsx'
import { WordAdminPanel } from './WordAdminPanel.jsx'

// Replaces three independently-mounted, always-visible floating buttons
// (Settings, How to Play & Controls, Word Admin) that each hardcoded their
// own `right: Xrem` offset to avoid overlapping one another. That math only
// worked on wide-enough viewports — on a narrower screen the buttons
// wrapped/overlapped the target-word HUD. One trigger + a small dropdown
// avoids needing three separate magic-number offsets to ever line up
// correctly again.
//
// Also fixes a second, independent problem: none of the three old buttons
// checked `gameState`, so they stayed on screen during actual gameplay too,
// permanently competing with the live HUD and the reward celebration
// banner for the same corner. Settings/Controls/Word Admin are all
// pre-game or parent-only concerns, so this component (and therefore all
// three panels) only renders in the lobby.
const MENU_ITEMS = [
  { id: 'settings', icon: '⚙️', label: 'Settings' },
  { id: 'controls', icon: '🎮', label: 'How to Play & Controls' },
  { id: 'wordAdmin', icon: '🔒', label: 'Word Admin (Parents)' },
]

export function TopMenu() {
  const gameState = useGameStore((state) => state.gameState)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openPanelId, setOpenPanelId] = useState(null) // 'settings' | 'controls' | 'wordAdmin' | null

  if (gameState !== 'lobby') return null

  return (
    <>
      <button
        onClick={() => setIsMenuOpen((open) => !open)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 30,
          pointerEvents: 'auto',
          backgroundColor: isMenuOpen ? 'rgba(59, 130, 246, 0.85)' : 'rgba(0, 0, 0, 0.75)',
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
          transition: 'background-color 0.15s ease',
        }}
      >
        <span>☰</span>
        <span>Menu</span>
      </button>

      {isMenuOpen && (
        <>
          {/* Click-away backdrop — invisible, just closes the dropdown */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 29, pointerEvents: 'auto' }}
          />

          <div
            style={{
              position: 'absolute',
              top: '4.2rem',
              right: '1rem',
              zIndex: 31,
              pointerEvents: 'auto',
              backgroundColor: 'rgba(17, 24, 39, 0.97)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '0.9rem',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              minWidth: '13rem',
            }}
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setOpenPanelId(item.id)
                  setIsMenuOpen(false)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.55rem 0.7rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <SettingsModal isOpen={openPanelId === 'settings'} onClose={() => setOpenPanelId(null)} />
      <ControlsModal isOpen={openPanelId === 'controls'} onClose={() => setOpenPanelId(null)} />
      <WordAdminPanel isOpen={openPanelId === 'wordAdmin'} onClose={() => setOpenPanelId(null)} />
    </>
  )
}
```

- [ ] **Step 3: Wire it into `App.jsx`**

Replace these three import lines:
```js
import { ControlsModal } from './components/ControlsModal.jsx'
import { SettingsModal } from './components/SettingsModal.jsx'
import { WordAdminPanel } from './components/WordAdminPanel.jsx'
```
with:
```js
import { TopMenu } from './components/TopMenu.jsx'
```

Replace these three mount lines:
```jsx
      <SettingsModal />
      <ControlsModal />
      <WordAdminPanel />
```
with:
```jsx
      <TopMenu />
```

Leave every other import and mount in `App.jsx` (including `SplashScreen`)
completely untouched.

- [ ] **Step 4: Manual verification via code trace (no browser available)**

Trace: `gameState === 'lobby'` → `TopMenu` renders its `☰ Menu` button →
click sets `isMenuOpen: true` → dropdown renders 3 items → click
"Word Admin (Parents)" → `openPanelId` becomes `'wordAdmin'`, `isMenuOpen`
becomes `false` (dropdown closes) → `<WordAdminPanel isOpen={true} onClose={...} />`
renders → `WordAdminPanel`'s new `useEffect` (from Task 4) fires because
`isOpen` just became `true` → math gate resets to a fresh problem. Confirm
this full chain holds against your actual final code, citing file:line for
each step.

Also trace: `gameState` transitions from `'lobby'` to `'playing'` (via
`startGame`) while the menu or a panel happens to be open → `TopMenu`'s own
`if (gameState !== 'lobby') return null` fires → the ENTIRE component
(button, dropdown, and all three mounted panels) unmounts instantly,
regardless of what was open. Confirm there's no dangling state issue here
(there shouldn't be — React fully unmounting the parent correctly tears
down all child state) but explicitly note in your report that you checked
this rather than assumed it.

- [ ] **Step 5: Run the full test suite and build**

Run: `npx vitest run` — expect all tests still pass.
Run: `npm run build` — expect a clean compile with no unused-import
warnings for the three files removed from `App.jsx`'s import list.

- [ ] **Step 6: Commit**

```bash
git add src/components/TopMenu.jsx src/App.jsx
git commit -m "Consolidate Settings/Controls/Word Admin into a single lobby-only TopMenu"
```
