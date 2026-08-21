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
