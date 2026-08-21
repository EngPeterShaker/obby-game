import { describe, it, expect } from 'vitest'
import { partializeGameState } from './gameStore.js'

// Test the ACTUAL partialize function exported from gameStore.js
describe('gameStore persist partialize', () => {
  const partialize = partializeGameState

  it('should only persist the 7 cosmetic fields', () => {
    // Create a mock state with all fields
    const mockState = {
      gameState: 'lobby',
      inventory: [],
      targetWord: 'CAT',
      currentTier: 'level_1',
      cognitiveStrikes: 0,
      mechanicalDeaths: 0,
      masteredWords: [],
      sessionCoins: 0,
      totalCoins: 0,
      unlockedColors: ['hotpink'],
      equippedColor: 'hotpink',
      unlockedTrails: [],
      equippedTrail: null,
      playerZ: 0,
      activeChunks: [],
      die: () => {},
      restart: () => {},
      spawnInitialChunks: () => {},
      progressLevel: () => {},
      collectLetter: () => {},
    }

    // Call partialize on the mock state
    const partializedState = partialize(mockState)

    // Verify only the persistent fields are present
    const expectedFields = [
      'unlockedColors',
      'equippedColor',
      'unlockedTrails',
      'equippedTrail',
      'masteredWords',
      'totalCoins',
      'currentTier',
      'cameraPreset',
      'guardrails',
    ]

    const actualKeys = Object.keys(partializedState).sort()
    const expectedKeys = expectedFields.sort()

    expect(actualKeys).toEqual(expectedKeys)
    expect(actualKeys.length).toBe(9)
  })

  it('should NOT persist session-only fields like inventory, targetWord, gameState', () => {
    const mockState = {
      gameState: 'lobby',
      inventory: ['C', 'A'],
      targetWord: 'CAT',
      currentTier: 'level_1',
      cognitiveStrikes: 1,
      mechanicalDeaths: 2,
      masteredWords: [],
      sessionCoins: 100,
      totalCoins: 0,
      unlockedColors: ['hotpink'],
      equippedColor: 'hotpink',
      unlockedTrails: [],
      equippedTrail: null,
      playerZ: 42,
      activeChunks: [{ id: 'chunk-0' }],
    }

    const partializedState = partialize(mockState)

    // These fields MUST NOT be in the persisted state
    const forbiddenFields = [
      'inventory',
      'targetWord',
      'gameState',
      'cognitiveStrikes',
      'mechanicalDeaths',
      'activeChunks',
      'playerZ',
      'sessionCoins',
    ]

    forbiddenFields.forEach((field) => {
      expect(partializedState).not.toHaveProperty(field)
    })
  })

  it('should preserve cosmetic field values through partialize', () => {
    const mockState = {
      gameState: 'playing',
      inventory: ['X'],
      targetWord: 'DOG',
      currentTier: 'level_2',
      cognitiveStrikes: 3,
      mechanicalDeaths: 5,
      masteredWords: ['CAT', 'DOG'],
      sessionCoins: 250,
      totalCoins: 500,
      unlockedColors: ['hotpink', 'blue', 'green'],
      equippedColor: 'blue',
      unlockedTrails: ['trail1', 'trail2'],
      equippedTrail: 'trail1',
      playerZ: 100,
      activeChunks: [{ id: 'chunk-0' }, { id: 'chunk-1' }],
    }

    const partializedState = partialize(mockState)

    // Verify values are preserved exactly
    expect(partializedState.unlockedColors).toEqual(['hotpink', 'blue', 'green'])
    expect(partializedState.equippedColor).toBe('blue')
    expect(partializedState.unlockedTrails).toEqual(['trail1', 'trail2'])
    expect(partializedState.equippedTrail).toBe('trail1')
    expect(partializedState.masteredWords).toEqual(['CAT', 'DOG'])
    expect(partializedState.totalCoins).toBe(500)
    expect(partializedState.currentTier).toBe('level_2')
  })

  it('should handle null and empty array values correctly', () => {
    const mockState = {
      gameState: 'lobby',
      inventory: [],
      targetWord: 'CAT',
      currentTier: 'level_1',
      cognitiveStrikes: 0,
      mechanicalDeaths: 0,
      masteredWords: [],
      sessionCoins: 0,
      totalCoins: 0,
      unlockedColors: [],
      equippedColor: null,
      unlockedTrails: [],
      equippedTrail: null,
      playerZ: 0,
      activeChunks: [],
    }

    const partializedState = partialize(mockState)

    // Verify empty values are preserved
    expect(partializedState.unlockedColors).toEqual([])
    expect(partializedState.equippedColor).toBeNull()
    expect(partializedState.unlockedTrails).toEqual([])
    expect(partializedState.equippedTrail).toBeNull()
    expect(partializedState.masteredWords).toEqual([])
  })
})
