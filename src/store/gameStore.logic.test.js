import { describe, it, expect, vi } from 'vitest'
import { getChunkWeights, pickChunkType, pickNextWord, applyCognitiveStrike, getTierRewardAction } from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'

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

describe('getTierRewardAction', () => {
  it('returns the reward object for the given tier', () => {
    expect(getTierRewardAction('level_1', vocabData)).toEqual({ type: 'color', value: 'blue' })
    expect(getTierRewardAction('level_2', vocabData)).toEqual({ type: 'trail', value: 'orange' })
  })
})
