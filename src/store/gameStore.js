import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getChunkWeights, pickChunkType, applyCognitiveStrike, pickNextWord, getTierRewardAction, pickLetterForChunk, getEffectiveVocabulary } from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'
import { useCustomWordsStore } from './customWordsStore.js'

function getCurrentVocab() {
  const customWords = useCustomWordsStore.getState()
  return getEffectiveVocabulary(vocabData, customWords)
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

export const useGameStore = create(
  persist(
    (set, get) => ({
  // Reactive UI state
  gameState: 'lobby', // 'lobby' | 'playing' | 'dead' | 'won'
  inventory: [],
  targetWord: pickNextWord('level_1', [], getCurrentVocab()),
  currentTier: 'level_1',
  cameraPreset: 'low', // 'low' | 'classic' | 'high' | 'close'
  guardrails: false, // Accessibility side barriers
  cognitiveStrikes: 0,
  mechanicalDeaths: 0,
  masteredWords: [],
  sessionCoins: 0,
  totalCoins: 0,

  // Persistent cosmetic state (persist wiring added in Task 8)
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

  // Transient physics-loop state — mutated directly via getState(), never set()
  playerZ: 0,
  activeChunks: [],

  // Actions
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setGuardrails: (val) => set({ guardrails: val }),
  toggleGuardrails: () => set((state) => ({ guardrails: !state.guardrails })),
  die: () => set((state) => ({
    gameState: 'dead',
    mechanicalDeaths: state.mechanicalDeaths + 1,
  })),

  restart: () => {
    // playerZ is reset here too (not just activeChunks) so LevelManager's
    // useFrame never compares a stale death-position playerZ (e.g. -450)
    // against the freshly-reset chunk window before Player.jsx's own
    // teleport-on-gameState-change effect catches up next frame.
    set({ gameState: 'playing', inventory: [], playerZ: 0 })
    get().spawnInitialChunks()
  },

  spawnInitialChunks: () => set((state) => {
    const chunks = Array.from({ length: 10 }, (_, i) => {
      let hasLetter = false
      let letter = null
      // Chunk 0 is the starting spawn platform (where player lands).
      // On subsequent chunks (i > 0), spawn letters so the player immediately sees letters down the runway.
      if (i > 0) {
        const letterForChunk = pickLetterForChunk(state.targetWord, state.inventory.length)
        // Guarantee letters on early chunks (e.g. chunk 2) and 50% chance on others
        hasLetter = letterForChunk !== null && (i === 2 || Math.random() < 0.5)
        letter = hasLetter ? letterForChunk : null
      }
      return {
        id: `chunk-init-${Date.now()}-${i}`,
        type: 'basic', // onboarding rule: first 10 chunks are always safe (spec §3.6)
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

    const letterForChunk = pickLetterForChunk(state.targetWord, state.inventory.length)
    const hasLetter = letterForChunk !== null && Math.random() < 0.4 // keep the existing 40% spawn-chance gate

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
    const expectedLetter = state.targetWord[state.inventory.length]

    // Cognitive failure: wrong letter
    if (char !== expectedLetter) {
      const result = applyCognitiveStrike(
        { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
        getCurrentVocab()
      )
      if (result.targetWord !== null) {
        // Downgrade happened
        return {
          cognitiveStrikes: result.cognitiveStrikes,
          currentTier: result.currentTier,
          targetWord: result.targetWord,
          inventory: [],
        }
      }
      return { cognitiveStrikes: result.cognitiveStrikes }
    }

    // Correct letter
    const newInventory = [...state.inventory, char]

    if (newInventory.join('') === state.targetWord) {
      // Word completed
      const newMastered = state.cognitiveStrikes === 0 && !state.masteredWords.includes(state.targetWord)
        ? [...state.masteredWords, state.targetWord]
        : state.masteredWords

      const currentVocab = getCurrentVocab()
      const reward = getTierRewardAction(state.currentTier, currentVocab)
      const rewardPatch = reward.type === 'color'
        ? { unlockedColors: [...state.unlockedColors, reward.value], equippedColor: reward.value }
        : { unlockedTrails: [...state.unlockedTrails, reward.value], equippedTrail: reward.value }

      const nextWord = pickNextWord(state.currentTier, newMastered, currentVocab)

      return {
        inventory: [],
        cognitiveStrikes: 0,
        mechanicalDeaths: 0,
        masteredWords: newMastered,
        targetWord: nextWord,
        ...rewardPatch,
      }
    }

    // Correct letter, word not yet finished — THE FIX: strikes reset here too
    return { inventory: newInventory, cognitiveStrikes: 0 }
  }),

  equipColor: (color) => set({ equippedColor: color }),
  equipTrail: (trail) => set({ equippedTrail: trail }),
  setTier: (tier) => set({ currentTier: tier }),
  startGame: (selectedTier) => {
    const tier = selectedTier || get().currentTier
    const nextWord = pickNextWord(tier, get().masteredWords, getCurrentVocab())
    set({ gameState: 'playing', currentTier: tier, inventory: [], targetWord: nextWord, playerZ: 0 })
    get().spawnInitialChunks()
  },
    }),
    {
      name: 'obby-save-data',
      partialize: partializeGameState,
    }
  )
)
