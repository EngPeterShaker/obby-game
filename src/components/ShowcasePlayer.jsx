import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'
import { BlockyCharacter } from './BlockyCharacter.jsx'

export function ShowcasePlayer() {
  const groupRef = useRef()
  const equippedColor = useGameStore((state) => state.equippedColor)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.7
    }
  })

  return (
    <Float floatIntensity={1.2} rotationIntensity={0.2} speed={2}>
      <group ref={groupRef} position={[0, -0.6, 0]} scale={1.1}>
        <BlockyCharacter color={equippedColor} animateWalk={false} />
      </group>
    </Float>
  )
}
