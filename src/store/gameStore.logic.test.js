import { describe, it, expect, vi } from 'vitest'
import { getChunkWeights, pickChunkType, pickNextWord, applyCognitiveStrike, getTierRewardAction, pickLetterForChunk } from './gameStore.logic.js'
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
    const allWords = vocabData.level_1.words
    const lastWord = allWords[allWords.length - 1]
    const mastered = allWords.slice(0, -1)
    const word = pickNextWord('level_1', mastered, vocabData)
    expect(word).toBe(lastWord)
  })

  it('falls back to the full pool if all words in tier are mastered', () => {
    const mastered = [...vocabData.level_1.words]
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

describe('pickLetterForChunk', () => {
  it('returns the correct next letter when the roll is at/above the decoy threshold', () => {
    // isDecoy = Math.random() < 0.5, so a roll >= 0.5 means NOT a decoy.
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(pickLetterForChunk('CAT', 1)).toBe('A')
    vi.restoreAllMocks()
  })

  it('returns a decoy letter when the roll is below the decoy threshold', () => {
    // First call: decoy-decision roll (< 0.5 => decoy). Second call: picks
    // the alphabet index. With targetWord 'CAT' and inventoryLength 1, the
    // correct next letter is 'A' (index 0). Force the alphabet-index roll to
    // land on 'B' (index 1) to get a deterministic, unambiguous decoy.
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // decoy decision: isDecoy = true
      .mockReturnValueOnce(1 / 26) // alphabet index roll -> 'B'
    const result = pickLetterForChunk('CAT', 1)
    expect(result).toBe('B')
    expect(result).not.toBe('A')
    vi.restoreAllMocks()
  })

  it('never returns the correct next letter when it decides to decoy', () => {
    const targetWord = 'CAT'
    const inventoryLength = 1 // correct next letter is 'A'
    for (let i = 0; i < 50; i++) {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1) // force isDecoy = true
        .mockReturnValueOnce(Math.random()) // random alphabet index each iteration
      const result = pickLetterForChunk(targetWord, inventoryLength)
      expect(result).not.toBe('A')
      vi.restoreAllMocks()
    }
  })

  it('returns null when the word is already complete', () => {
    expect(pickLetterForChunk('CAT', 3)).toBeNull()
    expect(pickLetterForChunk('CAT', 4)).toBeNull()
  })
})
