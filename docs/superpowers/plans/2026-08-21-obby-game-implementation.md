# AI Obby Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable v1 of the browser-based 3D Obby spelling game
described in `docs/superpowers/specs/2026-08-21-obby-game-design.md`: a
child runs/jumps along a procedurally-generated infinite treadmill,
collects letters to spell target words, unlocks cosmetics, and experiences
adaptive difficulty that responds to mechanical (falling) vs. cognitive
(wrong-letter) failure independently.

**Architecture:** Vite + React Three Fiber for rendering, Rapier for
physics, `ecctrl` for the player character controller, Zustand for state
(split into reactive UI state and transient per-frame physics state, with
`persist`+`partialize` for cosmetic unlocks only). Procedural level
generation uses a fixed-size chunk sliding window driven by a lookahead
margin. All game logic that doesn't need React/R3F (chunk weighting,
tier/strike transitions, cosmetic reward lookup) is written as plain,
independently unit-tested functions.

**Tech Stack:** Vite, React 18, `@react-three/fiber`, `@react-three/drei`,
`@react-three/rapier`, `ecctrl`, `zustand`, `@react-spring/three`,
`use-sound`, Vitest (unit tests).

## Global Constraints

- Never call Zustand's `set()` inside a `useFrame` loop for per-frame data
  (player position). Use direct mutation via `useGameStore.getState().field
  = value` instead. (Spec §3.2)
- All chunk/bumper `THREE.BoxGeometry` and `THREE.MeshStandardMaterial`
  instances are declared once at module scope, never inside a component
  body. (Spec §3.10)
- The treadmill's chunk-generation trigger is a lookahead-margin check
  (`playerZ < activeChunks[activeChunks.length - 1].position[2] + 30`),
  never a fixed second-index comparison. (Spec §3.3)
- `cognitiveStrikes` resets to 0 on every new-word transition, not only on
  word-completion or downgrade. (Spec §3.5)
- Cosmetic rewards are looked up from `vocabulary.json`'s `tierReward`
  field generically — no hardcoded `if (targetWord === 'X')` branches.
  (Spec §3.7)
- `persist` middleware uses `partialize` — only `unlockedColors`,
  `equippedColor`, `unlockedTrails`, `equippedTrail`, `masteredWords`,
  `totalCoins`, `currentTier` survive a reload. (Spec §3.7)
- `ecctrl`'s actual ref/prop API must be confirmed by reading its installed
  package source/typings before Task 4 writes any code against it — do not
  assume the API shape from prior discussion. (Spec §2, §6)
- No NPC/LLM bots, no mobile touch controls, no Docker/CI/container
  infrastructure in this plan. (Spec §4)

---

## File Structure

```
obby-game/
├── src/
│   ├── main.jsx                  # Vite/React entry
│   ├── App.jsx                   # Canvas + DOM layer coordinator
│   ├── store/
│   │   ├── gameStore.js          # Zustand store (Task 2, 6, 8)
│   │   └── gameStore.logic.js    # Pure functions: chunk weights, tier/strike
│   │                              # transitions, cosmetic lookup (Task 3, 7, 8)
│   │   └── gameStore.logic.test.js
│   ├── data/
│   │   └── vocabulary.json       # Tiered word lists (Task 7)
│   ├── components/
│   │   ├── Player.jsx            # ecctrl wrapper + death check + dust FX (Task 4, 5, 11)
│   │   ├── ShowcasePlayer.jsx     # Lobby-only visual clone (Task 10)
│   │   ├── Chunks.jsx             # BasicChunk, GapChunk, ChunkRenderer, bumpers (Task 3, 9)
│   │   ├── LevelManager.jsx       # Sliding window treadmill logic (Task 3)
│   │   ├── Collectible.jsx        # Letter sensor + spring animation (Task 6, 11)
│   │   ├── LobbyUI.jsx            # DOM: color/trail swatches, PLAY button (Task 10)
│   │   └── OverlayUI.jsx          # DOM: HUD, death modal (Task 5, 6)
│   └── audio/
│       └── sounds.js              # use-sound hook wrappers (Task 11)
├── docs/superpowers/specs/2026-08-21-obby-game-design.md
├── docs/superpowers/plans/2026-08-21-obby-game-implementation.md
├── package.json
└── vite.config.js
```

**Responsibility boundaries:**
- `gameStore.logic.js` holds every piece of decision logic that can be
  expressed as a pure function of plain data (no Zustand, no React, no
  R3F) — this is deliberately split from `gameStore.js` (the thin Zustand
  wrapper) specifically so it can be unit-tested without mounting a
  component tree, per spec §5.
- `Chunks.jsx` owns chunk *rendering* (meshes, colliders); `LevelManager.jsx`
  owns the *sliding window* (when to add/remove which chunk); `gameStore.js`
  owns *what chunk comes next* (weighted random selection). Three separate
  concerns, three files.
- `Player.jsx` is the one file most likely to grow unwieldy (physics ref,
  death check, position sync, dust FX all touch it) — Task 11 explicitly
  splits dust-effect rendering into its own child component within the file
  rather than inlining it, to keep the `useFrame` body readable.

---

### Task 1: Project scaffold and dependency install

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx` (placeholder)
- Create: `.gitignore`

**Interfaces:**
- Produces: a running Vite dev server (`npm run dev`) rendering an empty
  R3F `<Canvas>`, which every later task builds on top of.

- [ ] **Step 1: Scaffold the Vite React app**

Run:
```bash
npm create vite@latest . -- --template react
```

When prompted about the current directory not being empty (it has `.git`
and `docs/`), confirm to proceed in the existing directory.

- [ ] **Step 2: Install exact dependency set**

```bash
npm install three@0.169.0 @react-three/fiber@8.17.10 @react-three/drei@9.114.0 @react-three/rapier@1.5.0 zustand@5.0.1 ecctrl@0.3.7 @react-spring/three@9.7.5 use-sound@4.0.3
npm install -D vitest@2.1.5
```

(Pinning exact versions per spec §2/§6 rationale — avoids silent API drift
across a multi-session build. If any of these exact versions fail to
resolve, install the latest available at time of running and record the
actual installed version in a comment at the top of `package.json`.)

- [ ] **Step 3: Replace the default App.jsx with an empty R3F Canvas placeholder**

```jsx
// src/App.jsx
import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Verify the dev server runs and renders**

Run: `npm run dev`

Open the printed local URL in a browser. Expected: a spinning-camera-static
orange cube on a black background, no console errors.

- [ ] **Step 5: Add `.gitignore` and commit**

```bash
# .gitignore
node_modules
dist
.DS_Store
```

```bash
git add -A
git commit -m "Scaffold Vite + React Three Fiber project"
```

---

### Task 2: Zustand store skeleton (reactive + transient state)

**Files:**
- Create: `src/store/gameStore.js`
- Test: manual (verified via Task 3's console usage; this task has no
  React/R3F consumer yet, so its "test" is Step 3 below)

**Interfaces:**
- Produces: `useGameStore` (default export... actually named export
  `useGameStore`) — a Zustand hook/store object with the shape from spec
  §3.2, exposing: `gameState`, `inventory`, `targetWord`, `currentTier`,
  `cognitiveStrikes`, `mechanicalDeaths`, `masteredWords`, `sessionCoins`,
  `totalCoins`, `unlockedColors`, `equippedColor`, `unlockedTrails`,
  `equippedTrail`, `playerZ`, `activeChunks`. All later tasks import
  `useGameStore` from this file.

- [ ] **Step 1: Write the store with all state fields and no logic yet**

```js
// src/store/gameStore.js
import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // Reactive UI state
  gameState: 'lobby', // 'lobby' | 'playing' | 'dead' | 'won'
  inventory: [],
  targetWord: 'CAT',
  currentTier: 'level_1',
  cognitiveStrikes: 0,
  mechanicalDeaths: 0,
  masteredWords: [],
  sessionCoins: 0,
  totalCoins: 0,

  // Persistent cosmetic state (persist wiring added in Task 8)
  unlockedColors: ['hotpink'],
  equippedColor: 'hotpink',
  unlockedTrails: [],
  equippedTrail: null,

  // Transient physics-loop state — mutated directly via getState(), never set()
  playerZ: 0,
  activeChunks: [],
}))
```

- [ ] **Step 2: Verify transient mutation works without triggering React state warnings**

