import { create } from 'zustand'
import { getChunkWeights, pickChunkType } from './gameStore.logic.js'

export const useGameStore = create((set, get) => ({
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

  // Note: restart() does not yet call spawnInitialChunks() — that action is
  // added in Task 9 once chunks exist. This task's restart only handles
  // gameState/inventory; Task 9 extends it.
  restart: () => set({ gameState: 'playing', inventory: [] }),

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

    const newChunk = {
      id: `chunk-${Date.now()}-${Math.random()}`,
      type: nextType,
      position: [0, -0.5, lastChunk.position[2] - 10],
      hasLetter: false,
      letter: null,
    }

    return { activeChunks: [...rest, newChunk] }
  }),
}))
