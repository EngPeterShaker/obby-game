export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const VOWELS = ['A', 'E', 'I', 'O', 'U']
export const ARABIC_ALPHABET = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
]

export const GAME_MODES = [
  { id: 'spelling_en', label: 'English Spelling', icon: '🇺🇸', description: 'Spell English words letter by letter' },
  { id: 'spelling_ar', label: 'تهجئة الكلمات العربية', icon: '🇸🇦', description: 'تهجئة الكلمات العربية من اليمين لليسار' },
  { id: 'vowels_en', label: 'Missing Vowels', icon: '🅰️', description: 'Find and collect the missing vowels (A, E, I, O, U)' },
  { id: 'math_basic', label: 'Math Equations', icon: '🔢', description: 'Solve arithmetic equations by collecting numbers' },
]

export function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text)
}

export function normalizeObjective(target) {
  if (!target) {
    return {
      mode: 'spelling_en',
      display: 'CAT',
      sequence: ['C', 'A', 'T'],
      rawTarget: 'CAT',
      rtl: false,
    }
  }

  if (typeof target === 'string') {
    const rtl = isArabic(target)
    return {
      mode: rtl ? 'spelling_ar' : 'spelling_en',
      display: target,
      sequence: target.split(''),
      rawTarget: target,
      rtl,
    }
  }

  return {
    mode: target.mode || (target.rtl ? 'spelling_ar' : 'spelling_en'),
    display: target.display || (target.sequence ? target.sequence.join('') : ''),
    sequence: target.sequence || (typeof target.display === 'string' ? target.display.split('') : []),
    rawTarget: target.rawTarget || target.display || '',
    rtl: Boolean(target.rtl),
    displayTokens: target.displayTokens || null,
  }
}

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
  const pool = vocabData[tier]?.words || vocabData.level_1.words
  const unmastered = pool.filter((w) => !masteredWords.includes(w))
  const candidates = unmastered.length > 0 ? unmastered : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function generateMathObjective(tier) {
  let display = ''
  let answer = 0
  let rawTarget = ''

  if (tier === 'level_1') {
    const isAdd = Math.random() < 0.6
    if (isAdd) {
      const a = Math.floor(Math.random() * 5) + 1
      const b = Math.floor(Math.random() * 5) + 1
      answer = a + b
      display = `${a} + ${b} = _`
      rawTarget = `${a} + ${b} = ${answer}`
    } else {
      const b = Math.floor(Math.random() * 4) + 1
      const ans = Math.floor(Math.random() * 5) + 1
      const a = b + ans
      answer = ans
      display = `${a} - ${b} = _`
      rawTarget = `${a} - ${b} = ${answer}`
    }
  } else if (tier === 'level_2') {
    const pattern = Math.floor(Math.random() * 3)
    if (pattern === 0) {
      const a = Math.floor(Math.random() * 9) + 3
      const b = Math.floor(Math.random() * 9) + 2
      answer = a + b
      display = `${a} + ${b} = _`
      rawTarget = `${a} + ${b} = ${answer}`
    } else if (pattern === 1) {
      const b = Math.floor(Math.random() * 8) + 2
      const ans = Math.floor(Math.random() * 9) + 2
      const a = b + ans
      answer = ans
      display = `${a} - ${b} = _`
      rawTarget = `${a} - ${b} = ${answer}`
    } else {
      const a = Math.floor(Math.random() * 8) + 2
      const ans = Math.floor(Math.random() * 7) + 2
      const c = a + ans
      answer = ans
      display = `${a} + _ = ${c}`
      rawTarget = `${a} + ${ans} = ${c}`
    }
  } else {
    const isMult = Math.random() < 0.5
    if (isMult) {
      const a = Math.floor(Math.random() * 7) + 2
      const b = Math.floor(Math.random() * 6) + 2
      answer = a * b
      display = `${a} × ${b} = _`
      rawTarget = `${a} × ${b} = ${answer}`
    } else {
      const a = Math.floor(Math.random() * 25) + 15
      const b = Math.floor(Math.random() * 12) + 4
      answer = a - b
      display = `${a} - ${b} = _`
      rawTarget = `${a} - ${b} = ${answer}`
    }
  }

  return {
    mode: 'math_basic',
    display,
    sequence: [String(answer)],
    rawTarget,
    rtl: false,
  }
}

