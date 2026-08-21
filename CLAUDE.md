# Obby Game

A browser-based 3D obstacle-course ("Obby") game for a young child: run and
jump along a procedurally-generated infinite road, collect letters to spell
target words, and unlock cosmetic rewards. Built with Vite + React Three
Fiber + Rapier physics + `ecctrl` + Zustand.

Live: https://obby-game-eight.vercel.app (auto-deploys on push to `main` via
Vercel's GitHub integration — see "Deployment" below).

## Stack

- **Build**: Vite + React 18
- **3D**: `@react-three/fiber`, `@react-three/drei`
- **Physics**: `@react-three/rapier` (Rapier/WASM)
- **Character controller**: `ecctrl@1.0.82` — pinned deliberately. Newer
  `ecctrl` majors (2.x) require peer deps (`@react-three/fiber >=9.4`,
  `@react-three/rapier >=2.2.0`, `react >=19`) incompatible with this
  project's stack. 1.0.82 is the newest 1.x release, fully peer-compatible,
  installs without `--legacy-peer-deps`. Do not bump `ecctrl` without
  re-verifying its actual ref/prop API against the new version's source —
  its API has changed shape across majors before.
- **State**: Zustand, `persist` middleware with `partialize` (see "State
  shape" below)
- **Audio**: `use-sound` (Howler wrapper), real asset files in
  `public/sounds/` (see "Audio" below)
- **Testing**: Vitest, `jsdom` environment (required — see "Testing")
- **Hosting**: Vercel, static build, connected to GitHub for CI/CD

## Running it

```bash
npm run dev      # dev server
npm run build    # production build → dist/
npx vitest run   # full test suite
```

**Never open `index.html` directly as a `file://` URL** — it's a Vite
entry point that needs the dev server to transform/serve the JSX modules;
opening it straight from disk will not work.

## Architecture

### DOM / Canvas boundary

Two ecosystems, kept deliberately separate:
- **DOM**: menus, HUD, modals (`LobbyUI.jsx`, `OverlayUI.jsx`,
  `SettingsModal.jsx`, `ControlsModal.jsx`) — normal React re-renders.
- **Canvas** (`App.jsx`'s `<Canvas>`): 60fps R3F/Rapier render+physics loop.
  High-frequency data (player position) never triggers a React re-render.

### State: reactive vs. transient (`src/store/gameStore.js`)

The Zustand store splits into two categories, and mixing them up is the
single most consequential mistake to avoid in this codebase:

- **Reactive** (via `set()`): `gameState`, `inventory`, `targetWord`,
  `currentTier`, `cognitiveStrikes`, `mechanicalDeaths`, `masteredWords`,
  `sessionCoins`/`totalCoins`, `unlockedColors`/`equippedColor`,
  `unlockedTrails`/`equippedTrail`, `cameraPreset`.
- **Transient** (mutated directly, `useGameStore.getState().field = value`,
  **never** `set()`): `playerZ`, `activeChunks`. These are read/written
  every physics frame in `useFrame` — running them through `set()` would
  force a React reconciliation 60x/second and tank frame rate.

**Persistence**: `persist` wraps the whole store, but `partialize`
(exported separately as `partializeGameState` so tests exercise the real
function, not a copy) restricts what survives a reload to exactly:
`unlockedColors`, `equippedColor`, `unlockedTrails`, `equippedTrail`,
`masteredWords`, `totalCoins`, `currentTier`, `cameraPreset`. Session state
(`inventory`, `targetWord`, `activeChunks`, etc.) intentionally does not
persist — a reload should not resurrect a half-spelled word or a stale
chunk window.

### Procedural level — the infinite treadmill

`LevelManager.jsx` (mounted only when `gameState` is `'playing'`/`'dead'`)
maintains a sliding window of ~10 chunks (`Chunks.jsx`'s `BasicChunk` /
`GapChunk`, 10 units apart on Z). The generation trigger is a
**lookahead-margin check**, not a fixed array index:

```js
// generate while less than 30 units (3 chunks) of track remain ahead
while (iterations < MAX_CHUNKS_PER_FRAME) {
  const lastChunk = ...activeChunks.at(-1)
  if (playerZ >= lastChunk.position[2] + 30) break
  progressLevel()
  iterations++
}
```

This is a **bounded loop**, not a single guarded call — an earlier version
fired `progressLevel()` at most once per frame, which only extends track by
10 units/frame; any sustained player speed above 10 Z-units/frame (reachable
via frame hitches, since `playerZ` is raw Rapier `translation()`, not
clamped by `maxVelLimit`) caused the loaded track to shrink over time until
the player ran off the end into the void. **If you ever touch this loop,
preserve the "loop until margin satisfied" behavior — do not revert to a
single call per frame.** `MAX_CHUNKS_PER_FRAME = 50` is a runaway safety
valve only.

Chunk type (`basic`/`gap`) is picked by `getChunkWeights(mechanicalDeaths)`
+ `pickChunkType(weights)` in `gameStore.logic.js` — weights shift toward
100% `basic` ("Safety Mode") once `mechanicalDeaths >= 6`. The first 10
chunks from `spawnInitialChunks()` are hardcoded to `basic` regardless of
weights — a guaranteed-safe onboarding runway.

### Letters: correct vs. decoy

`pickLetterForChunk(targetWord, inventoryLength)` in `gameStore.logic.js`
decides what letter (if any) a newly-generated chunk offers: it returns the
correct next letter roughly half the time, and a random decoy letter (never
equal to the correct one) the other half. **This decoy path is required,
not optional** — without it, cognitive failure (wrong-letter collection)
is unreachable in real play, `cognitiveStrikes` never increments outside
unit tests, tier downgrade never fires, and `masteredWords` mastery
tracking is meaningless (always true, since strikes are always 0). This
was a real gap found and fixed during a whole-branch review — don't
reintroduce a "letters only spawn correct" version of this function.

**Collectible positioning**: `<Collectible position={[0, 1.5, 0]} />` in
`Chunks.jsx` is a **chunk-local offset**, not a world position. `BasicChunk`
and `GapChunk` wrap their contents in an outer `<group position={...}>`
that already applies the chunk's world transform; `Collectible.jsx` then
renders its own nested `<RigidBody position={position}>` inside that group.
Rapier composes the full `matrixWorld` (parent × child) when computing a
nested RigidBody's actual physics translation — passing world coordinates
here would double-apply the chunk's own position and the letter would
drift further out of reach as the treadmill advances (an earlier version
had exactly this bug: letters became unreachable within a few dozen
chunks). If you add another nested-RigidBody child anywhere in the scene
graph, its `position` prop must always be local to its immediate parent
transform, never a recomputed world coordinate.

### Cognitive difficulty (`applyCognitiveStrike` in `gameStore.logic.js`)

`cognitiveStrikes` resets to 0 on **every** letter-collection outcome that
isn't itself a strike increment — including the "collected the correct
letter, word not yet finished" case (`gameStore.js`'s `collectLetter`,
final `return` branch, marked `// THE FIX`). An earlier version only reset
strikes on word-completion or on the 3-strike downgrade, letting strikes
leak across multiple separately-completed words and trigger a spurious
downgrade from accumulated minor mistakes rather than genuine per-word
struggle. **Do not remove that reset from the non-final correct-letter
branch.**

At exactly 3 strikes, `applyCognitiveStrike` downgrades `currentTier` one
level (floor: `level_1`) and picks a fresh word from the downgraded tier's
actual word pool (via `pickNextWord`) — never a hardcoded literal.

### Mechanical difficulty / Safety Mode

`mechanicalDeaths` increments on `die()` (Y-bounds check in `Player.jsx`'s
`useFrame`, `y < -10`) and resets to 0 on word completion. At `>= 6`:
- Chunk weights go 100% `basic` (`getChunkWeights`)
- `App.jsx`'s `SafeModeBackground` lerps the sky/fog toward purple
- `Chunks.jsx` renders neon wireframe bumpers on both `BasicChunk` and
  `GapChunk` edges, each paired with an **explicit** `<CuboidCollider>`
  sibling — do not rely on the parent `RigidBody`'s `colliders="cuboid"`
  auto-generation to cover additional mesh children; it does generate one
  collider per mesh child (verified against `@react-three/rapier`'s
  source), which produces a harmless coincident duplicate on the bumpers,
  intentionally left as-is (see the comment in `Chunks.jsx`) rather than
  worked around.

### Player controller (`Player.jsx`)

`ecctrl`'s `ref` forwards the **raw Rapier `RigidBody`** directly — no
wrapper object, no `useImperativeHandle`. `.translation()`, `.linvel()`,
`.setTranslation()`, `.setLinvel()`, `.setAngvel()` are called straight on
the ref. Confirmed keyboard action names from `ecctrl`'s own readme:
`leftward`/`rightward`, **not** `left`/`right` (see `App.jsx`'s
`keyboardMap`). There is no `lockRotations` prop on this version — rotation
lock comes from `autoBalance` (default true) or manual
`setEnabledRotations()`.

Movement is now a hybrid: `ecctrl` still owns walk/turn/camera-follow, but
jump and sprint are driven manually inside `Player.jsx`'s own `useFrame`
(direct `setLinvel`/`applyImpulse` calls gated on keyboard state via
`useKeyboardControls`), layered on top of `ecctrl`'s built-in jump/sprint
rather than relying on ecctrl's own `jumpVel`/`sprintMult` alone. There's
an 800ms grace period after respawn before the death check re-arms
(`respawnTimeRef`), added to fix a race where a double-click respawn could
immediately re-trigger death mid-teleport.

Four camera presets (`CAMERA_CONFIGS`: `low`/`classic`/`high`/`close`) are
selectable via `SettingsModal.jsx` and stored in `cameraPreset` (persisted).
`<Ecctrl key={cameraPreset}>` forces a full remount on preset change since
`ecctrl` reads its camera config only at mount.

The visual character is `BlockyCharacter.jsx` — a hand-built, rigged
Minecraft-style voxel figure (animated arm/leg swing via `useFrame` when
moving), not a plain capsule. `equippedColor` drives its shirt color;
`equippedTrail`, when set, wraps it in Drei's `<Trail>`.

### Cosmetic rewards

Reward mapping is data-driven from `vocabulary.json`'s `tierReward` field
(`{type: 'color'|'trail', value: string}`), looked up via
`getTierRewardAction` — **never** hardcoded `if (word === 'X')` branches.
Adding a new tier/reward means editing `vocabulary.json`, not adding a
branch in `gameStore.js`.

## Files

```
src/
├── App.jsx                    # Canvas + DOM coordination, keyboard map,
│                               # Safety Mode sky/fog, gameState-gated mounts
├── store/
│   ├── gameStore.js           # Zustand store: all state + actions
│   ├── gameStore.logic.js     # Pure functions (no React/Zustand/R3F) —
│   │                           # chunk weights, word/letter picking,
│   │                           # cognitive-strike transitions, rewards
│   ├── gameStore.logic.test.js
│   ├── gameStore.test.js
│   └── gameStore.persist.test.js
├── data/
│   └── vocabulary.json        # Tiered word lists + reward mapping
├── audio/
│   └── sounds.js              # use-sound hook wrappers
└── components/
    ├── Player.jsx             # ecctrl wrapper, jump/sprint, death/respawn
    ├── BlockyCharacter.jsx     # Rigged voxel character mesh
    ├── ShowcasePlayer.jsx      # Lobby-only visual clone (NO Rapier/ecctrl —
    │                           # must stay physics-free, no Physics world
    │                           # is mounted while gameState === 'lobby')
    ├── Chunks.jsx              # BasicChunk/GapChunk/ChunkRenderer, road/
    │                           # lava/tree scenery, Safety Mode bumpers
    ├── LevelManager.jsx        # Sliding-window treadmill (see above)
    ├── Collectible.jsx         # Letter sensor, float/spin, spring collect
    ├── LobbyUI.jsx             # Difficulty tiers, outfit picker, PLAY
    ├── OverlayUI.jsx           # HUD (word-reveal/peek mechanic), death
    │                           # modal, wrong-letter flash, win celebration
    ├── SettingsModal.jsx       # Camera preset picker
    └── ControlsModal.jsx       # How-to-play, responsive to touch/desktop
```

`gameStore.logic.js` is deliberately pure (zero React/Zustand/R3F imports)
— every non-trivial decision (chunk weighting, word/letter selection,
cognitive-strike transitions, reward lookup) lives here specifically so it
can be unit-tested as plain functions. This is where every real bug in this
project's history has lived; if you add new decision logic, put it here
and test it here rather than inlining it into a component or the store's
`set()` calls.

## Testing

`vite.config.js` sets `test: { environment: 'jsdom' }` — **required**,
not optional. The store is unconditionally wrapped in `persist`, which
needs `localStorage`; the default Vitest `node` environment has none, and
running without `jsdom` produces (harmless but noisy) zustand-persist
warnings on every test. Don't remove this config.

`npx vitest run` — currently 32 tests across 3 files, all pure
store-logic/state tests. There is no component/rendering test layer;
physics and visual behavior are verified by manual playtest in a real
browser, not automated tests (three.js/Rapier scene behavior isn't
practical to unit test at this project's scale).

## Audio

`src/audio/sounds.js` exports `use-sound` hooks (`useCollectSound`,
`useDeathSound`, `useWrongLetterSound`, `useWinSound`, `useCoinSound`)
referencing files in `public/sounds/`. Real asset files now exist there
(`collect.mp3`, `fall.mp3`, `buzz.mp3`, `fanfare.mp3`, plus some `.wav`
duplicates and a `coin.mp3`/`success.mp3`) — this was a known gap for a
while (silent 404s) and has since been closed. No background music loop
exists or was ever planned — only short one-shot SFX triggered by discrete
state changes (collect, death, wrong-letter, word-complete), never
continuous/looping audio.

## Deployment

Vercel project `obby-game` (org `engpetershakers-projects`) is connected
to GitHub (`EngPeterShaker/obby-game`) via Vercel's Git integration:
**every push to `main` auto-deploys to production**; other
branches/PRs get preview deployments with auto-commented PR links. No
`vercel.json` — Vite/`dist/` is auto-detected. No backend, no serverless
functions, no environment variables needed; it's a pure static SPA.

If the Vercel CLI is ever needed locally, keep it current — an old CLI
(<47.2.2 as of this writing) fails uploads against the current API with an
opaque `AbortError`, not a clear version-mismatch message.

## Explicitly out of scope (not built, not planned)

- NPC/LLM chat bots — would need a serverless proxy for API-key safety,
  breaking the "pure static" deployment; not part of this project.
- Mobile touch joystick controls as a dedicated input scheme (though
  `ControlsModal.jsx` does responsive device detection for its own
  display).
- Docker/CI containers, Kubernetes — irrelevant for a static Vercel app;
  was considered early on purely as an infrastructure-practice exercise
  and deliberately dropped.
- Background music.

## History note

This project went through an unusually explicit design process: a long
brainstorming conversation (critiquing an AI-orchestrated "vibecoding"
workflow proposal in detail, catching real bugs before any code existed),
a written spec and task-by-task implementation plan
(`docs/superpowers/specs/`, `docs/superpowers/plans/`), then per-task
implementation with review/fix loops, then a final whole-branch review.
That process caught several real, non-obvious bugs documented above (the
treadmill throughput cap, the cognitive-strike reset, the collectible
position double-transform, the missing decoy letters) — each survived
individual review passes because it only became visible from a
whole-system view. A meaningful amount of further iteration (camera
tuning, the blocky character model, difficulty-tier selection, the
word-reveal/peek HUD mechanic, touch/tablet responsiveness, the double-
click respawn race fix, real audio assets) happened afterward in sessions
not reflected in those design docs — treat the docs as historical record of
the v1 foundation, and this file plus the actual source as the source of
truth for current behavior.