Run: `npm run dev`, then open the browser console and paste:

```js
// (temporary manual check — not committed)
import.meta.hot // just confirming dev server is live; real check below
```

Actually verify via a temporary line in `src/App.jsx`'s top level (remove
after checking):

```jsx
console.log('initial store state:', useGameStore.getState())
```

Expected console output: an object with all fields listed above, `gameState: 'lobby'`.

- [ ] **Step 3: Remove the temporary console.log, commit**

```bash
git add src/store/gameStore.js
git commit -m "Add Zustand store skeleton with reactive and transient state"
```

---

### Task 3: Vocabulary data + pure progression logic (unit tested)

This is the highest-bug-risk logic in the whole spec (§5 names this
explicitly) — it's built and tested as plain functions before anything
touches Zustand or React.

**Files:**
- Create: `src/data/vocabulary.json`
- Create: `src/store/gameStore.logic.js`
- Test: `src/store/gameStore.logic.test.js`

**Interfaces:**
- Consumes: nothing (pure functions + the JSON data file).
- Produces:
  - `getChunkWeights(mechanicalDeaths: number): { basic: number, gap: number }`
  - `pickChunkType(weights: {basic: number, gap: number}): 'basic' | 'gap'`
  - `pickNextWord(tier: string, masteredWords: string[], vocabData: object): string`
  - `applyCognitiveStrike(state: {cognitiveStrikes: number, currentTier: string}, vocabData: object): { cognitiveStrikes: number, currentTier: string, targetWord: string | null }`
    (returns `targetWord: null` if no downgrade should happen — caller keeps
    existing `targetWord`)
  - `getTierRewardAction(tier: string, vocabData: object): { type: 'color' | 'trail', value: string }`
  - These five functions are imported directly by `gameStore.js` in Task 6/7
    — later tasks call them by these exact names and signatures.

- [ ] **Step 1: Create the vocabulary data file**

```json
// src/data/vocabulary.json
{
  "level_1": {
    "tierReward": { "type": "color", "value": "blue" },
    "words": ["CAT", "DOG", "SUN", "HAT"]
  },
  "level_2": {
    "tierReward": { "type": "trail", "value": "orange" },
    "words": ["JUMP", "FAST", "BIRD", "STAR"]
  },
  "level_3": {
    "tierReward": { "type": "color", "value": "gold" },
    "words": ["SPACE", "ROCKET", "PLANET"]
  }
}
```

(Note: `tierReward` is an object `{type, value}` here rather than the
spec's shorthand string, so `getTierRewardAction` can return it directly
without a second lookup table — this is a deliberate refinement of §3.6/§3.7
that keeps the reward-type mapping in the data file itself.)

- [ ] **Step 2: Write failing tests for `getChunkWeights` and `pickChunkType`**

```js
// src/store/gameStore.logic.test.js
import { describe, it, expect, vi } from 'vitest'
import { getChunkWeights, pickChunkType } from './gameStore.logic.js'

describe('getChunkWeights', () => {
  it('returns 70/30 basic/gap for 0-2 deaths', () => {
    expect(getChunkWeights(0)).toEqual({ basic: 0.7, gap: 0.3 })
    expect(getChunkWeights(2)).toEqual({ basic: 0.7, gap: 0.3 })
  })

  it('returns 90/10 basic/gap for 3-5 deaths', () => {
    expect(getChunkWeights(3)).toEqual({ basic: 0.9, gap: 0.1 })
    expect(getChunkWeights(5)).toEqual({ basic: 0.9, gap: 0.1 })
  })

  it('returns 100/0 basic/gap for 6+ deaths (Safety Mode)', () => {
    expect(getChunkWeights(6)).toEqual({ basic: 1.0, gap: 0.0 })
    expect(getChunkWeights(100)).toEqual({ basic: 1.0, gap: 0.0 })
  })
})

describe('pickChunkType', () => {
  it('always picks basic when gap weight is 0', () => {
    const weights = { basic: 1.0, gap: 0.0 }
    for (let i = 0; i < 20; i++) {
      expect(pickChunkType(weights)).toBe('basic')
    }
  })

  it('picks gap when random roll exceeds basic threshold', () => {
    const weights = { basic: 0.7, gap: 0.3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // above 0.7 threshold
    expect(pickChunkType(weights)).toBe('gap')
    vi.restoreAllMocks()
  })

  it('picks basic when random roll is below basic threshold', () => {
    const weights = { basic: 0.7, gap: 0.3 }
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    expect(pickChunkType(weights)).toBe('basic')
    vi.restoreAllMocks()
  })
})
```

- [ ] **Step 2b: Run tests to verify they fail**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: FAIL — `gameStore.logic.js` does not exist yet / exports undefined.

- [ ] **Step 3: Implement `getChunkWeights` and `pickChunkType`**

```js
// src/store/gameStore.logic.js
export function getChunkWeights(mechanicalDeaths) {
  if (mechanicalDeaths >= 6) return { basic: 1.0, gap: 0.0 }
  if (mechanicalDeaths >= 3) return { basic: 0.9, gap: 0.1 }
  return { basic: 0.7, gap: 0.3 }
}

export function pickChunkType(weights) {
  const roll = Math.random()
  return roll < weights.basic ? 'basic' : 'gap'
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Write failing tests for `pickNextWord`**

```js
// append to src/store/gameStore.logic.test.js
import vocabData from '../data/vocabulary.json'
import { pickNextWord } from './gameStore.logic.js'

describe('pickNextWord', () => {
  it('picks a word from the given tier', () => {
    const word = pickNextWord('level_1', [], vocabData)
    expect(vocabData.level_1.words).toContain(word)
  })

  it('excludes mastered words when unmastered words remain', () => {
    const mastered = ['CAT', 'DOG', 'SUN']
    const word = pickNextWord('level_1', mastered, vocabData)
    expect(word).toBe('HAT') // only unmastered word left in level_1
  })

  it('falls back to the full pool if all words in tier are mastered', () => {
    const mastered = ['CAT', 'DOG', 'SUN', 'HAT']
    const word = pickNextWord('level_1', mastered, vocabData)
    expect(vocabData.level_1.words).toContain(word)
  })
})
```

- [ ] **Step 6: Run to verify failure, then implement `pickNextWord`**

Run: `npx vitest run src/store/gameStore.logic.test.js` → expect FAIL (not exported).

```js
// append to src/store/gameStore.logic.js
export function pickNextWord(tier, masteredWords, vocabData) {
  const pool = vocabData[tier].words
  const unmastered = pool.filter((w) => !masteredWords.includes(w))
  const candidates = unmastered.length > 0 ? unmastered : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}
```

- [ ] **Step 7: Run tests, verify pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (10 tests total)

- [ ] **Step 8: Write failing tests for `applyCognitiveStrike` (the bug-fixed logic)**

```js
// append to src/store/gameStore.logic.test.js
import { applyCognitiveStrike } from './gameStore.logic.js'

describe('applyCognitiveStrike', () => {
  it('increments strikes without downgrading below 3 strikes', () => {
    const result = applyCognitiveStrike({ cognitiveStrikes: 0, currentTier: 'level_2' }, vocabData)
    expect(result.cognitiveStrikes).toBe(1)
    expect(result.currentTier).toBe('level_2')
    expect(result.targetWord).toBeNull()
  })

  it('downgrades tier and picks a new word from the LOWER tier at 3 strikes', () => {
    const result = applyCognitiveStrike({ cognitiveStrikes: 2, currentTier: 'level_2' }, vocabData)
    expect(result.cognitiveStrikes).toBe(0)
    expect(result.currentTier).toBe('level_1')
    expect(vocabData.level_1.words).toContain(result.targetWord)
  })

  it('never downgrades below level_1', () => {
    const result = applyCognitiveStrike({ cognitiveStrikes: 2, currentTier: 'level_1' }, vocabData)
    expect(result.currentTier).toBe('level_1')
    // still resets strikes and still assigns a fresh word even at floor tier
    expect(result.cognitiveStrikes).toBe(0)
    expect(vocabData.level_1.words).toContain(result.targetWord)
  })
})
```

- [ ] **Step 9: Run to verify failure, then implement `applyCognitiveStrike`**

Run: `npx vitest run src/store/gameStore.logic.test.js` → expect FAIL.

```js
// append to src/store/gameStore.logic.js
const TIER_ORDER = ['level_1', 'level_2', 'level_3']

