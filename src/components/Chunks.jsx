import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'

// Flyweight: allocated once, shared across every chunk instance (spec §3.10)
const floorGeometry = new THREE.BoxGeometry(10, 1, 10)
const floorMaterial = new THREE.MeshStandardMaterial({ color: 'gray' })
const gapFloorGeometry = new THREE.BoxGeometry(10, 1, 4)

export function BasicChunk({ position }) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
    </RigidBody>
  )
}

export function GapChunk({ position }) {
  const [x, y, z] = position
  return (
    <>
      <RigidBody type="fixed" position={[x, y, z + 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
      </RigidBody>
      <RigidBody type="fixed" position={[x, y, z - 3]} colliders="cuboid">
        <mesh geometry={gapFloorGeometry} material={floorMaterial} receiveShadow />
      </RigidBody>
    </>
  )
}

export function ChunkRenderer({ chunk }) {
  switch (chunk.type) {
    case 'basic':
      return <BasicChunk position={chunk.position} />
    case 'gap':
      return <GapChunk position={chunk.position} />
    default:
      return null
  }
}
