import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Collectible } from './Collectible.jsx'
import { useGameStore } from '../store/gameStore.js'

// Flyweight: allocated once, shared across every chunk instance (spec §3.10)
const floorGeometry = new THREE.BoxGeometry(10, 1, 10)
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.8 }) // Road asphalt
const gapPlatformGeometry = new THREE.BoxGeometry(10, 1, 3.2)

// Road kerb stripes (sidewalk lines)
const kerbGeometry = new THREE.BoxGeometry(0.5, 1.05, 10)
const kerbMaterial = new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.5 })
const gapKerbGeometry = new THREE.BoxGeometry(0.5, 1.05, 3.2)

// Glowing Molten Lava pit under the gap
const lavaGeometry = new THREE.PlaneGeometry(16, 6)
const lavaMaterial = new THREE.MeshBasicMaterial({ color: '#ff3b00', side: THREE.DoubleSide })
const lavaGlowGeometry = new THREE.PlaneGeometry(16, 6)
const lavaGlowMaterial = new THREE.MeshBasicMaterial({
  color: '#ff8800',
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide,
})

// Gap Danger Hazard Stripes (Bright Yellow / Amber caution warning line at edge of chasm)
const hazardStripeGeometry = new THREE.BoxGeometry(10, 0.25, 0.6)
const hazardStripeMaterial = new THREE.MeshStandardMaterial({
  color: '#fbbf24',
  emissive: '#f59e0b',
  emissiveIntensity: 0.9,
  roughness: 0.2,
})

// Red / Orange tall caution edge beacons
const beaconGeometry = new THREE.BoxGeometry(0.4, 1.4, 0.4)
const beaconMaterial = new THREE.MeshStandardMaterial({
  color: '#ef4444',
  emissive: '#dc2626',
  emissiveIntensity: 1.0,
})

// Roadside Tree assets (Minecraft / Voxel style)
const trunkGeometry = new THREE.BoxGeometry(0.8, 3.2, 0.8)
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 })
const leavesBottomGeometry = new THREE.BoxGeometry(2.4, 1.4, 2.4)
const leavesTopGeometry = new THREE.BoxGeometry(1.6, 1.2, 1.6)
const leavesTipGeometry = new THREE.BoxGeometry(1.0, 0.8, 1.0)
const leavesMaterialGreen = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.8 })
const leavesMaterialEmerald = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 })
const leavesMaterialAutumn = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.8 })

// Grass patch under trees
const grassPatchGeometry = new THREE.BoxGeometry(3.5, 0.2, 10)
const gapGrassPatchGeometry = new THREE.BoxGeometry(3.5, 0.2, 3.2)
const grassPatchMaterial = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.9 })

// Guardrails Geometry & Materials (solid side rails with posts)
const railBeamGeometry = new THREE.BoxGeometry(0.3, 0.4, 10)
const railBeamGlowGeometry = new THREE.BoxGeometry(0.32, 0.15, 10)
const railPostGeometry = new THREE.BoxGeometry(0.35, 1.4, 0.35)
const gapRailBeamGeometry = new THREE.BoxGeometry(0.3, 0.4, 3.2)
const gapRailBeamGlowGeometry = new THREE.BoxGeometry(0.32, 0.15, 3.2)

const railMaterial = new THREE.MeshStandardMaterial({
  color: '#e2e8f0',
  metalness: 0.8,
  roughness: 0.2,
})
const railGlowMaterial = new THREE.MeshStandardMaterial({
  color: '#38bdf8',
  emissive: '#0284c7',
  emissiveIntensity: 0.8,
})
const railPostMaterial = new THREE.MeshStandardMaterial({
  color: '#334155',
  metalness: 0.5,
  roughness: 0.5,
})

function SafetyBumpers() {
  return (
    <>
      {/* Left Guardrail Side */}
      <group position={[-4.75, 0.8, 0]}>
        <mesh geometry={railBeamGeometry} material={railMaterial} position={[0, 0.3, 0]} castShadow />
        <mesh geometry={railBeamGlowGeometry} material={railGlowMaterial} position={[0, 0.3, 0]} />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, -4.5]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 0]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 4.5]} castShadow />
      </group>
      <CuboidCollider args={[0.3, 1.2, 5]} position={[-4.75, 1, 0]} />

      {/* Right Guardrail Side */}
      <group position={[4.75, 0.8, 0]}>
        <mesh geometry={railBeamGeometry} material={railMaterial} position={[0, 0.3, 0]} castShadow />
        <mesh geometry={railBeamGlowGeometry} material={railGlowMaterial} position={[0, 0.3, 0]} />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, -4.5]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 0]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 4.5]} castShadow />
      </group>
      <CuboidCollider args={[0.3, 1.2, 5]} position={[4.75, 1, 0]} />
    </>
  )
}

