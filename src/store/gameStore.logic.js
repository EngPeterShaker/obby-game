export function getChunkWeights(mechanicalDeaths) {
  if (mechanicalDeaths >= 6) return { basic: 1.0, gap: 0.0 }
  if (mechanicalDeaths >= 3) return { basic: 0.9, gap: 0.1 }
  return { basic: 0.7, gap: 0.3 }
}

export function pickChunkType(weights) {
  const roll = Math.random()
  return roll < weights.basic ? 'basic' : 'gap'
}

export function pickNextWord(tier, masteredWords, vocabData) {
  const pool = vocabData[tier].words
  const unmastered = pool.filter((w) => !masteredWords.includes(w))
  const candidates = unmastered.length > 0 ? unmastered : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Decides which letter (correct-next or decoy) should be offered for a
// newly-spawned chunk. Decoys are required so cognitive failure (spec §3.5)
// is actually reachable in real play — without them the only object present
// is always the correct answer, which tests navigation, not spelling.
export function pickLetterForChunk(targetWord, inventoryLength) {
  const nextLetter = targetWord[inventoryLength]
  if (nextLetter === undefined) return null // word already complete, no letter needed

  const isDecoy = Math.random() < 0.5 // roughly half the spawned letters are decoys
  if (!isDecoy) return nextLetter

  let decoy
  do {
    decoy = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  } while (decoy === nextLetter)
  return decoy
}

export function assignTierByLength(word) {
  if (word.length <= 3) return 'level_1'
  if (word.length === 4) return 'level_2'
  return 'level_3'
}

const TIERS = ['level_1', 'level_2', 'level_3']

// A word that's both parent-added and parent-hidden resolves as hidden: the
// parent's explicit removal should always win over an (accidental or stale) add.
export function getEffectiveVocabulary(vocabData, customWords) {
  const { addedWords = {}, hiddenWords = [] } = customWords
  const result = {}

  for (const tier of TIERS) {
    const builtin = vocabData[tier].words.filter((w) => !hiddenWords.includes(w))
    // Exclude words already present as builtins (as well as hidden ones) so a
    // corrupted/legacy addedWords entry that duplicates a builtin word can never
    // produce a duplicate in the merged output — the array-dedupe safety net
    // described in the invariant test below.
    const added = (addedWords[tier] || []).filter(
      (w) => !hiddenWords.includes(w) && !builtin.includes(w)
    )
    result[tier] = {
      rewardPool: vocabData[tier].rewardPool,
      words: [...builtin, ...added],
    }
  }

  return result
}
