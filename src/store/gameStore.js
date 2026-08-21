import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getChunkWeights, pickChunkType, applyCognitiveStrike, pickNextWord, getTierRewardAction } from './gameStore.logic.js'
import vocabData from '../data/vocabulary.json'

// Export partialize function separately for testing purposes
export const partializeGameState = (state) => ({
  unlockedColors: state.unlockedColors,
  equippedColor: state.equippedColor,
  unlockedTrails: state.unlockedTrails,
  equippedTrail: state.equippedTrail,
  masteredWords: state.masteredWords,
  totalCoins: state.totalCoins,
  currentTier: state.currentTier,
})

export const useGameStore = create(
  persist(
    (set, get) => ({
  // Reactive UI state
  gameState: 'lobby', // 'lobby' | 'playing' | 'dead' | 'won'
  inventory: [],
  targetWord: 'CAT',
  currentTier: 'level_1',
  cognitiveStrikes: 0,
  mechanicalDeaths: 0,
  masteredWords: [],
  sessionCoins: 0,
  totalCoins: 0,

  // Persistent cosmetic state (persist wiring added in Task 8)
  unlockedColors: ['hotpink'],
  equippedColor: 'hotpink',
  unlockedTrails: [],
  equippedTrail: null,

  // Transient physics-loop state — mutated directly via getState(), never set()
  playerZ: 0,
  activeChunks: [],

  // Actions
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

  spawnInitialChunks: () => set(() => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      id: `chunk-init-${i}`,
      type: 'basic', // onboarding rule: first 10 chunks are always safe (spec §3.6)
      position: [0, -0.5, i === 0 ? 0 : -i * 10],
      hasLetter: false,
      letter: null,
    }))
    return { activeChunks: chunks }
  }),

  progressLevel: () => set((state) => {
    const [, ...rest] = state.activeChunks
    const lastChunk = state.activeChunks[state.activeChunks.length - 1]
    const weights = getChunkWeights(state.mechanicalDeaths)
    const nextType = pickChunkType(weights)

    const nextLetter = state.targetWord[state.inventory.length]
    const hasLetter = nextLetter !== undefined && Math.random() < 0.4

    const newChunk = {
      id: `chunk-${Date.now()}-${Math.random()}`,
      type: nextType,
      position: [0, -0.5, lastChunk.position[2] - 10],
      hasLetter,
      letter: hasLetter ? nextLetter : null,
    }

    return { activeChunks: [...rest, newChunk] }
  }),

  collectLetter: (char) => set((state) => {
    const expectedLetter = state.targetWord[state.inventory.length]

    // Cognitive failure: wrong letter
    if (char !== expectedLetter) {
      const result = applyCognitiveStrike(
        { cognitiveStrikes: state.cognitiveStrikes, currentTier: state.currentTier },
        vocabData
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

      const reward = getTierRewardAction(state.currentTier, vocabData)
      const rewardPatch = reward.type === 'color'
        ? { unlockedColors: [...state.unlockedColors, reward.value], equippedColor: reward.value }
        : { unlockedTrails: [...state.unlockedTrails, reward.value], equippedTrail: reward.value }

      const nextWord = pickNextWord(state.currentTier, newMastered, vocabData)

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
  startGame: () => {
    set({ gameState: 'playing', inventory: [] })
    get().spawnInitialChunks()
  },
    }),
    {
      name: 'obby-save-data',
      partialize: partializeGameState,
    }
  )
)