function GapSafetyBumpers() {
  return (
    <>
      {/* Left Platform Guardrail */}
      <group position={[-4.75, 0.8, 0]}>
        <mesh geometry={gapRailBeamGeometry} material={railMaterial} position={[0, 0.3, 0]} castShadow />
        <mesh geometry={gapRailBeamGlowGeometry} material={railGlowMaterial} position={[0, 0.3, 0]} />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, -1.2]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 1.2]} castShadow />
      </group>
      <CuboidCollider args={[0.3, 1.2, 1.6]} position={[-4.75, 1, 0]} />

      {/* Right Platform Guardrail */}
      <group position={[4.75, 0.8, 0]}>
        <mesh geometry={gapRailBeamGeometry} material={railMaterial} position={[0, 0.3, 0]} castShadow />
        <mesh geometry={gapRailBeamGlowGeometry} material={railGlowMaterial} position={[0, 0.3, 0]} />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, -1.2]} castShadow />
        <mesh geometry={railPostGeometry} material={railPostMaterial} position={[0, -0.3, 1.2]} castShadow />
      </group>
      <CuboidCollider args={[0.3, 1.2, 1.6]} position={[4.75, 1, 0]} />
    </>
  )
}

function VoxelTree({ position, variant = 0 }) {
  const leavesMat = variant === 0 ? leavesMaterialGreen : variant === 1 ? leavesMaterialEmerald : leavesMaterialAutumn
  return (
    <group position={position}>
      {/* Wood Trunk */}
      <mesh geometry={trunkGeometry} material={trunkMaterial} position={[0, 1.6, 0]} castShadow />
      {/* Lower Leaf Canopy */}
      <mesh geometry={leavesBottomGeometry} material={leavesMat} position={[0, 3.2, 0]} castShadow />
      {/* Middle Leaf Canopy */}
      <mesh geometry={leavesTopGeometry} material={leavesMat} position={[0, 4.3, 0]} castShadow />
      {/* Tip */}
      <mesh geometry={leavesTipGeometry} material={leavesMat} position={[0, 5.1, 0]} castShadow />
    </group>
  )
}

function RoadsideTrees({ chunkIndex = 0 }) {
  return (
    <>
      {/* Left Grass Verge */}
      <mesh geometry={grassPatchGeometry} material={grassPatchMaterial} position={[-6.75, 0.4, 0]} receiveShadow />
      {/* Right Grass Verge */}
      <mesh geometry={grassPatchGeometry} material={grassPatchMaterial} position={[6.75, 0.4, 0]} receiveShadow />

      {/* Roadside Trees */}
      <VoxelTree position={[-6.8, 0.5, -2.5]} variant={chunkIndex % 3} />
      <VoxelTree position={[6.8, 0.5, 2.5]} variant={(chunkIndex + 1) % 3} />
      <VoxelTree position={[-7.2, 0.5, 3.5]} variant={(chunkIndex + 2) % 3} />
      <VoxelTree position={[7.2, 0.5, -3.5]} variant={chunkIndex % 3} />
    </>
  )
}

function GapRoadsideTrees({ chunkIndex = 0 }) {
  return (
    <>
      {/* Split Grass Verges for each platform */}
      <mesh geometry={gapGrassPatchGeometry} material={grassPatchMaterial} position={[-6.75, 0.4, 3.4]} receiveShadow />
      <mesh geometry={gapGrassPatchGeometry} material={grassPatchMaterial} position={[6.75, 0.4, 3.4]} receiveShadow />
      <mesh geometry={gapGrassPatchGeometry} material={grassPatchMaterial} position={[-6.75, 0.4, -3.4]} receiveShadow />
      <mesh geometry={gapGrassPatchGeometry} material={grassPatchMaterial} position={[6.75, 0.4, -3.4]} receiveShadow />

      {/* Trees on platforms */}
      <VoxelTree position={[-6.8, 0.5, 3.4]} variant={chunkIndex % 3} />
      <VoxelTree position={[6.8, 0.5, 3.4]} variant={(chunkIndex + 1) % 3} />
      <VoxelTree position={[-7.2, 0.5, -3.4]} variant={(chunkIndex + 2) % 3} />
      <VoxelTree position={[7.2, 0.5, -3.4]} variant={chunkIndex % 3} />
    </>
  )
}

