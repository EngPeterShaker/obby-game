import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getChunkWeights,
  pickChunkType,
  applyCognitiveStrike,
  pickNextWord,
  pickNextObjective,
  normalizeObjective,
  pickReward,
  pickLetterForChunk,
  getEffectiveVocabulary,
} from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'
import arabicVocabData from '../data/arabic_vocab.json'
import { useCustomWordsStore } from './customWordsStore.js'

function getCurrentVocab(mode = 'spelling_en') {
  const customWords = useCustomWordsStore.getState()
  if (mode === 'spelling_ar') {
    return getEffectiveVocabulary(arabicVocabData, customWords)
  }
  return getEffectiveVocabulary(vocabData, customWords)
}

function getEffectiveObjective(state) {
  if (state.targetObjective && state.targetWord === state.targetObjective.display) {
    return state.targetObjective
  }
  return normalizeObjective(state.targetWord || state.targetObjective)
}

// Export partialize function separately for testing purposes
export const partializeGameState = (state) => ({
  unlockedColors: state.unlockedColors,
  equippedColor: state.equippedColor,
  unlockedTrails: state.unlockedTrails,
  equippedTrail: state.equippedTrail,
  masteredWords: state.masteredWords,
  totalCoins: state.totalCoins,
  currentTier: state.currentTier,
  cameraPreset: state.cameraPreset,
  guardrails: state.guardrails,
})

const initialObjective = normalizeObjective(
  pickNextObjective('spelling_en', 'level_1', [], vocabData, arabicVocabData)
)

