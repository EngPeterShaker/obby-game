import { useState } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Text } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'
import { useCollectSound } from '../audio/sounds.js'

export function Collectible({ letter, position }) {
  const [collected, setCollected] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const collectLetter = useGameStore((state) => state.collectLetter)
  const [playCollect] = useCollectSound()

  const { scale } = useSpring({
    scale: collected ? 0 : 1,
    config: { duration: 300 },
    onRest: () => {
      if (collected) setUnmounted(true)
    },
  })

  if (unmounted) return null

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[0.5, 0.5, 0.5]}
        sensor
        onIntersectionEnter={() => {
          if (!collected) {
            playCollect()
            collectLetter(letter)
            setCollected(true)
          }
        }}
      />
      <animated.group scale={scale}>
        <Text fontSize={1.5} color="gold">
          {letter}
        </Text>
      </animated.group>
    </RigidBody>
  )
}
