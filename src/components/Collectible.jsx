import { useState, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Text, Billboard } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'
import { useCollectSound } from '../audio/sounds.js'
import { isArabic } from '../store/gameStore.logic.js'

// High-quality local Cairo Arabic font for crisp 3D Arabic typography
const ARABIC_FONT_URL = '/fonts/cairo-arabic.woff'

export function Collectible({ letter, position }) {
  const [collected, setCollected] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const collectLetter = useGameStore((state) => state.collectLetter)
  const [playCollect] = useCollectSound()
  const floatGroupRef = useRef()

  const isAr = isArabic(letter)

  const { scale } = useSpring({
    scale: collected ? 0 : 1,
    config: { duration: 300 },
    onRest: () => {
      if (collected) setUnmounted(true)
    },
  })

  useFrame(({ clock }) => {
    if (floatGroupRef.current && !collected) {
      // Gentle bobbing up and down
      floatGroupRef.current.position.y = Math.sin(clock.getElapsedTime() * 3) * 0.2
    }
  })

  if (unmounted) return null

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[0.8, 0.8, 0.8]}
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
        <group ref={floatGroupRef}>
          <Billboard>
            <Text
              fontSize={isAr ? 1.35 : 1.15}
              font={isAr ? ARABIC_FONT_URL : undefined}
              color="#ffd700"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.07}
              outlineColor="#4a2500"
              material-side={THREE.DoubleSide}
            >
              {letter}
            </Text>
          </Billboard>
          {/* Subtle glowing ring underneath the floating letter */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
            <ringGeometry args={[0.35, 0.55, 32]} />
            <meshBasicMaterial color="#ffd700" side={THREE.DoubleSide} transparent opacity={0.6} />
          </mesh>
        </group>
      </animated.group>
    </RigidBody>
  )
}
