# AI Obby Game — Design Spec

**Status:** Approved for planning
**Date:** 2026-08-21

## 1. Purpose

A browser-based 3D obstacle-course ("Obby") game for a young child, combining
platforming with a spelling mechanic: collect letters scattered through the
level to spell target words, unlocking cosmetic rewards. Built with an
AI-orchestrated development workflow, but implemented against a locked
architecture to avoid the "vibecoded spaghetti" failure mode.

**Audience:** one specific child, played locally/deployed for personal use.
**Non-goals for v1:** multiplayer, NPC/LLM chat bots, mobile touch controls,
containerized deployment infrastructure.

## 2. Tech Stack

- **Build tool:** Vite + React
- **Rendering:** React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`)
- **Physics:** Rapier (`@react-three/rapier`)
- **Character controller:** `ecctrl` — chosen over a hand-rolled controller
  to avoid re-solving slope/stair/wall-snag edge cases. **Implementation
  risk:** `ecctrl`'s exact ref-forwarding behavior and prop API must be
  verified against the actually-installed version's docs/source before
  wiring teleport/respawn code — do not assume the API shape from prior
  discussion.
- **State:** Zustand, with `persist` middleware scoped via `partialize` (see
  §5) to avoid persisting session-only state.
- **Hosting:** static deploy to Vercel (client-only app, no backend needed
  for v1 scope).

## 3. Architecture

### 3.1 DOM / Canvas boundary

Two ecosystems, kept strictly separate:
- **DOM (React):** menus, HUD, modals. Normal React re-render semantics.
- **Canvas (R3F/Rapier):** 60fps render + physics loop. High-frequency data
  (player position) must never trigger a React re-render.

### 3.2 State store shape

Single Zustand store, split into reactive and transient sections:

```js
{
  // --- Reactive UI state (triggers re-renders via set()) ---
  gameState: 'lobby',        // 'lobby' | 'playing' | 'dead' | 'won'
  inventory: [],             // current word-in-progress, array of chars
  targetWord: 'CAT',
  currentTier: 'level_1',
  cognitiveStrikes: 0,       // wrong letters collected on the CURRENT word only
  mechanicalDeaths: 0,       // falls since last word completed
  masteredWords: [],
  sessionCoins: 0,
  totalCoins: 0,

  // --- Persistent (see partialize, §5) ---
  unlockedColors: ['hotpink'],
  equippedColor: 'hotpink',
  unlockedTrails: [],
  equippedTrail: null,

  // --- Transient physics-loop state (mutated directly, NEVER via set()) ---
  playerZ: 0,
  activeChunks: [],
}
```

**Rule:** anything read/written inside a `useFrame` loop every frame (player
position) is mutated via `useGameStore.getState().playerZ = z` — never
`set()`. Anything that changes on discrete events (death, collect, win) uses
`set()` normally.

### 3.3 Procedural level generation — Infinite Treadmill

- Level is built from 10×1×10 unit "chunks" placed along -Z, each with a
  standardized entry/exit exactly 10 units apart.
- Chunk types: `BasicChunk` (flat platform), `GapChunk` (two 10×4 platforms
  with a 2-unit gap).
- **Sliding window:** ~10 chunks loaded at any time. As the player advances,
  old chunks (behind the player) are removed and new ones appended ahead.
- **Trigger condition (fixed from original design):** generation is
  triggered by a *lookahead margin*, not a fixed array index. Specifically:
  if fewer than 3 chunks remain ahead of the player's current Z position
  (`playerZ < activeChunks[activeChunks.length - 1].position[2] + 30`),
  remove the oldest chunk and append a new one. This is robust to player
  speed (sprinting via `ecctrl`'s `run` input) — the original fixed-second-
  index trigger (`playerZ < activeChunks[1].position[2]`) could starve the
  treadmill if the player moved fast enough to cross two thresholds before
  a new chunk was appended, causing them to run off the end of loaded track
  into empty space. This fix is a **required correctness constraint**, not
  an optional optimization.
- **Playability bound:** vertical offset between consecutive chunks is
  capped at ±2 units. This bound must be evaluated on any transition
  *through* a `GapChunk`, not just chunk-type-independently — an elevated
  exit stacked with a negative-offset gap entry is a harder jump than either
  variable alone suggests. v1 accepts this as a known limitation (rare edge
  case, not solved with full rigor) rather than building a combinatorial
  jump-solver; if unmakeable jumps are observed in playtesting, tighten the
  offset cap further before adding solver logic.
- Chunk selection uses a **weighted randomizer**, weights driven by
  `mechanicalDeaths` (see §3.5).

### 3.4 Death & respawn

- No physical death-plane sensor (avoids tunneling risk + unnecessary
  physics overhead). Instead: a mathematical Y-bounds check inside
  `Player.jsx`'s `useFrame` — `if (y < -10) die()`.
- `die()` sets `gameState: 'dead'` and increments `mechanicalDeaths`.
- `restart()` sets `gameState: 'playing'`, calls `spawnInitialChunks()`
  (rebuilding the starting 10 chunks at Z=0 — required because the original
  chunks are long gone on the treadmill), and resets `inventory`.
- Player teleport on respawn: `setTranslation({x:0,y:5,z:0})` +
  `setLinvel({x:0,y:0,z:0})` to clear falling momentum.
- **No path exists from `dead` back to `lobby`** in v1 — respawn returns
  directly to `playing`. The Lobby's cosmetic-equip screen is reachable only
  at session start / after a manual page reload. This is an accepted v1
  limitation, not an oversight.

### 3.5 Adaptive difficulty — decoupled mechanical vs. cognitive failure

Two independent failure types, tracked and responded to separately:

**Mechanical failure (falling off the map):**
- Tracked via `mechanicalDeaths`.
- Drives chunk-type selection weights:
  - 0-2 deaths: 70% Basic / 30% Gap
  - 3-5 deaths: 90% Basic / 10% Gap
  - 6+ deaths: 100% Basic ("Safety Mode")
- Resets to 0 when the player successfully spells a target word.
- **Safety Mode visual/physical signaling** (triggers at `mechanicalDeaths
  >= 6`):
  - Background color + fog animate (sky blue → deep purple) via
    `@react-spring/three`.
  - Physical neon-wireframe guardrail meshes appear on **both** `BasicChunk`
    edges **and** `GapChunk`'s landing-platform edges (the original design
    only bumpered `BasicChunk`, which doesn't address the actual fall risk —
    `GapChunk`'s edges, right at the jump, are where mechanical failure
    actually happens). Bumper meshes **must** have explicit
    `<CuboidCollider>` siblings — do not rely on the parent `RigidBody`'s
    default collider auto-generation, which may not cover additional child
    meshes depending on the `colliders` prop already set on that RigidBody.
  - No text modal. The environment change itself is the signal.

**Cognitive failure (wrong letter collected):**
- Tracked via `cognitiveStrikes`, scoped to the **current word only**.
- **Critical fix from original design:** `cognitiveStrikes` must reset to 0
  every time a new word begins — including the "collected correct letter,
  word not yet finished" transition. The original design only reset strikes
  on word-completion or on the 3-strike downgrade, meaning strikes leaked
  across multiple separately-completed words and could trigger a downgrade
  from accumulated minor mistakes rather than genuine per-word struggle.
  Correct behavior: strikes are purely per-attempt-at-current-word.
- At 3 strikes on the current word: downgrade `currentTier` one level down
  (never below `level_1`) and immediately swap to a new `targetWord` drawn
  from that tier's pool in `vocabulary.json` — **not** a hardcoded literal
  (the original design hardcoded `'CAT'` as the downgrade landing word,
  which drifts from the data file if it's ever edited).
- **Wrong-letter feedback is required, not silent:** collecting a decoy
  letter must trigger a distinguishable negative cue (a short buzz/negative
  sound + brief red flash on the HUD) — silently swallowing the decoy with
  no feedback (as in the original design) gives the child no signal that
  anything went wrong.
- **Decoy letters:** chunks may spawn a letter that is NOT the next-needed
  character in `targetWord`, so cognitive failure is actually possible (a
  generator that only ever spawns the correct next letter isn't testing
  spelling, it's testing "walk into the only object present").

### 3.6 Vocabulary & progression

- Vocabulary externalized to `src/data/vocabulary.json`, structured by tier:
  ```json
  {
    "level_1": { "tierReward": "blue", "words": ["CAT", "DOG", "SUN", "HAT"] },
    "level_2": { "tierReward": "orange_trail", "words": ["JUMP", "FAST", "BIRD", "STAR"] },
    "level_3": { "tierReward": "robot_skin", "words": ["SPACE", "ROCKET", "PLANET"] }
  }
  ```
- Zustand does not hold the whole dictionary — only `currentTier`,
  `targetWord`, `masteredWords`. A word is drawn at random from the
  unmastered subset of the current tier's pool.
- **Onboarding rule:** the very first `targetWord` is hardcoded to a
  3-letter word (`'CAT'`) regardless of what's in the JSON, and the
  procedural generator must not spawn a `GapChunk` or any hazard within the
  first 10 chunks — a flat, safe runway so the child learns the core loop
  (run, jump, collect) before difficulty appears.
- Completing a word's letter sequence:
  1. If `cognitiveStrikes === 0` for that word, add it to `masteredWords`.
  2. Apply the tier's cosmetic reward (see §3.7).
  3. Reset `inventory` and `cognitiveStrikes` to 0, reset `mechanicalDeaths`
     to 0.
  4. Draw next `targetWord` from the (possibly now-advanced) tier.

### 3.7 Cosmetic progression (data-driven, not hardcoded branches)

- Reward mapping lives as data, not as nested if/else chains keyed on
  specific word strings (the original design's `if (targetWord === 'BLUE')
  ... else if (targetWord === 'FIRE')` pattern doesn't scale — every new
  unlock requires hand-editing branch logic). Use the tier's `tierReward`
  field from `vocabulary.json` directly: on tier-completion, look up
  `tierReward` and apply it generically (`type: 'color'` → push to
  `unlockedColors` + set `equippedColor`; `type: 'trail'` → push to
  `unlockedTrails` + set `equippedTrail`).
- `persist` middleware **must** use `partialize` to persist only
  `unlockedColors`, `equippedColor`, `unlockedTrails`, `equippedTrail`,
  `masteredWords`, `totalCoins`, `currentTier` — NOT `inventory`,
  `targetWord`, `cognitiveStrikes`, `mechanicalDeaths`, `activeChunks`,
  `playerZ`. Persisting the full store by default (the original design's
  unscoped `persist(...)` wrap) would silently carry partial-word progress
  and transient physics state across reloads in ways nobody decided on
  purpose.

### 3.8 Lobby / Showcase

- `gameState === 'lobby'` renders `<LobbyUI>` (DOM overlay: color/trail
  swatches, PLAY button) and `<ShowcasePlayer>` (a **visual-only** rotating
  character preview — explicitly no Rapier, no `ecctrl`, no physics
  engine mounted at all while in the lobby).
- `startGame()` transitions to `'playing'`, mounts `<Physics>`,
  `<LevelManager>`, `<Player>` (the real physics-driven character),
  unmounts `<ShowcasePlayer>`.

### 3.9 Polish (included in v1 per scope decision)

- **Sound:** triggered by Zustand state *changes* (e.g., watch
  `sessionCoins`, play a "ding" on increment), not spatial R3F audio
  attached to meshes — overkill for this game's scale. Library:
  `use-sound`.
- **Collectible animation:** on intersection, do not instantly unmount.
  Trigger a ~300ms `@react-spring/three` scale-down + slight upward drift,
  then unmount.
- **Dust particles:** `<Sparkles>` burst on jump/land transitions, detected
  via vertical-velocity sign changes in `useFrame`. Implemented as a
  child component gated by local `useState` — acceptable because it's
  event-triggered (a few times per second at most), unlike the continuous
  per-frame case that transient Zustand mutation exists to avoid. Must
  guard against `setTimeout`-after-unmount (clear the timeout on unmount)
  since a death can interrupt the 300ms window.
- **Contact shadows:** Drei's `<ContactShadows>` under the player instead
  of full directional shadow maps (cheaper).

### 3.10 Performance — Flyweight resource sharing

All static `THREE.BoxGeometry` / `THREE.MeshStandardMaterial` instances used
by repeatedly-spawned chunks (floor, bumpers) are declared **once, at module
scope**, outside any component body, and referenced by all instances —
never declared inline inside a component's return statement (which would
allocate new GPU memory on every chunk spawn/despawn cycle and cause GC
stutter).

## 4. Explicitly deferred (not in v1)

- NPC/LLM chat bots (proximity-triggered chat, API bridge) — real feature,
  needs its own cost-control design; revisit as a separate follow-up spec.
- Mobile touch controls (`ecctrl-joystick` or hand-rolled overlay).
- Docker / Nginx / GitHub Actions CI-registry / Kubernetes — none of this
  is required for a client-only static app on Vercel; treated as a future,
  separate infrastructure-practice exercise if desired, not part of this
  plan.

## 5. Testing approach

Given the physics/procedural-generation-heavy nature of this app, "does it
look right" is insufficient (multiple bugs in earlier design iterations —
the treadmill index math, the cognitive-strikes leak — would have passed a
casual visual check while being wrong). Where feasible:
- Pure logic (chunk-weight calculation, cognitive-strike/tier transitions,
  cosmetic-reward lookup, vocabulary pool selection) should be unit-tested
  as plain functions, independent of React/R3F, since this is where the
  session's actual bugs lived.
- Physics/rendering behavior (grounding, collision, visual layout) is
  verified manually via the dev server, per-task, since automated testing
  of a live physics simulation is out of scope for this project's size.

## 6. Open risks carried into implementation

- `ecctrl`'s actual current API (ref shape, prop names) is unverified —
  confirm against installed-version docs/source before writing
  teleport/respawn/position-sync code.
- The combined vertical-offset + gap-width playability bound is not
  rigorously solved (§3.3) — accepted risk for v1, revisit if playtesting
  surfaces unmakeable jumps.
