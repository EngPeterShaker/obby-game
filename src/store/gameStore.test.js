import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore.js'

describe('spawnInitialChunks', () => {
  beforeEach(() => {
    useGameStore.setState({ activeChunks: [] })
  })

  it('creates 10 chunks spaced 10 units apart on Z, starting at Z=0', () => {
    useGameStore.getState().spawnInitialChunks()
    const chunks = useGameStore.getState().activeChunks
    expect(chunks).toHaveLength(10)
    expect(chunks[0].position[2]).toBe(0)
    expect(chunks[9].position[2]).toBe(-90)
  })

  it('never spawns a gap chunk in the first 10 chunks (onboarding safety, spec §3.6)', () => {
    useGameStore.getState().spawnInitialChunks()
    const chunks = useGameStore.getState().activeChunks
    expect(chunks.every((c) => c.type === 'basic')).toBe(true)
  })

  it('spawns letters on initial runway chunks so player can collect letters immediately', () => {
    useGameStore.setState({ targetWord: 'CAT', inventory: [] })
    useGameStore.getState().spawnInitialChunks()
    const chunks = useGameStore.getState().activeChunks
    const chunksWithLetters = chunks.filter((c) => c.hasLetter && c.letter !== null)
    expect(chunksWithLetters.length).toBeGreaterThan(0)
    // Chunk 0 (spawn point) should not spawn a letter directly on top of the player
    expect(chunks[0].hasLetter).toBe(false)
  })
})

describe('progressLevel', () => {
  beforeEach(() => {
    useGameStore.setState({ activeChunks: [], mechanicalDeaths: 0 })
    useGameStore.getState().spawnInitialChunks()
  })

  it('removes the oldest chunk and appends a new one 10 units past the last chunk', () => {
    const before = useGameStore.getState().activeChunks
    const lastZ = before[before.length - 1].position[2]
    useGameStore.getState().progressLevel()
    const after = useGameStore.getState().activeChunks
    expect(after).toHaveLength(10)
    expect(after[0].id).not.toBe(before[0].id)
    expect(after[after.length - 1].position[2]).toBe(lastZ - 10)
  })
})

describe('collectLetter', () => {
  beforeEach(() => {
    useGameStore.setState({
      inventory: [], targetWord: 'CAT', currentTier: 'level_1',
      cognitiveStrikes: 0, mechanicalDeaths: 5, masteredWords: [],
      unlockedColors: ['hotpink'], equippedColor: 'hotpink',
      unlockedTrails: [], equippedTrail: null,
    })
  })

  it('appends a correct letter to inventory without completing the word', () => {
    useGameStore.getState().collectLetter('C')
    const state = useGameStore.getState()
    expect(state.inventory).toEqual(['C'])
    expect(state.cognitiveStrikes).toBe(0)
  })

  it('increments cognitiveStrikes on a decoy letter without touching inventory', () => {
    useGameStore.getState().collectLetter('X') // decoy, expected next letter is 'C'
    const state = useGameStore.getState()
    expect(state.inventory).toEqual([])
    expect(state.cognitiveStrikes).toBe(1)
  })

  it('resets cognitiveStrikes to 0 when a correct letter completes the word', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 1 })
    useGameStore.getState().collectLetter('T')
    const state = useGameStore.getState()
    expect(state.inventory).toEqual([])
    expect(state.cognitiveStrikes).toBe(0)
    expect(state.mechanicalDeaths).toBe(0) // reset on word completion, spec §3.6
  })

  it('resets cognitiveStrikes to 0 on a correct-but-non-final letter (the fixed bug)', () => {
    useGameStore.setState({ inventory: [], cognitiveStrikes: 2 })
    useGameStore.getState().collectLetter('C') // correct, word not finished
    const state = useGameStore.getState()
    // Critical: strikes must NOT carry over as 2 into the next word attempt.
    // Original design only reset on completion/downgrade — this verifies the fix.
    expect(state.cognitiveStrikes).toBe(0)
  })

  it('adds the word to masteredWords only if spelled with zero strikes', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().masteredWords).toContain('CAT')
  })

  it('does NOT add the word to masteredWords if any strikes occurred', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 1 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().masteredWords).not.toContain('CAT')
  })

  it('applies the cosmetic reward on word completion', () => {
    useGameStore.setState({ inventory: ['C', 'A'], cognitiveStrikes: 0 })
    useGameStore.getState().collectLetter('T')
    expect(useGameStore.getState().unlockedColors).toContain('blue')
    expect(useGameStore.getState().equippedColor).toBe('blue')
  })
})
