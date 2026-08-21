# Parent Word Admin Panel — Design Spec

**Status:** Approved for planning
**Date:** 2026-08-21

## 1. Purpose

Let a parent add or remove spelling words from the game's vocabulary
without editing code or redeploying. Scoped to word management only —
adding/removing words within the three existing difficulty tiers. No tier
restructuring, no mastery/progress management, no multi-user accounts.

**Audience:** the same parent(s) already running this project locally/on
Vercel, managing vocabulary for their own child.

## 2. Constraints

- The app is a pure static SPA (Vite, no backend, no serverless functions,
  deployed to Vercel via GitHub CI/CD — see `CLAUDE.md`). This feature must
  not require a backend, database, or server-side auth.
- The built-in word list (`src/data/vocabulary.json`) is bundled at build
  time and cannot be edited at runtime — it's read-only from the browser's
  perspective.
- Word management is **single-device**: a parent's added/removed words live
  in that browser's `localStorage` and do not sync across devices. This is
  an accepted limitation, not a bug — cross-device sync would require a
  real backend, which is explicitly out of scope for this feature.

## 3. Access gate

A small lock icon sits next to the existing ⚙️ Settings gear in
`LobbyUI.jsx`. Clicking it opens a modal presenting a single-digit ×
single-digit multiplication problem, generated fresh (`Math.floor(Math.random() * 9) + 1`
for each operand) every time the modal opens — e.g. "7 × 8 = ?" — with a
numeric input and an Unlock button.

- Correct answer → the word admin panel opens.
- Wrong answer → show an inline error ("Try again") and generate a new
  problem; no attempt limit or lockout.

**This is explicitly friction, not security.** It exists only to stop a
young child from casually wandering into word-editing mid-play; it is not
intended to resist a deliberate, older, or technically curious user. No PIN
or code is stored anywhere — the check is computed and thrown away each
time.

## 4. Data model

A new localStorage-persisted store, separate from the game's existing
Zustand `persist`/`partialize` (see `CLAUDE.md`'s "State shape" section) —
word-list edits are a distinct concern from game progress and should not
share the same persistence key or `partialize` allowlist.

```js
// Shape persisted under a new localStorage key, e.g. 'obby-custom-vocab'
{
  addedWords: {
    level_1: ['string', ...],
    level_2: ['string', ...],
    level_3: ['string', ...],
  },
  hiddenWords: ['string', ...], // built-in words the parent removed
}
```

- `addedWords` is keyed by tier because tier assignment happens once, at
  add-time (see §5) — a word doesn't move between tiers later.
- `hiddenWords` is a flat list (not tier-keyed) since a hidden built-in
  word is identified by its text, and `vocabulary.json`'s built-in words
  are all distinct strings across tiers.

## 5. Adding a word

Parent types a word into a single input (per-tier "add" field in the
panel UI, see §7). On submit:

1. Uppercase and trim the input (matching the existing all-caps convention
   in `vocabulary.json`).
2. Validate: non-empty, letters only (`A-Z` after uppercasing) — reject
   anything else with an inline error, no silent failure.
3. Auto-assign tier by length: ≤3 letters → `level_1`, 4 letters →
   `level_2`, 5+ letters → `level_3`. This mirrors the existing tier
   labels shown in the Lobby's difficulty selector ("Level 1: Easy, 3
   Letters" / "Level 2: Medium, 4 Letters" / "Level 3: Hard, 5+ Letters"),
   so a parent doesn't need to separately reason about which tier a word
   belongs to.
4. Reject duplicates: if the word (after uppercasing) already exists in
   that tier's *effective* list (built-in minus hidden, plus already-added
   — see §6), do not add it again; show an inline "already in the list"
   message.
5. Append to `addedWords[tier]`.

## 6. Removing a word / merging with built-ins

