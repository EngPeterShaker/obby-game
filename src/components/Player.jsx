// ecctrl@1.0.82 confirmed API (Task 4 investigation): ref.current is the raw
// Rapier RigidBody (no wrapper object, no useImperativeHandle) — exposes
// .translation(), .setTranslation(), .linvel(), .setLinvel(), etc. directly.
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'

export function Player() {
  const rigidBodyRef = useRef()
  const gameState = useGameStore((state) => state.gameState)

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { y, z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z

    if (y < -10 && useGameStore.getState().gameState === 'playing') {
      useGameStore.getState().die()
    }
  })

  // Respawn: whenever gameState transitions to 'playing' (including the
  // post-death "Respawn" click), teleport the rigid body back to the spawn
  // point and zero out velocity so it doesn't retain falling momentum.
  useEffect(() => {
    if (gameState === 'playing' && rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [gameState])

  // While dead, unmount the controller entirely (per brief) — the death
  // modal takes over and there's nothing to render/control until respawn.
  if (gameState === 'dead') return null

  return (
    <Ecctrl
      ref={rigidBodyRef}
      position={[0, 5, 0]}
      camInitDis={-6}
      camMaxDis={-8}
      maxVelLimit={6}
      jumpVel={5}
      animated={false}
    >
      <mesh castShadow position={[0, -0.9, 0]}>
        <capsuleGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </Ecctrl>
  )
}
