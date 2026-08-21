import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useGameStore } from '../store/gameStore.js'

// Visual-only lobby preview of the player capsule. Deliberately has NO
// dependency on @react-three/rapier or ecctrl — it must render safely
// with no Physics world mounted at all (App.jsx only mounts <Physics> when
// gameState is 'playing' or 'dead'). Rotation/float here are purely
// cosmetic, driven by useFrame + drei's <Float>, not by any physics step.
export function ShowcasePlayer() {
  const groupRef = useRef()
  const equippedColor = useGameStore((state) => state.equippedColor)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <Float floatIntensity={1} rotationIntensity={0}>
      <group ref={groupRef} position={[0, 1, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.4, 1]} />
          <meshStandardMaterial color={equippedColor} />
        </mesh>
      </group>
    </Float>
  )
}
