import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.js'
import { ChunkRenderer } from './Chunks.jsx'

// Runaway-safety valve for the generation loop below: caps how many chunks
// can be appended in a single frame even if the margin condition somehow
// never resolves (e.g. a corrupt/negative playerZ). Not expected to be hit
// in normal play — see the loop comment for the sizing rationale.
const MAX_CHUNKS_PER_FRAME = 50

export function LevelManager() {
  const activeChunks = useGameStore((state) => state.activeChunks)

  useEffect(() => {
    // Safety net: spawnInitialChunks() is idempotent and normally already
    // ran via restart() on the lobby->playing transition. This mount-time
    // call only matters if LevelManager could ever mount with activeChunks
    // still empty and gameState already 'playing' (e.g. a future dev/test
    // harness that skips the lobby). Kept intentionally rather than removed.
    useGameStore.getState().spawnInitialChunks()
  }, [])

  useFrame(() => {
    const { playerZ, activeChunks } = useGameStore.getState()
    if (activeChunks.length === 0) return

    // Lookahead-margin trigger (spec §3.3 fix): generate ahead of the
    // player whenever fewer than 3 chunks (30 units) remain loaded ahead,
    // rather than comparing against a fixed array index. This is robust
    // to player speed (sprinting) unlike the original fixed-index trigger.
    //
    // Bounded loop (review fix): a single guarded progressLevel() call only
    // ever extends the track by 10 units/frame, so any sustained rate above
    // 10 Z-units/frame (reachable via frame hitches or physics substep
    // catch-up, since playerZ is raw Rapier translation() and isn't clamped
    // by maxVelLimit) causes the loaded track to shrink over time. Looping
    // until the margin is satisfied makes the response proportional to the
    // actual deficit instead of fixed-size. The iteration cap is a runaway
    // safety valve only; re-reading getState() each iteration means the
    // loop sees its own appended chunk immediately.
    let iterations = 0
    while (iterations < MAX_CHUNKS_PER_FRAME) {
      const current = useGameStore.getState()
      const lastChunk = current.activeChunks[current.activeChunks.length - 1]
      if (playerZ >= lastChunk.position[2] + 30) break
      current.progressLevel()
      iterations++
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