export const useGameStore = create(
  persist(
    (set, get) => ({
      // Reactive UI state
      gameState: 'lobby', // 'lobby' | 'playing' | 'dead' | 'won'
      gameMode: 'spelling_en', // 'spelling_en' | 'spelling_ar' | 'vowels_en' | 'math_basic'
      inventory: [],
      targetObjective: initialObjective,
      targetWord: initialObjective.display,
      currentTier: 'level_1',
      cameraPreset: 'low', // 'low' | 'classic' | 'high' | 'close'
      guardrails: false, // Accessibility side barriers
      cognitiveStrikes: 0,
      mechanicalDeaths: 0,
      masteredWords: [],
      sessionCoins: 0,
      totalCoins: 0,

      // Transient, session-only celebration data (never persisted)
      lastReward: null,
      rewardEventId: 0,

      // Persistent cosmetic state
      unlockedColors: [
        '#ff1493', // Neon Pink
        '#00e5ff', // Electric Cyan
        '#10b981', // Emerald Green
        '#8b5cf6', // Royal Purple
        '#f97316', // Blaze Orange
        '#facc15', // Sunburst Gold
        '#ef4444', // Crimson Red
        '#14b8a6', // Diamond Teal
        '#6366f1', // Cosmic Indigo
        '#ec4899', // Bubblegum Pink
        '#1e293b', // Stealth Midnight
        '#f8fafc', // Cloud White
      ],
      equippedColor: '#ff1493',
      unlockedTrails: [],
      equippedTrail: null,

      // Transient physics-loop state
      playerZ: 0,
      activeChunks: [],

      // Actions
      setGameMode: (mode) => {
        const currentVocab = getCurrentVocab(mode)
        const nextObj = pickNextObjective(mode, get().currentTier, get().masteredWords, currentVocab, arabicVocabData)
        const normalized = normalizeObjective(nextObj)
        set({
          gameMode: mode,
          inventory: [],
          targetObjective: normalized,
          targetWord: normalized.display,
          cognitiveStrikes: 0,
        })
      },

      setCameraPreset: (preset) => set({ cameraPreset: preset }),
      setGuardrails: (val) => set({ guardrails: val }),
      toggleGuardrails: () => set((state) => ({ guardrails: !state.guardrails })),
      die: () => set((state) => ({
        gameState: 'dead',
        mechanicalDeaths: state.mechanicalDeaths + 1,
      })),

      restart: () => {
        set({ gameState: 'playing', inventory: [], playerZ: 0 })
        get().spawnInitialChunks()
      },

      spawnInitialChunks: () => set((state) => {
        const objective = getEffectiveObjective(state)
        const chunks = Array.from({ length: 10 }, (_, i) => {
          let hasLetter = false
          let letter = null
          if (i > 0) {
            const letterForChunk = pickLetterForChunk(objective, state.inventory.length)
            hasLetter = letterForChunk !== null && (i === 2 || Math.random() < 0.5)
            letter = hasLetter ? letterForChunk : null
          }
          return {
            id: `chunk-init-${Date.now()}-${i}`,
            type: 'basic',
            position: [0, -0.5, i === 0 ? 0 : -i * 10],
            hasLetter,
            letter,
          }
        })
        return { activeChunks: chunks }
      }),

      progressLevel: () => set((state) => {
        const [, ...rest] = state.activeChunks
        const lastChunk = state.activeChunks[state.activeChunks.length - 1]
        const weights = getChunkWeights(state.mechanicalDeaths)
        const nextType = pickChunkType(weights)

        const objective = getEffectiveObjective(state)
        const letterForChunk = pickLetterForChunk(objective, state.inventory.length)
        const hasLetter = letterForChunk !== null && Math.random() < 0.4

        const newChunk = {
          id: `chunk-${Date.now()}-${Math.random()}`,
          type: nextType,
          position: [0, -0.5, lastChunk.position[2] - 10],
          hasLetter,
          letter: hasLetter ? letterForChunk : null,
        }

        return { activeChunks: [...rest, newChunk] }
      }),

      collectLetter: (char) => set((state) => {
        const objective = getEffectiveObjective(state)
        const expectedLetter = objective.sequence[state.inventory.length]

        // Cognitive failure: wrong letter / digit
        if (char !== expectedLetter) {
          const currentVocab = getCurrentVocab(state.gameMode)
          const result = applyCognitiveStrike(
            { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
            currentVocab
          )
          if (result.targetWord !== null) {
            const normalizedDowngrade = normalizeObjective(result.targetWord)
            return {
              cognitiveStrikes: result.cognitiveStrikes,
              currentTier: result.currentTier,
              targetObjective: normalizedDowngrade,
              targetWord: normalizedDowngrade.display,
              inventory: [],
            }
          }
          return { cognitiveStrikes: result.cognitiveStrikes }
        }

        // Correct letter / digit
        const newInventory = [...state.inventory, char]

        if (newInventory.length === objective.sequence.length) {
          // Objective completed
          const rawTarget = objective.rawTarget || objective.display
          const newMastered = state.cognitiveStrikes === 0 && !state.masteredWords.includes(rawTarget)
            ? [...state.masteredWords, rawTarget]
            : state.masteredWords

          const currentVocab = getCurrentVocab(state.gameMode)
          const reward = pickReward(
            state.currentTier,
            { colors: state.unlockedColors, trails: state.unlockedTrails },
            currentVocab
          )

          const rewardPatch = reward.type === 'color'
            ? {
                unlockedColors: reward.isNew ? [...state.unlockedColors, reward.value] : state.unlockedColors,
                equippedColor: reward.value,
              }
            : {
                unlockedTrails: reward.isNew ? [...state.unlockedTrails, reward.value] : state.unlockedTrails,
                equippedTrail: reward.value,
              }

          const nextObj = pickNextObjective(state.gameMode, state.currentTier, newMastered, currentVocab, arabicVocabData)
          const normalizedNext = normalizeObjective(nextObj)

          return {
            inventory: [],
            cognitiveStrikes: 0,
            mechanicalDeaths: 0,
            masteredWords: newMastered,
            targetObjective: normalizedNext,
            targetWord: normalizedNext.display,
            lastReward: { word: rawTarget, ...reward },
            rewardEventId: state.rewardEventId + 1,
            ...rewardPatch,
          }
        }

        // Correct item, challenge not yet finished
        return { inventory: newInventory, cognitiveStrikes: 0 }
      }),

      equipColor: (color) => set({ equippedColor: color }),
      equipTrail: (trail) => set({ equippedTrail: trail }),
      setTier: (tier) => set({ currentTier: tier }),
      startGame: (selectedTier) => {
        const tier = selectedTier || get().currentTier
        const currentVocab = getCurrentVocab(get().gameMode)
        const nextObj = pickNextObjective(get().gameMode, tier, get().masteredWords, currentVocab, arabicVocabData)
        const normalized = normalizeObjective(nextObj)
        set({
          gameState: 'playing',
          currentTier: tier,
          inventory: [],
          targetObjective: normalized,
          targetWord: normalized.display,
          playerZ: 0,
          cognitiveStrikes: 0,
        })
        get().spawnInitialChunks()
      },
    }),
    {
      name: 'obby-save-data',
      partialize: partializeGameState,
    }
  )
)
