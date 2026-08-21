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