A new pure function in `src/store/gameStore.logic.js` (consistent with
that file's existing pure, unit-tested style):

```js
export function getEffectiveVocabulary(vocabData, customWords) {
  // customWords: { addedWords: {level_1: [...], ...}, hiddenWords: [...] }
  // Returns a new object shaped like vocabData, with each tier's `words`
  // array replaced by (builtin words minus hiddenWords) plus addedWords
  // for that tier. `tierReward` passes through unchanged.
}
```

All existing consumers of `vocabData` (`pickNextWord`, `pickLetterForChunk`
via the word it's checking against, `getTierRewardAction`) continue to
receive a `vocabData`-shaped object — the seam is `getEffectiveVocabulary`
computing that object once, not scattered merge logic in each consumer.
`gameStore.js` calls `getEffectiveVocabulary` once (e.g. memoized on the
custom-words store's state) and passes the result through wherever it
currently passes `vocabData`.

**Removing a word** works uniformly regardless of origin:
- If the word is in the tier's built-in list (from `vocabulary.json`),
  add it to `hiddenWords`.
- If the word is in `addedWords[tier]` (parent-added), remove it from that
  array directly — no need to "hide" something that only exists because
  the parent added it.

A **"Restore all defaults"** button clears `hiddenWords` to `[]` (does not
touch `addedWords` — a parent's added words aren't "defaults" to restore
away).

**Edge case — removing the last word in a tier:** if a parent hides/removes
every word in a tier (leaving zero effective words), `pickNextWord` would
have an empty pool to select from. The panel must prevent this: disable
the ✕ remove button on a tier's last remaining word (with a tooltip/message
explaining why), so a tier can never reach zero words through the panel.

## 7. Panel UI

A new component, `src/components/WordAdminPanel.jsx`, rendered as a modal
(consistent with `SettingsModal.jsx`/`ControlsModal.jsx`'s existing modal
pattern in this codebase). Structure:

- Three sections/tabs, one per tier (Level 1 / Level 2 / Level 3), each
  showing:
  - The tier's current *effective* word list (via `getEffectiveVocabulary`),
    each word with a small ✕ button to remove it (disabled per the
    last-word edge case above).
  - An "add word" text input + button at the bottom of that tier's list.
- A "Restore all defaults" button, positioned separately (not per-tier,
  since `hiddenWords` isn't tier-keyed) — e.g. at the bottom of the panel.
- Closing the panel (✕ or backdrop click) simply closes it; there's no
  separate "Save" step — each add/remove writes to localStorage
  immediately (consistent with how `equipColor`/`equipTrail` etc. already
  write through Zustand's `persist` immediately in this codebase, not on
  an explicit save action).

## 8. Testing

Per this project's established testing philosophy (`CLAUDE.md`, "Testing"
section): pure logic gets unit tests, rendering/visual behavior does not.

- `getEffectiveVocabulary` is unit-tested in `gameStore.logic.test.js`
  (or a new adjacent test file), covering: built-in words pass through
  unchanged when no customization exists; a hidden built-in word is
  excluded; an added word appears in its assigned tier; a word both
  added and later hidden (edge case — shouldn't normally happen via the
  UI, but the merge function should still resolve deterministically,
  e.g. hidden wins) behaves sensibly.
- The tier-assignment-by-length logic (§5, step 3) is a small pure
  function on its own and should be unit-tested the same way.
- The math-gate's problem generation/checking is simple enough (multiply
  two random 1-9 integers, compare to input) that it doesn't need
  dedicated unit tests beyond a manual check — consistent with this
  project's precedent of not testing trivial UI-only logic.

## 9. Explicitly out of scope

- Cross-device sync (would require a real backend — noted as a possible
  future direction, not built now).
- Editing tier definitions (word-length cutoffs) or adding new tiers.
- Managing `masteredWords` / progress reset from this panel.
- Any real authentication — the math gate is friction only, not security.
- Export/import of custom word lists (discussed as a possible middle
  ground for cross-device use during brainstorming, but not included in
  this spec's scope — a candidate for a later, separate addition if
  cross-device need actually arises).
