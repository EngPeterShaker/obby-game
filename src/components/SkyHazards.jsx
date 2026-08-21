import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.js'

// Voxel Cloud Geometry & Material
const cloudBlockGeo = new THREE.BoxGeometry(4.2, 1.6, 3.2)
const cloudBlockSmallGeo = new THREE.BoxGeometry(2.6, 1.2, 2.4)
const cloudMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  roughness: 0.9,
  transparent: true,
  opacity: 0.9,
})

function SingleCloud({ initialPos, speed = 0.5 }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const playerZ = useGameStore.getState().playerZ || 0
    // Drift slowly on X
    meshRef.current.position.x += delta * speed

    // Wrap around X
    if (meshRef.current.position.x > 50) {
      meshRef.current.position.x = -50
    }

    // Keep clouds aligned around player's track progression
    const relativeZ = meshRef.current.position.z - playerZ
    if (relativeZ > 50) {
      meshRef.current.position.z -= 200
    } else if (relativeZ < -150) {
      meshRef.current.position.z += 200
    }
  })

  return (
    <group ref={meshRef} position={initialPos}>
      <mesh geometry={cloudBlockGeo} material={cloudMat} />
      <mesh geometry={cloudBlockSmallGeo} material={cloudMat} position={[1.6, 0.4, 0.6]} />
      <mesh geometry={cloudBlockSmallGeo} material={cloudMat} position={[-1.5, -0.2, -0.5]} />
      <mesh geometry={cloudBlockSmallGeo} material={cloudMat} position={[0.2, 0.6, -0.7]} />
    </group>
  )
}

export function SkyClouds() {
  const clouds = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      pos: [
        (Math.random() - 0.5) * 90,
        14 + Math.random() * 16,
        -Math.random() * 180,
      ],
      speed: 0.3 + Math.random() * 0.6,
    }))
  }, [])

  return (
    <group>
      {clouds.map((c) => (
        <SingleCloud key={c.id} initialPos={c.pos} speed={c.speed} />
      ))}
    </group>
  )
}

// 3D Voxel Flying Hazard Bird (Flies high above tree canopies, random trajectories)
const birdBodyGeo = new THREE.BoxGeometry(0.8, 0.55, 1.0)
const birdHeadGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
const birdBeakGeo = new THREE.BoxGeometry(0.22, 0.18, 0.38)
const birdWingGeo = new THREE.BoxGeometry(1.0, 0.12, 0.7)
const birdTailGeo = new THREE.BoxGeometry(0.55, 0.08, 0.45)

const birdBodyMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.5 }) // Crimson plumage
const birdWingMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 })
const birdBeakMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 }) // Amber beak
const birdEyeMat = new THREE.MeshBasicMaterial({ color: '#fef08a' }) // Glowing yellow eye

function FlyingBird({ zOffset, speed, baseHeight, radiusX, radiusY, phase, direction }) {
  const birdGroupRef = useRef()
  const leftWingRef = useRef()
  const rightWingRef = useRef()

  useFrame((state) => {
    if (!birdGroupRef.current) return
    const t = (state.clock.elapsedTime * speed + phase) * direction
    const playerZ = useGameStore.getState().playerZ || 0
    const gameState = useGameStore.getState().gameState

    // Randomized graceful curved flight above treetops (Treetops are at y=5.1)
    const x = Math.sin(t) * radiusX
    const y = baseHeight + Math.sin(t * 1.8) * radiusY
    const z = zOffset + Math.cos(t * 0.7) * 8

    birdGroupRef.current.position.set(x, y, z)

    // Smooth banking and forward alignment
    const nextT = t + 0.05 * direction
    const nextX = Math.sin(nextT) * radiusX
    const nextZ = zOffset + Math.cos(nextT * 0.7) * 8
    const dx = nextX - x
    const dz = nextZ - z
    birdGroupRef.current.rotation.y = Math.atan2(dx, dz)
    birdGroupRef.current.rotation.z = -dx * 0.08

    // Flap wings
    const flap = Math.sin(state.clock.elapsedTime * 14) * 0.55
    if (leftWingRef.current) leftWingRef.current.rotation.z = flap
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap

    // Collision Detection: if jumping player hits bird
    if (gameState === 'playing') {
      const distZ = Math.abs(z - playerZ)
      if (distZ < 1.4) {
        const distSq = (x * x) + Math.pow(y - 1.2, 2) + Math.pow(z - playerZ, 2)
        if (distSq < 2.0) {
          useGameStore.getState().die()
        }
      }
    }

    // Wrap along track progression
    const relativeZ = z - playerZ
    if (relativeZ > 30) {
      zOffset -= 150
    } else if (relativeZ < -130) {
      zOffset += 150
    }
  })

  return (
    <group ref={birdGroupRef} position={[0, baseHeight, zOffset]}>
      {/* Bird Body */}
      <mesh geometry={birdBodyGeo} material={birdBodyMat} castShadow />

      {/* Bird Head */}
      <mesh geometry={birdHeadGeo} material={birdBodyMat} position={[0, 0.28, 0.5]} castShadow />

      {/* Beak */}
      <mesh geometry={birdBeakGeo} material={birdBeakMat} position={[0, 0.22, 0.82]} />

      {/* Glowing Eyes */}
      <mesh geometry={birdBeakGeo} material={birdEyeMat} position={[-0.22, 0.38, 0.6]} scale={[0.3, 0.3, 0.3]} />
      <mesh geometry={birdBeakGeo} material={birdEyeMat} position={[0.22, 0.38, 0.6]} scale={[0.3, 0.3, 0.3]} />

      {/* Left Wing */}
      <group position={[-0.5, 0.12, 0]} ref={leftWingRef}>
        <mesh geometry={birdWingGeo} material={birdWingMat} position={[-0.5, 0, 0]} castShadow />
      </group>

      {/* Right Wing */}
      <group position={[0.5, 0.12, 0]} ref={rightWingRef}>
        <mesh geometry={birdWingGeo} material={birdWingMat} position={[0.5, 0, 0]} castShadow />
      </group>

      {/* Tail */}
      <mesh geometry={birdTailGeo} material={birdBodyMat} position={[0, 0.12, -0.65]} rotation={[-0.2, 0, 0]} />
    </group>
  )
}

export function SkyHazards() {
  // Balanced: 3 random birds flying high above the trees across the track
  const birds = useMemo(() => {
    return [
      { id: 1, zOffset: -45, speed: 1.1, baseHeight: 6.2, radiusX: 6.5, radiusY: 1.2, phase: 0.5, direction: 1 },
      { id: 2, zOffset: -95, speed: 1.3, baseHeight: 6.8, radiusX: 7.2, radiusY: 1.5, phase: 2.8, direction: -1 },
      { id: 3, zOffset: -145, speed: 1.0, baseHeight: 6.4, radiusX: 6.0, radiusY: 1.0, phase: 4.6, direction: 1 },
    ]
  }, [])

  return (
    <group>
      <SkyClouds />
      {birds.map((b) => (
        <FlyingBird
          key={b.id}
          zOffset={b.zOffset}
          speed={b.speed}
          baseHeight={b.baseHeight}
          radiusX={b.radiusX}
          radiusY={b.radiusY}
          phase={b.phase}
          direction={b.direction}
        />
      ))}
    </group>
  )
}
