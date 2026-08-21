// ecctrl@1.0.82 confirmed API (Task 4 investigation): ref.current is the raw
// Rapier RigidBody (no wrapper object, no useImperativeHandle) — exposes
// .translation(), .setTranslation(), .linvel(), .setLinvel(), etc. directly.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'

export function Player() {
  const rigidBodyRef = useRef()

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z
  })

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
