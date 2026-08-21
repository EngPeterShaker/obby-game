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
// (MeshBasicMaterial wireframe), so each one is paired with an explicit
// CuboidCollider sibling below rather than relying on the parent RigidBody's
// colliders="cuboid" auto-generation.
//
// Verified against node_modules/@react-three/rapier's own auto-collider
// walk (createColliderPropsFromChildren in dist/react-three-rapier.esm.js,
// and "Automatic Colliders" in readme.md): colliders="cuboid" on a
// RigidBody generates ONE auto-cuboid PER mesh child via
// object.traverseVisible(...), not a single combined bounding box across
// all children. That means these bumper <mesh> elements DO also get an
// auto-generated cuboid collider from the parent RigidBody, in addition to
// the explicit <CuboidCollider> below — a redundant but harmless duplicate,
// since bumperGeometry's bounding box (half-extents [0.5, 1, 5]) is
// identical in size and position to the explicit collider's
// args={[0.5, 1, 5]}, so both are coincident static colliders at the same
// spot. There is no per-mesh prop in this library to opt a single <mesh>
// out of its parent's auto-collider generation (colliders is only a
// RigidBody/Physics-level prop; MeshCollider always produces a collider of
// its own rather than suppressing generation) — the only way to remove the
// duplicate would be to set colliders={false} on the whole RigidBody and
// hand-author a collider for the floor mesh too, which isn't worth it for
// a static-vs-static redundant cuboid. Left as-is intentionally.
const bumperGeometry = new THREE.BoxGeometry(1, 2, 10)
const bumperMaterial = new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true })

function SafetyBumpers() {
  return (
    <>
      {/* Duplicate collider here is intentional/harmless — see comment above. */}
      <mesh geometry={bumperGeometry} material={bumperMaterial} position={[-4.5, 1, 0]} />
      <CuboidCollider args={[0.5, 1, 5]} position={[-4.5, 1, 0]} />
      <mesh geometry={bumperGeometry} material={bumperMaterial} position={[4.5, 1, 0]} />
      <CuboidCollider args={[0.5, 1, 5]} position={[4.5, 1, 0]} />
    </>
  )
}

export function BasicChunk({ position, chunk }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)

  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
      {chunk?.hasLetter && (
        // Local offset: the parent RigidBody above is already at the
        // chunk's world position [x, y, z], so this Collectible's own
        // nested RigidBody (see Collectible.jsx) composes parent x child
        // transforms. Passing world coordinates here would double them.
        <Collectible letter={chunk.letter} position={[0, 1.5, 0]} />
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
