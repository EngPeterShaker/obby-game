import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore.js'

// Duck Geometries
const duckBodyGeo = new THREE.BoxGeometry(0.65, 0.45, 0.75)
const duckHeadGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42)
const duckBeakGeo = new THREE.BoxGeometry(0.24, 0.12, 0.28)
const duckEyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08)
const duckWingGeo = new THREE.BoxGeometry(0.12, 0.28, 0.45)
const duckTailGeo = new THREE.BoxGeometry(0.28, 0.15, 0.25)
const duckFootGeo = new THREE.BoxGeometry(0.18, 0.08, 0.25)

// Duck Materials
const duckYellowMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 }) // Bright yellow
const duckOrangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.3 }) // Orange beak & feet
const duckEyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const duckEyeBlackMat = new THREE.MeshBasicMaterial({ color: '#0f172a' })

function RoadCrossingDuck({ zInitial, speed = 2.2, minX = -3.8, maxX = 3.8, phase = 0 }) {
  const duckRef = useRef()
  const leftWingRef = useRef()
  const rightWingRef = useRef()
  const leftFootRef = useRef()
  const rightFootRef = useRef()
  const zPosRef = useRef(zInitial)

  useFrame((state, delta) => {
    if (!duckRef.current) return

    const playerZ = useGameStore.getState().playerZ || 0
    const gameState = useGameStore.getState().gameState

    const t = state.clock.elapsedTime * speed + phase
    const cycle = (Math.sin(t) + 1) / 2 // 0 to 1
    const x = minX + cycle * (maxX - minX)

    // Moving direction: +1 if moving right, -1 if moving left
    const dir = Math.cos(t) >= 0 ? 1 : -1

    // Waddling animations
    const waddleWobble = Math.sin(t * 7) * 0.16
    const hopBob = Math.abs(Math.sin(t * 7)) * 0.08

    duckRef.current.position.set(x, 0.25 + hopBob, zPosRef.current)
    duckRef.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2
    duckRef.current.rotation.z = waddleWobble * dir

    // Little wing fluttering
    const wingFlap = Math.sin(t * 12) * 0.22
    if (leftWingRef.current) leftWingRef.current.rotation.z = wingFlap
    if (rightWingRef.current) rightWingRef.current.rotation.z = -wingFlap

    // Little feet stepping
    const footStep = Math.sin(t * 7) * 0.3
    if (leftFootRef.current) leftFootRef.current.rotation.x = footStep
    if (rightFootRef.current) rightFootRef.current.rotation.x = -footStep

    // Collision detection: player walking or running into the duck.
    // Gated by the same post-respawn grace period as the fall-death check
    // (Player.jsx) so respawning next to a duck can't immediately re-kill.
    const respawnTimeMs = useGameStore.getState().respawnTimeMs || 0
    if (gameState === 'playing' && performance.now() - respawnTimeMs > 800) {
      const distZ = Math.abs(zPosRef.current - playerZ)
      if (distZ < 1.25) {
        // Player hitbox check: center (0, y, playerZ)
        // If player is on ground (y ~ 0..0.6) and near duck's X position
        const distX = Math.abs(x) // Player center is x=0 (steer lane +/-)
        // Check 3D distance between player center and duck
        const distSq = (x * x) + (distZ * distZ)
        if (distSq < 1.35) {
          useGameStore.getState().die()
        }
      }
    }

    // Wrap along track progression
    const relativeZ = zPosRef.current - playerZ
    if (relativeZ > 25) {
      zPosRef.current -= 140
    } else if (relativeZ < -115) {
      zPosRef.current += 140
    }
  })

  return (
    <group ref={duckRef} position={[0, 0.25, zInitial]}>
      {/* Duck Body */}
      <mesh geometry={duckBodyGeo} material={duckYellowMat} castShadow />

      {/* Duck Head */}
      <mesh geometry={duckHeadGeo} material={duckYellowMat} position={[0, 0.32, 0.25]} castShadow />

      {/* Beak */}
      <mesh geometry={duckBeakGeo} material={duckOrangeMat} position={[0, 0.28, 0.52]} />

      {/* Eyes */}
      <group position={[-0.22, 0.38, 0.32]}>
        <mesh geometry={duckEyeGeo} material={duckEyeWhiteMat} scale={[1.2, 1.2, 1.2]} />
        <mesh geometry={duckEyeGeo} material={duckEyeBlackMat} position={[-0.04, 0, 0.04]} scale={[0.7, 0.7, 0.7]} />
      </group>
      <group position={[0.22, 0.38, 0.32]}>
        <mesh geometry={duckEyeGeo} material={duckEyeWhiteMat} scale={[1.2, 1.2, 1.2]} />
        <mesh geometry={duckEyeGeo} material={duckEyeBlackMat} position={[0.04, 0, 0.04]} scale={[0.7, 0.7, 0.7]} />
      </group>

      {/* Wings */}
      <mesh ref={leftWingRef} geometry={duckWingGeo} material={duckYellowMat} position={[-0.38, 0.08, 0]} castShadow />
      <mesh ref={rightWingRef} geometry={duckWingGeo} material={duckYellowMat} position={[0.38, 0.08, 0]} castShadow />

      {/* Tail */}
      <mesh geometry={duckTailGeo} material={duckYellowMat} position={[0, 0.16, -0.42]} rotation={[-0.35, 0, 0]} />

      {/* Feet */}
      <mesh ref={leftFootRef} geometry={duckFootGeo} material={duckOrangeMat} position={[-0.18, -0.24, 0]} />
      <mesh ref={rightFootRef} geometry={duckFootGeo} material={duckOrangeMat} position={[0.18, -0.24, 0]} />
    </group>
  )
}

export function DuckHazards() {
  const ducks = useMemo(() => [
    { id: 'duck-1', zInitial: -30, speed: 1.6, minX: -3.6, maxX: 3.6, phase: 0 },
    { id: 'duck-2', zInitial: -65, speed: 2.0, minX: -3.8, maxX: 3.8, phase: 1.8 },
    { id: 'duck-3', zInitial: -100, speed: 1.8, minX: -3.5, maxX: 3.5, phase: 3.5 },
    { id: 'duck-4', zInitial: -135, speed: 2.2, minX: -3.8, maxX: 3.8, phase: 5.2 },
  ], [])

  return (
    <group>
      {ducks.map((d) => (
        <RoadCrossingDuck
          key={d.id}
          zInitial={d.zInitial}
          speed={d.speed}
          minX={d.minX}
          maxX={d.maxX}
          phase={d.phase}
        />
      ))}
    </group>
  )
}
