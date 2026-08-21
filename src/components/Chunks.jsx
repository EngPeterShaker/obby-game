import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Collectible } from './Collectible.jsx'
import { useGameStore } from '../store/gameStore.js'

// Flyweight: allocated once, shared across every chunk instance (spec §3.10)
const floorGeometry = new THREE.BoxGeometry(10, 1, 10)
const floorMaterial = new THREE.MeshStandardMaterial({ color: 'gray' })
const gapFloorGeometry = new THREE.BoxGeometry(10, 1, 4)

// Safety Mode bumpers (spec §3.5): neon wireframe guard rails that appear
// on chunk edges once mechanicalDeaths >= 6. The meshes are purely cosmetic
// (MeshBasicMaterial wireframe), so each one MUST be paired with an explicit
// CuboidCollider sibling — do not rely on the parent RigidBody's
// colliders="cuboid" auto-generation, which is tied to the floor mesh and
// is not guaranteed to also cover additional child meshes.
const bumperGeometry = new THREE.BoxGeometry(1, 2, 10)
const bumperMaterial = new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true })

function SafetyBumpers() {
  return (
    <>
      <mesh geometry={bumperGeometry} material={bumperMaterial} position={[-4.5, 1, 0]} />
      <CuboidCollider args={[0.5, 1, 5]} position={[-4.5, 1, 0]} />
      <mesh geometry={bumperGeometry} material={bumperMaterial} position={[4.5, 1, 0]} />
      <CuboidCollider args={[0.5, 1, 5]} position={[4.5, 1, 0]} />
    </>
  )
}

export function BasicChunk({ position, chunk }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const [x, y, z] = position

  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
      {chunk?.hasLetter && (
        <Collectible letter={chunk.letter} position={[x, y + 1.5, z]} />
      )}
      {isSafeMode && <SafetyBumpers />}
    </RigidBody>
  )
}

export function GapChunk({ position }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const [x, y, z] = position
  return (
    <>
      <RigidBody type="fixed" position={[x, y, z + 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
        {isSafeMode && <SafetyBumpers />}
      </RigidBody>
      <RigidBody type="fixed" position={[x, y, z - 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
        {isSafeMode && <SafetyBumpers />}
      </RigidBody>
    </>
  )
}

export function ChunkRenderer({ chunk }) {
  switch (chunk.type) {
    case 'basic':
      return <BasicChunk position={chunk.position} chunk={chunk} />
    case 'gap':
      return <GapChunk position={chunk.position} />
    default:
      return null
  }
}
