import { describe, it, expect, vi } from 'vitest'
import { getChunkWeights, pickChunkType, pickNextWord, applyCognitiveStrike, pickReward, pickLetterForChunk, assignTierByLength, getEffectiveVocabulary } from './gameStore.logic.js'
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

describe('assignTierByLength', () => {
  it('assigns 3-letter-or-shorter words to level_1', () => {
    expect(assignTierByLength('CAT')).toBe('level_1')
    expect(assignTierByLength('GO')).toBe('level_1')
  })

  it('assigns 4-letter words to level_2', () => {
    expect(assignTierByLength('JUMP')).toBe('level_2')
  })

  it('assigns 5-or-more-letter words to level_3', () => {
    expect(assignTierByLength('SPACE')).toBe('level_3')
    expect(assignTierByLength('ROCKETSHIP')).toBe('level_3')
  })
})

describe('getEffectiveVocabulary', () => {
  const baseVocab = {
    level_1: { rewardPool: [{ type: 'color', value: '#0000ff', label: 'Blue' }], words: ['CAT', 'DOG'] },
    level_2: { rewardPool: [{ type: 'trail', value: '#ffa500', label: 'Orange' }], words: ['JUMP'] },
    level_3: { rewardPool: [{ type: 'color', value: '#ffd700', label: 'Gold' }], words: ['SPACE'] },
  }

  it('passes through unchanged when no customization exists', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG'])
    expect(result.level_2.words).toEqual(['JUMP'])
    expect(result.level_3.words).toEqual(['SPACE'])
  })

  it('excludes a hidden built-in word', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: ['CAT'] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['DOG'])
  })

  it('includes an added word in its tier', () => {
    const customWords = { addedWords: { level_1: ['SUN'], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG', 'SUN'])
  })

  it('resolves a word both added and hidden as hidden (hidden wins)', () => {
    const customWords = { addedWords: { level_1: ['SUN'], level_2: [], level_3: [] }, hiddenWords: ['SUN'] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.words).toEqual(['CAT', 'DOG'])
  })

  it('passes rewardPool through unchanged', () => {
    const customWords = { addedWords: { level_1: [], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    expect(result.level_1.rewardPool).toEqual([{ type: 'color', value: '#0000ff', label: 'Blue' }])
  })

  it('never produces duplicate words even if addedWords accidentally overlaps with a builtin word', () => {
    const customWords = { addedWords: { level_1: ['CAT'], level_2: [], level_3: [] }, hiddenWords: [] }
    const result = getEffectiveVocabulary(baseVocab, customWords)
    const uniqueWords = new Set(result.level_1.words)
    expect(result.level_1.words.length).toBe(uniqueWords.size)
  })
})

describe('Multi-mode objectives and generators', () => {
  it('identifies Arabic text correctly', async () => {
    const { isArabic } = await import('./gameStore.logic.js')
    expect(isArabic('قطة')).toBe(true)
    expect(isArabic('CAT')).toBe(false)
    expect(isArabic('1 + 2 = 3')).toBe(false)
  })

  it('normalizes string targets and objective objects properly', async () => {
    const { normalizeObjective } = await import('./gameStore.logic.js')
    const eng = normalizeObjective('DOG')
    expect(eng.mode).toBe('spelling_en')
    expect(eng.sequence).toEqual(['D', 'O', 'G'])
    expect(eng.rtl).toBe(false)

    const ar = normalizeObjective('شمس')
    expect(ar.mode).toBe('spelling_ar')
    expect(ar.sequence).toEqual(['ش', 'م', 'س'])
    expect(ar.rtl).toBe(true)
  })

  it('generates valid math objectives with correct sequences', async () => {
    const { generateMathObjective } = await import('./gameStore.logic.js')
    const obj = generateMathObjective('level_1')
    expect(obj.mode).toBe('math_basic')
    expect(obj.sequence.length).toBe(1)
    expect(Number.isInteger(parseInt(obj.sequence[0], 10))).toBe(true)
    expect(obj.display).toContain('_')
  })

  it('generates vowel objectives with missing vowel masks', async () => {
    const { generateVowelObjective } = await import('./gameStore.logic.js')
    const mockVocab = { level_1: { words: ['CAT'] } }
    const obj = generateVowelObjective('level_1', [], mockVocab)
    expect(obj.mode).toBe('vowels_en')
    expect(obj.sequence).toEqual(['A'])
    expect(obj.display).toContain('_')
  })

  it('picks Arabic letter decoys when in Arabic mode', async () => {
    const { pickLetterForChunk, ARABIC_ALPHABET } = await import('./gameStore.logic.js')
    const arObj = {
      mode: 'spelling_ar',
      display: 'قطة',
      sequence: ['ق', 'ط', 'ة'],
      rtl: true,
    }
    // Correct next is 'ق'
    // Decoy roll
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1) // force decoy
    const decoy = pickLetterForChunk(arObj, 0)
    expect(ARABIC_ALPHABET).toContain(decoy)
    expect(decoy).not.toBe('ق')
    vi.restoreAllMocks()
  })

  it('picks vowel decoys when in vowels mode', async () => {
    const { pickLetterForChunk, VOWELS } = await import('./gameStore.logic.js')
    const vowelObj = {
      mode: 'vowels_en',
      display: 'C _ T',
      sequence: ['A'],
      rtl: false,
    }
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1) // force decoy
    const decoy = pickLetterForChunk(vowelObj, 0)
    expect(VOWELS).toContain(decoy)
    expect(decoy).not.toBe('A')
    vi.restoreAllMocks()
  })
})