export function applyCognitiveStrike(state, vocabData) {
  const newStrikes = state.cognitiveStrikes + 1

  if (newStrikes < 3) {
    return { cognitiveStrikes: newStrikes, currentTier: state.currentTier, targetWord: null }
  }

  const currentIndex = TIER_ORDER.indexOf(state.currentTier)
  const downgradedTier = currentIndex > 0 ? TIER_ORDER[currentIndex - 1] : TIER_ORDER[0]
  const nextWord = pickNextWord(downgradedTier, [], vocabData)

  return { cognitiveStrikes: 0, currentTier: downgradedTier, targetWord: nextWord }
}
```

- [ ] **Step 10: Run tests, verify pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (13 tests total)

- [ ] **Step 11: Write failing test for `getTierRewardAction`**

```js
// append to src/store/gameStore.logic.test.js
import { getTierRewardAction } from './gameStore.logic.js'

describe('getTierRewardAction', () => {
  it('returns the reward object for the given tier', () => {
    expect(getTierRewardAction('level_1', vocabData)).toEqual({ type: 'color', value: 'blue' })
    expect(getTierRewardAction('level_2', vocabData)).toEqual({ type: 'trail', value: 'orange' })
  })
})
```

- [ ] **Step 12: Run to verify failure, then implement**

Run: `npx vitest run src/store/gameStore.logic.test.js` → expect FAIL.

```js
// append to src/store/gameStore.logic.js
export function getTierRewardAction(tier, vocabData) {
  return vocabData[tier].tierReward
}
```

- [ ] **Step 13: Run full test suite, verify all pass**

Run: `npx vitest run src/store/gameStore.logic.test.js`
Expected: PASS (14 tests total)

- [ ] **Step 14: Commit**

```bash
git add src/data/vocabulary.json src/store/gameStore.logic.js src/store/gameStore.logic.test.js
git commit -m "Add vocabulary data and pure progression logic with unit tests"
```

---

### Task 4: Verify ecctrl API before writing any player code

This task is pure investigation — no code is written against `ecctrl` in
this repo until its actual API is confirmed, per spec §2/§6.

**Files:** none created; this task produces findings that Task 5 depends on.

**Interfaces:**
- Produces: confirmed answers to (a) what `ref` on `<Ecctrl>` forwards —
  a raw Rapier `RigidBody` API (`.translation()`, `.linvel()`,
  `.setTranslation()`, `.setLinvel()`) or a wrapped object; (b) the exact
  prop names for camera distance, jump velocity, max speed, and rotation
  lock; (c) whether `animated` is a valid prop on the installed version.
  Task 5 must use whatever this task confirms, not the names guessed
  earlier in the design conversation.

- [ ] **Step 1: Inspect the installed package**

```bash
cat node_modules/ecctrl/package.json | grep '"version"'
ls node_modules/ecctrl/dist/
```

- [ ] **Step 2: Read the type definitions or source to confirm the ref shape**

```bash
find node_modules/ecctrl -name "*.d.ts" -exec cat {} \;
```

If no `.d.ts` file exists, read the main JS export directly:

```bash
cat node_modules/ecctrl/dist/*.js | grep -A 20 "forwardRef"
```

Look specifically for what `useImperativeHandle` (if present) exposes on
the ref, or whether the ref is passed straight through to an internal
`<RigidBody ref={...}>`.

- [ ] **Step 3: Record findings as a code comment at the top of the (not-yet-created) Player.jsx**

This isn't a separate file — it becomes the header comment written in
Task 5, Step 1. Write down now (in your own notes/scratch, or directly
recall when starting Task 5):
- The exact ref shape (e.g., "ref.current is the raw Rapier RigidBody API"
  or "ref.current.rigidBodyRef.current is the RigidBody").
- Confirmed prop names for: initial camera distance, max camera distance,
  max velocity, jump velocity, rotation lock, animated flag.

No commit for this task — it's investigation only, folded into Task 5.

---

### Task 5: Player controller with ecctrl, wired to keyboard input

**Files:**
- Create: `src/components/Player.jsx`
- Modify: `src/App.jsx` (mount `<KeyboardControls>` + `<Physics>` + `<Player>`)

**Interfaces:**
- Consumes: `useGameStore` (from Task 2) for `gameState`; the confirmed
  `ecctrl` ref API from Task 4.
- Produces: a `<Player />` component that can be mounted inside a
  `<Physics>` block; mutates `useGameStore.getState().playerZ` every frame
  (consumed by Task 3's `LevelManager` — wait, `LevelManager` is Task 6/9,
  see below). Exposes no props in v1 (single hardcoded player).

- [ ] **Step 1: Define the keyboard map and wrap the Canvas**

```jsx
// src/App.jsx
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import { Player } from './components/Player.jsx'

const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
]

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} castShadow />
          <Physics gravity={[0, -9.81, 0]}>
            <mesh position={[0, -0.5, 0]} receiveShadow>
              <boxGeometry args={[50, 1, 50]} />
              <meshStandardMaterial color="gray" />
            </mesh>
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  )
}
```

Note: the flat 50×1×50 floor here is a temporary manual test bed for the
player controller only — Task 9 replaces it with `<LevelManager>`.

- [ ] **Step 2: Write Player.jsx using the ref API confirmed in Task 4**

Use the exact prop names and ref shape found in Task 4. The following
shows the expected shape if `ecctrl` forwards the raw RigidBody API
directly (adjust based on actual Task 4 findings before writing):

```jsx
// src/components/Player.jsx
// ecctrl v<VERSION> confirmed API (Task 4): ref.current exposes the raw
// Rapier RigidBody methods (.translation(), .setTranslation(), .setLinvel()).
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'

export function Player() {
  const rigidBodyRef = useRef()

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z
  })

  return (
    <Ecctrl
      ref={rigidBodyRef}
      position={[0, 5, 0]}
      camInitDis={-6}
      camMaxDis={-8}
      maxVelLimit={6}
      jumpVel={5}
      animated={false}
    >
      <mesh castShadow position={[0, -0.9, 0]}>
        <capsuleGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </Ecctrl>
  )
}
```

If Task 4 found a different ref shape (e.g., ref exposes a nested object
rather than the RigidBody directly), adjust the `.translation()` call
accordingly — do not proceed with this exact code if Task 4's findings
contradict it.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`

Verify in the browser:
1. A pink capsule drops from Y=5 and lands on the gray floor (gravity works).
2. WASD/arrow keys move the capsule; camera follows behind it.
3. Space makes it jump.
4. The capsule does not tip over or fall through the floor.

If the character tips over: confirm `ecctrl`'s rotation-lock prop (found
in Task 4) is applied — do not add manual quaternion math to compensate.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Player.jsx
git commit -m "Add ecctrl player controller with keyboard input"
```

---

### Task 6: Death, respawn, and the OverlayUI death modal

**Files:**
- Modify: `src/store/gameStore.js` (add `die`, `restart` actions)
- Modify: `src/components/Player.jsx` (add Y-bounds death check + respawn teleport)
- Create: `src/components/OverlayUI.jsx`
- Modify: `src/App.jsx` (mount `<OverlayUI>`)

**Interfaces:**
- Consumes: `useGameStore` fields `gameState`, `mechanicalDeaths`.
- Produces: `die()` and `restart()` actions on the store, callable by any
  component; `<OverlayUI />` renders the death modal when
  `gameState === 'dead'`.

- [ ] **Step 1: Add die/restart actions to the store**

```js
// src/store/gameStore.js — add inside the create((set, get) => ({ ... })) object
die: () => set((state) => ({
  gameState: 'dead',
  mechanicalDeaths: state.mechanicalDeaths + 1,
})),

restart: () => set({ gameState: 'playing', inventory: [] }),
```

(Note: `restart()` does not yet call `spawnInitialChunks()` — that action
is added in Task 9 once chunks exist. This task's restart only handles
gameState/inventory; Task 9 extends it.)

- [ ] **Step 2: Add the Y-bounds death check and respawn effect to Player.jsx**

```jsx
// src/components/Player.jsx — modify the existing component
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'

export function Player() {
  const rigidBodyRef = useRef()
  const gameState = useGameStore((state) => state.gameState)

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { y, z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z

    if (y < -10 && useGameStore.getState().gameState === 'playing') {
      useGameStore.getState().die()
    }
  })

  useEffect(() => {
    if (gameState === 'playing' && rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [gameState])

  if (gameState === 'dead') return null

  return (
    <Ecctrl
      ref={rigidBodyRef}
      position={[0, 5, 0]}
      camInitDis={-6}
      camMaxDis={-8}
      maxVelLimit={6}
      jumpVel={5}
      animated={false}
    >
      <mesh castShadow position={[0, -0.9, 0]}>
        <capsuleGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </Ecctrl>
  )
}
```

- [ ] **Step 3: Create OverlayUI with the death modal**

```jsx
// src/components/OverlayUI.jsx
import { useGameStore } from '../store/gameStore.js'

export function OverlayUI() {
  const gameState = useGameStore((state) => state.gameState)
  const restart = useGameStore((state) => state.restart)

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {gameState === 'dead' && (
        <div style={{
          pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)',
          padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: 'white',
        }}>
          <h1>You Fell!</h1>
          <button onClick={restart} style={{ fontSize: '1.5rem', padding: '0.5rem 1.5rem' }}>
            Respawn
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Mount OverlayUI in App.jsx**

```jsx
// src/App.jsx — add import and render OverlayUI as a sibling to the Canvas
import { OverlayUI } from './components/OverlayUI.jsx'

// inside the returned JSX, alongside <Canvas>...</Canvas>:
// <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
//   <Canvas ...>...</Canvas>
//   <OverlayUI />
// </div>
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Jump/walk off the edge of the temporary flat floor.

Verify:
1. Falling below Y=-10 triggers the "You Fell!" modal instantly.
2. Clicking "Respawn" removes the modal and teleports the capsule back to
   `(0, 5, 0)` with zero velocity (it doesn't retain falling momentum).
3. No console errors about calling methods on a null ref.

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.js src/components/Player.jsx src/components/OverlayUI.jsx src/App.jsx
git commit -m "Add death detection, respawn, and death modal UI"
```

---

### Task 7: Chunk components (BasicChunk, GapChunk, ChunkRenderer) with shared geometry

**Files:**
- Create: `src/components/Chunks.jsx`

**Interfaces:**
- Consumes: nothing external yet (pure rendering components).
- Produces: `<ChunkRenderer chunk={{id, type, position, hasLetter, letter}} />`
  — used by Task 9's `LevelManager`. Also exports `<BasicChunk>` and
  `<GapChunk>` directly for potential reuse, though `ChunkRenderer` is the
  primary consumer-facing component.

- [ ] **Step 1: Define shared geometry/material at module scope and write BasicChunk**

```jsx
// src/components/Chunks.jsx
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'

// Flyweight: allocated once, shared across every chunk instance (spec §3.10)
const floorGeometry = new THREE.BoxGeometry(10, 1, 10)
const floorMaterial = new THREE.MeshStandardMaterial({ color: 'gray' })
const gapFloorGeometry = new THREE.BoxGeometry(10, 1, 4)

export function BasicChunk({ position }) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
    </RigidBody>
  )
}

export function GapChunk({ position }) {
  const [x, y, z] = position
  return (
    <>
      <RigidBody type="fixed" position={[x, y, z + 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
      </RigidBody>
      <RigidBody type="fixed" position={[x, y, z - 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
      </RigidBody>
    </>
  )
}

export function ChunkRenderer({ chunk }) {
  switch (chunk.type) {
    case 'basic':
      return <BasicChunk position={chunk.position} />
    case 'gap':
      return <GapChunk position={chunk.position} />
    default:
      return null
  }
}
```

(Math check on `GapChunk`: chunk is 10 units deep on Z. Two 10×1×4
platforms centered at `z+3` and `z-3` leaves a `10 - 4 - 4 = 2` unit gap
centered in the middle of the chunk's Z-span — matches spec §3.3's "2-unit
gap.")

- [ ] **Step 2: Manual verification with a temporary standalone test render**

Temporarily add to `App.jsx` (inside `<Physics>`, alongside the existing
test floor) — remove after checking:

```jsx
import { ChunkRenderer } from './components/Chunks.jsx'
// ...
<ChunkRenderer chunk={{ id: 'test-1', type: 'gap', position: [0, -0.5, -20] }} />
```

Run `npm run dev`, walk/run the player toward `z: -20`. Verify: two
separate platforms with a visible gap, player can fall through the gap
(falls below Y=-10, triggers death modal from Task 6). Remove the
temporary `ChunkRenderer` line afterward.

- [ ] **Step 3: Commit**

```bash
git add src/components/Chunks.jsx
git commit -m "Add BasicChunk, GapChunk, and ChunkRenderer with shared geometry"
```

---

### Task 8: Store actions for procedural generation (progressLevel, spawnInitialChunks)

**Files:**
- Modify: `src/store/gameStore.js`

**Interfaces:**
- Consumes: `getChunkWeights`, `pickChunkType` from `gameStore.logic.js` (Task 3).
- Produces: `spawnInitialChunks()` and `progressLevel()` actions, and the
  `activeChunks` array shape `{id: string, type: 'basic'|'gap', position: [x,y,z], hasLetter: boolean, letter: string|null}`.
  Task 9's `LevelManager` calls these two actions by these exact names.

- [ ] **Step 1: Write failing tests for the chunk-generation actions**

These test the store directly (not pure functions, since they touch
`activeChunks` state) — create a separate test file for store-level
behavior:

```js
// src/store/gameStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore.js'

describe('spawnInitialChunks', () => {
  beforeEach(() => {
    useGameStore.setState({ activeChunks: [] })
  })

  it('creates 10 chunks spaced 10 units apart on Z, starting at Z=0', () => {
    useGameStore.getState().spawnInitialChunks()
    const chunks = useGameStore.getState().activeChunks
    expect(chunks).toHaveLength(10)
    expect(chunks[0].position[2]).toBe(0)
    expect(chunks[9].position[2]).toBe(-90)
  })

  it('never spawns a gap chunk in the first 10 chunks (onboarding safety, spec §3.6)', () => {
    useGameStore.getState().spawnInitialChunks()
    const chunks = useGameStore.getState().activeChunks
    expect(chunks.every((c) => c.type === 'basic')).toBe(true)
  })
})

describe('progressLevel', () => {
  beforeEach(() => {
    useGameStore.setState({ activeChunks: [], mechanicalDeaths: 0 })
    useGameStore.getState().spawnInitialChunks()
  })

  it('removes the oldest chunk and appends a new one 10 units past the last chunk', () => {
    const before = useGameStore.getState().activeChunks
    const lastZ = before[before.length - 1].position[2]
    useGameStore.getState().progressLevel()
    const after = useGameStore.getState().activeChunks
    expect(after).toHaveLength(10)
    expect(after[0].id).not.toBe(before[0].id)
    expect(after[after.length - 1].position[2]).toBe(lastZ - 10)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: FAIL — `spawnInitialChunks`/`progressLevel` not defined.

- [ ] **Step 3: Implement the actions**

```js
// src/store/gameStore.js — add imports at top
import { getChunkWeights, pickChunkType } from './gameStore.logic.js'

// add inside the create((set, get) => ({ ... })) object:
spawnInitialChunks: () => set(() => {
  const chunks = Array.from({ length: 10 }, (_, i) => ({
    id: `chunk-init-${i}`,
    type: 'basic', // onboarding rule: first 10 chunks are always safe (spec §3.6)
    position: [0, -0.5, -i * 10],
    hasLetter: false,
    letter: null,
  }))
  return { activeChunks: chunks }
}),

progressLevel: () => set((state) => {
  const [, ...rest] = state.activeChunks
  const lastChunk = state.activeChunks[state.activeChunks.length - 1]
  const weights = getChunkWeights(state.mechanicalDeaths)
  const nextType = pickChunkType(weights)

  const newChunk = {
    id: `chunk-${Date.now()}-${Math.random()}`,
    type: nextType,
    position: [0, -0.5, lastChunk.position[2] - 10],
    hasLetter: false,
    letter: null,
  }

  return { activeChunks: [...rest, newChunk] }
}),
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.js src/store/gameStore.test.js
git commit -m "Add spawnInitialChunks and progressLevel store actions"
```

---

### Task 9: LevelManager — the sliding-window treadmill (with the corrected trigger)

**Files:**
- Create: `src/components/LevelManager.jsx`
- Modify: `src/store/gameStore.js` (`restart()` now also calls `spawnInitialChunks()`)
- Modify: `src/App.jsx` (replace the temporary flat floor with `<LevelManager>`)

**Interfaces:**
- Consumes: `activeChunks`, `playerZ` (from store), `progressLevel()` action,
  `ChunkRenderer` (Task 7).
- Produces: `<LevelManager />`, mounted inside `<Physics>` in place of the
  temporary test floor.

- [ ] **Step 1: Write LevelManager with the corrected lookahead-margin trigger**

```jsx
// src/components/LevelManager.jsx
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.js'
import { ChunkRenderer } from './Chunks.jsx'

export function LevelManager() {
  const activeChunks = useGameStore((state) => state.activeChunks)
  const lastTriggeredChunkId = useRef(null)

  useEffect(() => {
    useGameStore.getState().spawnInitialChunks()
  }, [])

  useFrame(() => {
    const state = useGameStore.getState()
    const { playerZ, activeChunks } = state
    if (activeChunks.length === 0) return

    const lastChunk = activeChunks[activeChunks.length - 1]

    // Lookahead-margin trigger (spec §3.3 fix): generate ahead of the
    // player whenever fewer than 3 chunks (30 units) remain loaded ahead,
    // rather than comparing against a fixed array index. This is robust
    // to player speed (sprinting) unlike the original fixed-index trigger.
    const shouldGenerate = playerZ < lastChunk.position[2] + 30

    if (shouldGenerate && lastTriggeredChunkId.current !== lastChunk.id) {
      lastTriggeredChunkId.current = lastChunk.id
      state.progressLevel()
    }
  })

  return (
    <>
      {activeChunks.map((chunk) => (
        <ChunkRenderer key={chunk.id} chunk={chunk} />
      ))}
    </>
  )
}
```

(The `lastTriggeredChunkId` ref guard prevents `progressLevel()` firing on
every frame while `shouldGenerate` stays true — it only fires once per
distinct "last chunk," matching the spec's required-fix behavior. Since
`progressLevel` appends a new chunk each call, the "last chunk" identity
changes immediately after triggering, naturally allowing the next trigger
once the margin closes again.)

- [ ] **Step 2: Update restart() to rebuild chunks**

```js
// src/store/gameStore.js — replace the existing restart action
restart: () => {
  set({ gameState: 'playing', inventory: [] })
  get().spawnInitialChunks()
},
```

- [ ] **Step 3: Wire LevelManager into App.jsx, removing the temporary floor**

```jsx
// src/App.jsx — remove the temporary <mesh> floor and any leftover test
// <ChunkRenderer> from Task 7, add:
import { LevelManager } from './components/LevelManager.jsx'
// inside <Physics>: replace the flat floor mesh with <LevelManager />
```

- [ ] **Step 4: Manual verification — the speed-robustness check**

Run: `npm run dev`.

1. Walk forward continuously (W held). Verify the Z coordinate decreases
   indefinitely without the player ever running off the end of loaded
   track (no falling into unloaded void).
2. **Critical check for the fixed bug:** hold Shift (run) + W and sprint
   forward continuously for at least 30 seconds. Verify the same — no
   falling into unloaded void even at max speed. This is the scenario the
   original fixed-index trigger would fail under.
3. Look behind the player while moving — old chunks should disappear
   (unmount) once passed.
4. Occasionally encounter a gap chunk requiring a jump.

- [ ] **Step 5: Commit**

```bash
git add src/components/LevelManager.jsx src/store/gameStore.js src/App.jsx
git commit -m "Add LevelManager with speed-robust lookahead-margin treadmill trigger"
```

---

### Task 10: Collectible letters, cognitive strikes, decoys, and word completion

**Files:**
- Create: `src/components/Collectible.jsx`
- Modify: `src/store/gameStore.js` (add `collectLetter` action, use
  `applyCognitiveStrike`, `pickNextWord`, `getTierRewardAction` from Task 3)
- Modify: `src/components/Chunks.jsx` (`BasicChunk` renders a `<Collectible>`
  when `chunk.hasLetter` is true)
- Modify: `src/store/gameStore.js` (`progressLevel` decides `hasLetter`/`letter`)

**Interfaces:**
- Consumes: `applyCognitiveStrike`, `pickNextWord`, `getTierRewardAction`
  from `gameStore.logic.js` (Task 3); `vocabulary.json`.
- Produces: `collectLetter(char)` action; `<Collectible letter position />`
  component, mounted by `BasicChunk` when applicable.

- [ ] **Step 1: Write failing store test for collectLetter's three scenarios**

```js
// append to src/store/gameStore.test.js
describe('collectLetter', () => {
  beforeEach(() => {
    useGameStore.setState({
      inventory: [], targetWord: 'CAT', currentTier: 'level_1',
      cognitiveStrikes: 0, mechanicalDeaths: 5, masteredWords: [],
      unlockedColors: ['hotpink'], equippedColor: 'hotpink',
      unlockedTrails: [], equippedTrail: null,
    })
  })

  it('appends a correct letter to inventory without completing the word', () => {
    useGameStore.getState().collectLetter('C')
    const state = useGameStore.getState()
    expect(state.inventory).toEqual(['C'])
    expect(state.cognitiveStrikes).toBe(0)
  })

  it('increments cognitiveStrikes on a decoy letter without touching inventory', () => {
    useGameStore.getState().collectLetter('X') // decoy, expected next letter is 'C'
    const state = useGameStore.getState()
    expect(state.inventory).toEqual([])
    expect(state.cognitiveStrikes).toBe(1)
  })

  it('resets cognitiveStrikes to 0 when a correct letter completes the word', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 1 })
    useGameStore.getState().collectLetter('T')
    const state = useGameStore.getState()
    expect(state.inventory).toEqual([])
    expect(state.cognitiveStrikes).toBe(0)
    expect(state.mechanicalDeaths).toBe(0) // reset on word completion, spec §3.6
  })

  it('resets cognitiveStrikes to 0 on a correct-but-non-final letter (the fixed bug)', () => {
    useGameStore.setState({ inventory: [], cognitiveStrikes: 2 })
    useGameStore.getState().collectLetter('C') // correct, word not finished
    const state = useGameStore.getState()
    // Critical: strikes must NOT carry over as 2 into the next word attempt.
    // Original design only reset on completion/downgrade — this verifies the fix.
    expect(state.cognitiveStrikes).toBe(0)
  })

  it('adds the word to masteredWords only if spelled with zero strikes', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().masteredWords).toContain('CAT')
  })

  it('does NOT add the word to masteredWords if any strikes occurred', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 1 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().masteredWords).not.toContain('CAT')
  })

  it('applies the cosmetic reward on word completion', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().unlockedColors).toContain('blue')
    expect(useGameStore.getState().equippedColor).toBe('blue')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: FAIL — `collectLetter` not defined.

- [ ] **Step 3: Implement collectLetter**

```js
// src/store/gameStore.js — add imports
import { applyCognitiveStrike, pickNextWord, getTierRewardAction } from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'

// add inside the create(...) object:
collectLetter: (char) => set((state) => {
  const expectedLetter = state.targetWord[state.inventory.length]

  // Cognitive failure: wrong letter
  if (char !== expectedLetter) {
    const result = applyCognitiveStrike(
      { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
      vocabData
    )
    if (result.targetWord !== null) {
      // Downgrade happened
      return {
        cognitiveStrikes: result.cognitiveStrikes,
        currentTier: result.currentTier,
        targetWord: result.targetWord,
        inventory: [],
      }
    }
    return { cognitiveStrikes: result.cognitiveStrikes }
  }

  // Correct letter
  const newInventory = [...state.inventory, char]

  if (newInventory.join('') === state.targetWord) {
    // Word completed
    const newMastered = state.cognitiveStrikes === 0 && !state.masteredWords.includes(state.targetWord)
      ? [...state.masteredWords, state.targetWord]
      : state.masteredWords

    const reward = getTierRewardAction(state.currentTier, vocabData)
    const rewardPatch = reward.type === 'color'
      ? { unlockedColors: [...state.unlockedColors, reward.value], equippedColor: reward.value }
      : { unlockedTrails: [...state.unlockedTrails, reward.value], equippedTrail: reward.value }

    const nextWord = pickNextWord(state.currentTier, newMastered, vocabData)

    return {
      inventory: [],
      cognitiveStrikes: 0,
      mechanicalDeaths: 0,
      masteredWords: newMastered,
      targetWord: nextWord,
      ...rewardPatch,
    }
  }

  // Correct letter, word not yet finished — THE FIX: strikes reset here too
  return { inventory: newInventory, cognitiveStrikes: 0 }
}),
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/store/gameStore.test.js`
Expected: PASS (all collectLetter tests + earlier tests)

- [ ] **Step 5: Create the Collectible component with spring animation**

```jsx
// src/components/Collectible.jsx
import { useState } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'

export function Collectible({ letter, position }) {
  const [collected, setCollected] = useState(false)
  const collectLetter = useGameStore((state) => state.collectLetter)

  const { scale } = useSpring({
    scale: collected ? 0 : 1,
    config: { duration: 300 },
    onRest: () => {
      if (collected) setUnmounted(true)
    },
  })
  const [unmounted, setUnmounted] = useState(false)

  if (unmounted) return null

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[0.5, 0.5, 0.5]}
        sensor
        onIntersectionEnter={() => {
          if (!collected) {
            collectLetter(letter)
            setCollected(true)
          }
        }}
      />
      <animated.group scale={scale}>
        <Text fontSize={1.5} color="gold">
          {letter}
        </Text>
      </animated.group>
    </RigidBody>
  )
}
```

- [ ] **Step 6: Wire letter spawning into progressLevel and BasicChunk**

```js
// src/store/gameStore.js — modify progressLevel to decide letter spawning
progressLevel: () => set((state) => {
  const [, ...rest] = state.activeChunks
  const lastChunk = state.activeChunks[state.activeChunks.length - 1]
  const weights = getChunkWeights(state.mechanicalDeaths)
  const nextType = pickChunkType(weights)

  const nextLetter = state.targetWord[state.inventory.length]
  const hasLetter = nextLetter !== undefined && Math.random() < 0.4

  const newChunk = {
    id: `chunk-${Date.now()}-${Math.random()}`,
    type: nextType,
    position: [0, -0.5, lastChunk.position[2] - 10],
    hasLetter,
    letter: hasLetter ? nextLetter : null,
  }

  return { activeChunks: [...rest, newChunk] }
}),
```

```jsx
// src/components/Chunks.jsx — modify BasicChunk to render Collectible
import { Collectible } from './Collectible.jsx'

export function BasicChunk({ position, chunk }) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
      {chunk?.hasLetter && (
        <Collectible letter={chunk.letter} position={[position[0], position[1] + 1.5, position[2]]} />
      )}
    </RigidBody>
  )
}

// update ChunkRenderer to pass the full chunk object through:
export function ChunkRenderer({ chunk }) {
  switch (chunk.type) {
    case 'basic':
      return <BasicChunk position={chunk.position} chunk={chunk} />
    case 'gap':
      return <GapChunk position={chunk.position} />
    default:
      return null
  }
}
```

(Note: placing the `<Collectible>`'s sensor collider as a child of a
`RigidBody` that already has `colliders="cuboid"` for the floor mesh would
create two colliders on one body. Since `Collectible` renders its own
nested `<RigidBody type="fixed" colliders={false}>` internally, this is
fine — it's a separate rigid body, not sharing the floor's.)

- [ ] **Step 7: Manual verification**

Run: `npm run dev`. Run forward and observe:
1. A floating gold letter occasionally appears matching the next needed
   character of `targetWord` (visible via a temporary console log of
   `useGameStore.getState().targetWord` if needed).
2. Touching the correct letter: it shrinks/fades over ~300ms then
   disappears; no instant pop.
3. Collect all 3 letters of "CAT" — verify the character's capsule color
   changes and a new `targetWord` loads (check via console:
   `useGameStore.getState().targetWord`).

- [ ] **Step 8: Commit**

```bash
git add src/store/gameStore.js src/components/Collectible.jsx src/components/Chunks.jsx
git commit -m "Add letter collection, cognitive strike tracking, and cosmetic unlocks"
```

---

### Task 11: Safety Mode — bumpers and environmental signaling

**Files:**
- Modify: `src/components/Chunks.jsx` (add bumper meshes with explicit colliders to both chunk types)
- Modify: `src/App.jsx` (animated background/fog color via `@react-spring/three`)

**Interfaces:**
- Consumes: `useGameStore().mechanicalDeaths` (already in store).
- Produces: visual/physical Safety Mode signaling with no new store fields
  needed (`mechanicalDeaths >= 6` is computed inline where needed).

- [ ] **Step 1: Add shared bumper geometry and render bumpers on BasicChunk**

```jsx
// src/components/Chunks.jsx — add near the other module-scope geometry
const bumperGeometry = new THREE.BoxGeometry(1, 2, 10)
const bumperMaterial = new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true })

// modify BasicChunk:
import { useGameStore } from '../store/gameStore.js'

export function BasicChunk({ position, chunk }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const [x, y, z] = position

  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
      {chunk?.hasLetter && (
        <Collectible letter={chunk.letter} position={[x, y + 1.5, z]} />
      )}
      {isSafeMode && (
        <>
          <mesh geometry={bumperGeometry} material={bumperMaterial} position={[-4.5, 1, 0]} />
          <CuboidCollider args={[0.5, 1, 5]} position={[-4.5, 1, 0]} />
          <mesh geometry={bumperGeometry} material={bumperMaterial} position={[4.5, 1, 0]} />
          <CuboidCollider args={[0.5, 1, 5]} position={[4.5, 1, 0]} />
        </>
      )}
    </RigidBody>
  )
}
```

(`CuboidCollider` half-extents are `[0.5, 1, 5]` — half of the bumper's
1×2×10 full dimensions — matching the shared `bumperGeometry`. These are
explicit siblings, not relying on the parent `RigidBody`'s auto-collider
generation, per spec §3.5's required fix.)

- [ ] **Step 2: Add the same bumper treatment to GapChunk's landing edges**

```jsx
// src/components/Chunks.jsx — modify GapChunk
export function GapChunk({ position }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const [x, y, z] = position

  return (
    <>
      <RigidBody type="fixed" position={[x, y, z + 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
        {isSafeMode && (
          <>
            <mesh geometry={bumperGeometry} material={bumperMaterial} position={[-4.5, 1, 0]} />
            <CuboidCollider args={[0.5, 1, 5]} position={[-4.5, 1, 0]} />
            <mesh geometry={bumperGeometry} material={bumperMaterial} position={[4.5, 1, 0]} />
            <CuboidCollider args={[0.5, 1, 5]} position={[4.5, 1, 0]} />
          </>
        )}
      </RigidBody>
      <RigidBody type="fixed" position={[x, y, z - 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
        {isSafeMode && (
          <>
            <mesh geometry={bumperGeometry} material={bumperMaterial} position={[-4.5, 1, 0]} />
            <CuboidCollider args={[0.5, 1, 5]} position={[-4.5, 1, 0]} />
            <mesh geometry={bumperGeometry} material={bumperMaterial} position={[4.5, 1, 0]} />
            <CuboidCollider args={[0.5, 1, 5]} position={[4.5, 1, 0]} />
          </>
        )}
      </RigidBody>
    </>
  )
}
```

- [ ] **Step 3: Add animated background/fog color to App.jsx**

```jsx
// src/App.jsx
import { useSpring, animated } from '@react-spring/three'
import { useGameStore } from './store/gameStore.js'

// inside App component, before the return:
const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
const { bgColor } = useSpring({
  bgColor: isSafeMode ? '#2a0a4a' : '#87ceeb',
})

// inside <Canvas>, add as the first children:
// <animated.color attach="background" args={[bgColor]} />
// <animated.fog attach="fog" args={[bgColor, 10, 50]} />
```

Note: `useSpring`'s `bgColor` output is an animated string interpolation,
not directly usable as `args`. Use `to()` for the color-to-array
conversion, or simpler: drive a `THREE.Color` via `useFrame` lerp instead
of `react-spring` for this specific case, since `react-spring`'s color
interpolation into `attach="background"` requires the `animated.color`
wrapper with a properly interpolated value. If `animated.color` proves
awkward, an acceptable simpler substitute verified to work is:

```jsx
// simpler alternative if animated.color causes issues:
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

function SafeModeBackground() {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const colorRef = useRef(new THREE.Color('#87ceeb'))
  useFrame(({ scene }) => {
    const target = new THREE.Color(isSafeMode ? '#2a0a4a' : '#87ceeb')
    colorRef.current.lerp(target, 0.02)
    scene.background = colorRef.current
  })
  return null
}
```

Mount `<SafeModeBackground />` inside `<Canvas>` if this path is taken.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Deliberately fall off the map 6 times in a row (don't
spell any words in between, to avoid resetting `mechanicalDeaths`).

Verify:
1. On the 6th death and respawn, the sky/fog visibly shifts toward purple.
2. Neon wireframe bumpers appear on both sides of basic platforms AND on
   the landing edges of gap platforms.
3. The player physically cannot fall off the left/right edge of a chunk
   while bumpers are active (walk directly into a bumper — it should block
   movement, not just look present).
4. Spelling a word (completing the current `targetWord`) resets
   `mechanicalDeaths` to 0 and the sky/bumpers revert.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chunks.jsx src/App.jsx
git commit -m "Add Safety Mode bumpers with explicit colliders and environmental signaling"
```

---

### Task 12: Persistent cosmetics via partialize

**Files:**
- Modify: `src/store/gameStore.js` (wrap in `persist` middleware with `partialize`)

**Interfaces:**
- Consumes: nothing new.
- Produces: cosmetic state (`unlockedColors`, `equippedColor`,
  `unlockedTrails`, `equippedTrail`, `masteredWords`, `totalCoins`,
  `currentTier`) now survives a browser refresh; everything else does not.

- [ ] **Step 1: Wrap the store creator in persist with partialize**

```js
// src/store/gameStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// ... other imports unchanged

export const useGameStore = create(
  persist(
    (set, get) => ({
      // ... entire existing store body unchanged
    }),
    {
      name: 'obby-save-data',
      partialize: (state) => ({
        unlockedColors: state.unlockedColors,
        equippedColor: state.equippedColor,
        unlockedTrails: state.unlockedTrails,
        equippedTrail: state.equippedTrail,
        masteredWords: state.masteredWords,
        totalCoins: state.totalCoins,
        currentTier: state.currentTier,
      }),
    }
  )
)
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`. Play until at least one word is spelled (unlocking a
color). Refresh the browser.

Verify:
1. `localStorage` (DevTools → Application → Local Storage) contains a key
   `obby-save-data` with only the 7 partialized fields — confirm
   `inventory`, `activeChunks`, `playerZ` are NOT present in the stored JSON.
2. After refresh, `equippedColor` is still the unlocked color (not reset
   to `'hotpink'`), confirmed either visually (once Task 13's lobby shows
   it) or via `useGameStore.getState().equippedColor` in console.
3. `inventory` and `targetWord` reset to their initial values on refresh
   (session-only state correctly does NOT persist).

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.js
git commit -m "Add persist middleware scoped to cosmetic state via partialize"
```

---

### Task 13: Lobby, ShowcasePlayer, and App coordinator

**Files:**
- Create: `src/components/ShowcasePlayer.jsx`
- Create: `src/components/LobbyUI.jsx`
- Modify: `src/store/gameStore.js` (add `equipColor`, `equipTrail`, `startGame` actions)
- Modify: `src/App.jsx` (conditionally mount Physics/Player/LevelManager vs. ShowcasePlayer based on `gameState`)

**Interfaces:**
- Consumes: `equippedColor`, `equippedTrail`, `unlockedColors`,
  `unlockedTrails`, `gameState` from store.
- Produces: `equipColor(color)`, `equipTrail(trail)`, `startGame()` actions;
  `<ShowcasePlayer />`, `<LobbyUI />` components.

- [ ] **Step 1: Add lobby actions to the store**

```js
// src/store/gameStore.js — add inside the store body
equipColor: (color) => set({ equippedColor: color }),
equipTrail: (trail) => set({ equippedTrail: trail }),
startGame: () => {
  set({ gameState: 'playing', inventory: [] })
  get().spawnInitialChunks()
},
```

Also change the store's initial `gameState` from `'playing'`-adjacent
testing values back to `'lobby'` if any manual testing in prior tasks
changed it (it should already default to `'lobby'` per Task 2's original
skeleton — confirm this is still the case).

- [ ] **Step 2: Create ShowcasePlayer (visual-only, no physics)**

```jsx
// src/components/ShowcasePlayer.jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'

export function ShowcasePlayer() {
  const groupRef = useRef()
  const equippedColor = useGameStore((state) => state.equippedColor)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <Float floatIntensity={1} rotationIntensity={0}>
      <group ref={groupRef} position={[0, 1, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.4, 1]} />
          <meshStandardMaterial color={equippedColor} />
        </mesh>
      </group>
    </Float>
  )
}
```

(v1 omits the trail preview on the showcase — `equippedTrail` visualization
in the lobby is a nice-to-have not required for the core loop; the trail
still applies once in `'playing'` state if Task 14's dust/trail work adds
it to the real `Player`. This is a deliberate scope trim, noted here rather
than silently dropped.)

- [ ] **Step 3: Create LobbyUI**

```jsx
// src/components/LobbyUI.jsx
import { useGameStore } from '../store/gameStore.js'

export function LobbyUI() {
  const gameState = useGameStore((state) => state.gameState)
  const unlockedColors = useGameStore((state) => state.unlockedColors)
  const equippedColor = useGameStore((state) => state.equippedColor)
  const equipColor = useGameStore((state) => state.equipColor)
  const startGame = useGameStore((state) => state.startGame)

  if (gameState !== 'lobby') return null

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '2rem', pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto', background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
        padding: '1rem', borderRadius: '0.5rem', maxWidth: '300px',
      }}>
        <h3 style={{ color: 'white' }}>Colors</h3>
        {unlockedColors.map((color) => (
          <button
            key={color}
            onClick={() => equipColor(color)}
            style={{
              background: color, width: '3rem', height: '3rem', margin: '0.25rem',
              border: color === equippedColor ? '3px solid white' : '1px solid gray',
              borderRadius: '50%', cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
        <button
          onClick={startGame}
          style={{
            fontSize: '2rem', padding: '1rem 3rem', borderRadius: '2rem',
            background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer',
          }}
        >
          PLAY
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire conditional mounting into App.jsx**

```jsx
// src/App.jsx — restructure to conditionally mount based on gameState
import { useGameStore } from './store/gameStore.js'
import { ShowcasePlayer } from './components/ShowcasePlayer.jsx'
import { LobbyUI } from './components/LobbyUI.jsx'

// inside App():
const gameState = useGameStore((state) => state.gameState)

// inside <Canvas>, replace unconditional <Physics>...</Physics> with:
// {gameState === 'lobby' && <ShowcasePlayer />}
// {(gameState === 'playing' || gameState === 'dead') && (
//   <Physics gravity={[0, -9.81, 0]}>
//     <LevelManager />
//     <Player />
//   </Physics>
// )}

// in the DOM overlay area (outside Canvas):
// <LobbyUI />
// <OverlayUI />
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`.

1. On load, the Lobby renders: rotating capsule in the equipped color,
   color swatch buttons, PLAY button. No physics running (confirm no
   console warnings from Rapier about an uninitialized world, and that the
   capsule floats/rotates rather than falling).
2. Clicking a color swatch changes the showcase capsule's color instantly.
3. Clicking PLAY transitions into the game — `<ShowcasePlayer>` unmounts,
   `<Physics>`/`<LevelManager>`/`<Player>` mount, treadmill begins.
4. Dying and respawning does NOT return to the lobby (confirmed accepted
   v1 limitation per spec §3.4) — respawn goes straight back to `'playing'`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ShowcasePlayer.jsx src/components/LobbyUI.jsx src/store/gameStore.js src/App.jsx
git commit -m "Add Lobby, ShowcasePlayer, and gameState-driven mount coordination"
```

---

### Task 14: Dust particles, sound effects, contact shadows

**Files:**
- Modify: `src/components/Player.jsx` (dust effect sub-component, contact shadows)
- Create: `src/audio/sounds.js`
- Modify: `src/components/Collectible.jsx` (collect sound)
- Modify: `src/components/OverlayUI.jsx` (death sound, wrong-letter feedback)
- Modify: `src/store/gameStore.js` (no changes needed — sound triggers read existing state changes)

**Interfaces:**
- Consumes: existing store fields (`gameState`, `cognitiveStrikes`).
- Produces: audio-visual polish with no new state contracts for other
  tasks to depend on (this is a leaf task).

- [ ] **Step 1: Create sound wrapper module**

```js
// src/audio/sounds.js
import useSound from 'use-sound'

// Placeholder sound URLs — replace with actual asset files in public/sounds/
// once available. Using data-URI silence as a safe default so the hook
// doesn't 404 during development if assets aren't added yet.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export function useCollectSound() {
  return useSound('/sounds/collect.mp3', { volume: 0.5 })
}

export function useDeathSound() {
  return useSound('/sounds/fall.mp3', { volume: 0.5 })
}

export function useWrongLetterSound() {
  return useSound('/sounds/buzz.mp3', { volume: 0.4 })
}

export function useWinSound() {
  return useSound('/sounds/fanfare.mp3', { volume: 0.6 })
}
```

Note: this task assumes sound asset files will be added to `public/sounds/`
separately (not generated by this plan — they're binary audio assets, out
of scope for an implementation plan to author). If files are absent,
`use-sound` will fail to load silently in most browsers (a console 404,
not a crash) — acceptable for a first pass; add real assets before final
playtesting.

- [ ] **Step 2: Wire collect sound into Collectible.jsx**

```jsx
// src/components/Collectible.jsx — add import and call
import { useCollectSound } from '../audio/sounds.js'

// inside Collectible component:
const [playCollect] = useCollectSound()

// inside onIntersectionEnter handler, before collectLetter(letter):
playCollect()
```

- [ ] **Step 3: Wire death sound into OverlayUI.jsx**

```jsx
// src/components/OverlayUI.jsx
import { useEffect, useRef } from 'react'
import { useDeathSound } from '../audio/sounds.js'

// inside OverlayUI component:
const [playDeath] = useDeathSound()
const prevGameState = useRef(gameState)

useEffect(() => {
  if (gameState === 'dead' && prevGameState.current !== 'dead') {
    playDeath()
  }
  prevGameState.current = gameState
}, [gameState, playDeath])
```

- [ ] **Step 4: Add wrong-letter sound + visual flash, wired to cognitiveStrikes changes**

```jsx
// src/components/OverlayUI.jsx — add
import { useWrongLetterSound } from '../audio/sounds.js'
import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

// inside OverlayUI component:
const cognitiveStrikes = useGameStore((state) => state.cognitiveStrikes)
const [playWrongLetter] = useWrongLetterSound()
const prevStrikes = useRef(cognitiveStrikes)
const [flashRed, setFlashRed] = useState(false)

useEffect(() => {
  if (cognitiveStrikes > prevStrikes.current) {
    playWrongLetter()
    setFlashRed(true)
    const timeout = setTimeout(() => setFlashRed(false), 200)
    return () => clearTimeout(timeout)
  }
  prevStrikes.current = cognitiveStrikes
}, [cognitiveStrikes, playWrongLetter])

// in the rendered JSX, add a full-screen red flash overlay:
// {flashRed && (
//   <div style={{
//     position: 'absolute', inset: 0, background: 'rgba(255,0,0,0.3)',
//     pointerEvents: 'none',
//   }} />
// )}
```

- [ ] **Step 5: Add dust particle effect to Player.jsx**

```jsx
// src/components/Player.jsx — add sub-component and wire into useFrame
import { useState, useEffect } from 'react'
import { Sparkles } from '@react-three/drei'

function DustEffect({ active }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!active) return
    setMounted(true)
    const timeout = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(timeout) // guards against unmount mid-timeout (spec §3.9)
  }, [active])

  if (!mounted) return null

  return <Sparkles count={15} scale={[1, 0.2, 1]} size={4} speed={0.5} color="#e0e0e0" />
}

// inside the main Player component, add:
const [dustActive, setDustActive] = useState(false)
const prevVelY = useRef(0)

// inside the existing useFrame, after reading translation, add:
const { y: velY } = rigidBodyRef.current.linvel()
const wasFalling = prevVelY.current < -0.5
const nowGrounded = Math.abs(velY) < 0.1
if (wasFalling && nowGrounded) {
  setDustActive(true)
  setTimeout(() => setDustActive(false), 50) // re-arm the trigger quickly
}
prevVelY.current = velY

// in the returned JSX, inside <Ecctrl>, alongside the mesh:
// <DustEffect active={dustActive} />
```

(This `setState`-from-`useFrame` call is event-triggered — a handful of
times per session, not every frame — which is the acceptable case
distinguished from continuous per-frame `set()` calls in spec §3.9/Global
Constraints. Do not generalize this pattern to anything that fires every
frame.)

- [ ] **Step 6: Add ContactShadows under the player**

```jsx
// src/App.jsx — add inside <Canvas>, alongside Physics
import { ContactShadows } from '@react-three/drei'
// <ContactShadows position={[0, -0.49, 0]} opacity={0.4} scale={10} blur={2} far={10} />
```

- [ ] **Step 7: Manual verification**

Run: `npm run dev`.

1. Jump and land — verify a brief dust puff appears at the feet (visually;
   sound may 404 silently if assets aren't added yet, that's expected per
   Step 1's note).
2. Collect a correct letter — verify collect sound attempts to play (or
   404s gracefully) and the spring-shrink animation from Task 10 still works.
3. Collect a decoy letter — verify a brief red flash appears on screen.
4. Fall to death — verify death sound attempt fires once per death (not
   repeatedly).
5. Confirm no console errors about setting state after unmount when dying
   immediately after a jump (tests the dust effect's cleanup timing).

- [ ] **Step 8: Commit**

```bash
git add src/components/Player.jsx src/audio/sounds.js src/components/Collectible.jsx src/components/OverlayUI.jsx src/App.jsx
git commit -m "Add dust particles, sound effect hooks, and wrong-letter visual feedback"
```

---

### Task 15: Full-loop manual playtest and Vercel deploy prep

**Files:**
- Create: `vercel.json` (only if default Vite detection needs overriding — verify first)
- Modify: none expected; this task is verification + deployment, not new features.

**Interfaces:** none — this is the final integration check.

- [ ] **Step 1: Full playtest checklist**

Run: `npm run dev`. Play through, in order:

1. Lobby loads, no physics running, showcase capsule visible and rotating.
2. Click PLAY — treadmill starts, first `targetWord` is "CAT" (onboarding
   rule), first ~10 chunks are flat with no gaps or hazards.
3. Collect C, A, T in order — cosmetic unlock applies, sky/character
   updates, next word loads.
4. Deliberately miss a jump on a `GapChunk` — fall, death modal appears,
   respawn returns to `'playing'` at Z=0 with fresh chunks.
5. Deliberately collect 3 wrong letters in a row on one word — verify tier
   downgrades and a new word from the lower tier loads.
6. Deliberately die 6 times without completing a word — verify Safety Mode
   visual/bumper changes trigger; verify bumpers physically block edge falls
   on both chunk types.
7. Complete a word after Safety Mode is active — verify
   `mechanicalDeaths` resets and the environment reverts to normal.
8. Sprint (hold Shift+W) continuously for 60+ seconds — verify the
   treadmill never runs out of loaded track ahead of the player.

- [ ] **Step 2: Run the full automated test suite**

Run: `npx vitest run`
Expected: all tests across `gameStore.logic.test.js` and `gameStore.test.js`
pass.

- [ ] **Step 3: Verify the production build compiles cleanly**

Run: `npm run build`
Expected: a `dist/` folder is created with no build errors or warnings.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "Complete v1 playtest verification"
```

- [ ] **Step 5: Deploy to Vercel**

This step requires the user to connect their GitHub account to Vercel
(an account-linking action outside what this plan can automate). Document
the steps rather than execute them:

1. Push this repository to GitHub (requires the user to create a remote
   and authorize the push — do not do this without explicit confirmation,
   since it makes the repo visible outside the local machine).
2. Go to vercel.com, sign in with GitHub, "Add New… Project", import the
   repo.
3. Vercel auto-detects Vite; default build command `npm run build`, output
   directory `dist` — accept defaults.
4. Click Deploy.

No `vercel.json` is needed for a standard Vite SPA — Vercel's Vite preset
handles this by default. Only add one if the deployed site 404s on
non-root routes (not expected for this single-page app with no router).
