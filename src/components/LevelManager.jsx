import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.js'
import { ChunkRenderer } from './Chunks.jsx'

export function LevelManager() {
  const activeChunks = useGameStore((state) => state.activeChunks)
  const lastTriggeredChunkId = useRef(null)

  useEffect(() => {
    useGameStore.getState().spawnInitialChunks()
  }, [])

  useFrame(() => {
    const state = useGameStore.getState()
    const { playerZ, activeChunks } = state
    if (activeChunks.length === 0) return

    const lastChunk = activeChunks[activeChunks.length - 1]

    // Lookahead-margin trigger (spec §3.3 fix): generate ahead of the
    // player whenever fewer than 3 chunks (30 units) remain loaded ahead,
    // rather than comparing against a fixed array index. This is robust
    // to player speed (sprinting) unlike the original fixed-index trigger.
    const shouldGenerate = playerZ < lastChunk.position[2] + 30

    if (shouldGenerate && lastTriggeredChunkId.current !== lastChunk.id) {
      lastTriggeredChunkId.current = lastChunk.id
      state.progressLevel()
    }
  })

  return (
    <>
      {activeChunks.map((chunk) => (
        <ChunkRenderer key={chunk.id} chunk={chunk} />
      ))}
    </>
  )
}