export function BasicChunk({ position, chunk }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const guardrails = useGameStore((state) => state.guardrails)
  const showGuardrails = isSafeMode || guardrails
  const chunkIndex = Math.abs(Math.round(position[2] / 10))

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" userData={{ isFloor: true }}>
        {/* Main Road Surface */}
        <mesh geometry={floorGeometry} material={floorMaterial} receiveShadow />
        {/* White Edge Lines / Kerbs */}
        <mesh geometry={kerbGeometry} material={kerbMaterial} position={[-4.75, 0.05, 0]} receiveShadow />
        <mesh geometry={kerbGeometry} material={kerbMaterial} position={[4.75, 0.05, 0]} receiveShadow />
        {showGuardrails && <SafetyBumpers />}
      </RigidBody>

      {/* Roadside Trees and Grass */}
      <RoadsideTrees chunkIndex={chunkIndex} />

      {chunk?.hasLetter && chunk?.letter && (
        <Collectible letter={chunk.letter} position={[0, 1.5, 0]} />
      )}
    </group>
  )
}

export function GapChunk({ position, chunk }) {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const guardrails = useGameStore((state) => state.guardrails)
  const showGuardrails = isSafeMode || guardrails
  const chunkIndex = Math.abs(Math.round(position[2] / 10))

  return (
    <group position={position}>
      {/* Glowing Molten Lava in the bottom of the gap */}
      <mesh geometry={lavaGeometry} material={lavaMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} />
      <mesh geometry={lavaGlowGeometry} material={lavaGlowMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]} />

      {/* Front Platform (Z = +3.4) */}
      <RigidBody type="fixed" position={[0, 0, 3.4]} colliders="cuboid" userData={{ isFloor: true }}>
        <mesh geometry={gapPlatformGeometry} material={floorMaterial} receiveShadow />
        <mesh geometry={gapKerbGeometry} material={kerbMaterial} position={[-4.75, 0.05, 0]} receiveShadow />
        <mesh geometry={gapKerbGeometry} material={kerbMaterial} position={[4.75, 0.05, 0]} receiveShadow />
        {/* Glowing Warning Hazard Stripe at drop-off edge */}
        <mesh geometry={hazardStripeGeometry} material={hazardStripeMaterial} position={[0, 0.52, -1.4]} />
        {/* Red warning beacon posts */}
        <mesh geometry={beaconGeometry} material={beaconMaterial} position={[-4.6, 0.8, -1.4]} />
        <mesh geometry={beaconGeometry} material={beaconMaterial} position={[4.6, 0.8, -1.4]} />
        {showGuardrails && <GapSafetyBumpers />}
      </RigidBody>

      {/* Back Platform (Z = -3.4) */}
      <RigidBody type="fixed" position={[0, 0, -3.4]} colliders="cuboid" userData={{ isFloor: true }}>
        <mesh geometry={gapPlatformGeometry} material={floorMaterial} receiveShadow />
        <mesh geometry={gapKerbGeometry} material={kerbMaterial} position={[-4.75, 0.05, 0]} receiveShadow />
        <mesh geometry={gapKerbGeometry} material={kerbMaterial} position={[4.75, 0.05, 0]} receiveShadow />
        {/* Glowing Warning Hazard Stripe at landing edge */}
        <mesh geometry={hazardStripeGeometry} material={hazardStripeMaterial} position={[0, 0.52, 1.4]} />
        {/* Red warning beacon posts */}
        <mesh geometry={beaconGeometry} material={beaconMaterial} position={[-4.6, 0.8, 1.4]} />
        <mesh geometry={beaconGeometry} material={beaconMaterial} position={[4.6, 0.8, 1.4]} />
        {showGuardrails && <GapSafetyBumpers />}
      </RigidBody>

      {/* Open Chasm with split trees/grass on the platforms */}
      <GapRoadsideTrees chunkIndex={chunkIndex} />

      {chunk?.hasLetter && chunk?.letter && (
        <Collectible letter={chunk.letter} position={[0, 1.5, 0]} />
      )}
    </group>
  )
}

export function ChunkRenderer({ chunk }) {
  switch (chunk.type) {
    case 'basic':
      return <BasicChunk position={chunk.position} chunk={chunk} />
    case 'gap':
      return <GapChunk position={chunk.position} chunk={chunk} />
    default:
      return null
  }
}