export function generateVowelObjective(tier, masteredWords, vocabData) {
  const word = pickNextWord(tier, masteredWords, vocabData).toUpperCase()
  const chars = word.split('')
  const vowelsInWord = []
  const displayTokens = []

  chars.forEach((ch, idx) => {
    if (VOWELS.includes(ch)) {
      vowelsInWord.push(ch)
      displayTokens.push({ char: '_', isVowel: true, target: ch, index: idx })
    } else {
      displayTokens.push({ char: ch, isVowel: false, target: ch, index: idx })
    }
  })

  if (vowelsInWord.length === 0) {
    return {
      mode: 'vowels_en',
      display: word,
      sequence: [word[0]],
      rawTarget: word,
      rtl: false,
    }
  }

  const display = displayTokens.map((t) => t.char).join(' ')

  return {
    mode: 'vowels_en',
    display,
    displayTokens,
    sequence: vowelsInWord,
    rawTarget: word,
    rtl: false,
  }
}

export function pickNextObjective(mode, tier, masteredWords, vocabData, arabicVocabData) {
  if (mode === 'math_basic') {
    return generateMathObjective(tier)
  }

  if (mode === 'vowels_en') {
    return generateVowelObjective(tier, masteredWords, vocabData)
  }

  if (mode === 'spelling_ar') {
    const arabicPool = arabicVocabData || vocabData
    const word = pickNextWord(tier, masteredWords, arabicPool)
    return {
      mode: 'spelling_ar',
      display: word,
      sequence: word.split(''),
      rawTarget: word,
      rtl: true,
    }
  }

  const word = pickNextWord(tier, masteredWords, vocabData)
  return {
    mode: 'spelling_en',
    display: word,
    sequence: word.split(''),
    rawTarget: word,
    rtl: false,
  }
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

export function pickLetterForChunk(targetInput, inventoryLength) {
  const objective = normalizeObjective(targetInput)
  const nextItem = objective.sequence[inventoryLength]
  if (nextItem === undefined) return null // completed

  const isDecoy = Math.random() < 0.5
  if (!isDecoy) return nextItem

  let decoy
  if (objective.mode === 'math_basic') {
    const numAns = parseInt(nextItem, 10)
    const offsets = [-3, -2, -1, 1, 2, 3, 4]
    const validOffsets = isNaN(numAns)
      ? [1, 2, 3]
      : offsets.filter((o) => numAns + o >= 0 && String(numAns + o) !== nextItem)
    const pickedOffset = validOffsets[Math.floor(Math.random() * validOffsets.length)] || 2
    decoy = isNaN(numAns) ? '4' : String(Math.max(0, numAns + pickedOffset))
  } else if (objective.mode === 'vowels_en') {
    const availableVowels = VOWELS.filter((v) => v !== nextItem)
    decoy = availableVowels[Math.floor(Math.random() * availableVowels.length)]
  } else if (objective.mode === 'spelling_ar' || objective.rtl) {
    const availableArabic = ARABIC_ALPHABET.filter((a) => a !== nextItem)
    decoy = availableArabic[Math.floor(Math.random() * availableArabic.length)]
  } else {
    do {
      decoy = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    } while (decoy === nextItem)
  }

  return decoy
}

export function assignTierByLength(word) {
  if (word.length <= 3) return 'level_1'
  if (word.length === 4) return 'level_2'
  return 'level_3'
}

const TIERS = ['level_1', 'level_2', 'level_3']

export function getEffectiveVocabulary(vocabData, customWords) {
  const { addedWords = {}, hiddenWords = [] } = customWords
  const result = {}

  for (const tier of TIERS) {
    const builtin = vocabData[tier].words.filter((w) => !hiddenWords.includes(w))
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
