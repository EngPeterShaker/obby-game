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

export function getTierRewardAction(tier, vocabData) {
  return vocabData[tier].tierReward
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
