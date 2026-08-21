import { create } from 'zustand'

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
}))
