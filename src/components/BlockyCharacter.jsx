import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function BlockyCharacter({ color = 'hotpink', animateWalk = false }) {
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()

  useFrame(({ clock }) => {
    if (animateWalk) {
      const t = clock.getElapsedTime() * 10
      const angle = Math.sin(t) * 0.6
      if (leftArmRef.current) leftArmRef.current.rotation.x = angle
      if (rightArmRef.current) rightArmRef.current.rotation.x = -angle
      if (leftLegRef.current) leftLegRef.current.rotation.x = -angle
      if (rightLegRef.current) rightLegRef.current.rotation.x = angle
    } else {
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
    }
  })

  return (
    <group>
      {/* Head */}
      <group position={[0, 1.15, 0]}>
        {/* Head Base (Skin) */}
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.38, 0.38]} />
          <meshStandardMaterial color="#fcd0a1" />
        </mesh>
        {/* Hair Cap */}
        <mesh castShadow position={[0, 0.08, -0.02]}>
          <boxGeometry args={[0.4, 0.26, 0.38]} />
          <meshStandardMaterial color="#4a2e18" />
        </mesh>
        {/* Hair Front Bangs */}
        <mesh castShadow position={[0, 0.16, 0.09]}>
          <boxGeometry args={[0.4, 0.1, 0.22]} />
          <meshStandardMaterial color="#4a2e18" />
        </mesh>
        {/* Left Eye */}
        <mesh position={[-0.09, 0.02, 0.192]}>
          <boxGeometry args={[0.07, 0.06, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.08, 0.02, 0.194]}>
          <boxGeometry args={[0.035, 0.06, 0.01]} />
          <meshBasicMaterial color="#2563eb" />
        </mesh>
        {/* Right Eye */}
        <mesh position={[0.09, 0.02, 0.192]}>
          <boxGeometry args={[0.07, 0.06, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.1, 0.02, 0.194]}>
          <boxGeometry args={[0.035, 0.06, 0.01]} />
          <meshBasicMaterial color="#2563eb" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, -0.09, 0.192]}>
          <boxGeometry args={[0.09, 0.03, 0.01]} />
          <meshBasicMaterial color="#b45309" />
        </mesh>
      </group>

      {/* Torso / Shirt */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.42, 0.48, 0.24]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Left Arm (Pivots at shoulder y = 0.9) */}
      <group ref={leftArmRef} position={[-0.3, 0.9, 0]}>
        <group position={[0, -0.21, 0]}>
          {/* Sleeve */}
          <mesh castShadow position={[0, 0.09, 0]}>
            <boxGeometry args={[0.16, 0.22, 0.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Hand */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[0.15, 0.2, 0.18]} />
            <meshStandardMaterial color="#fcd0a1" />
          </mesh>
        </group>
      </group>

      {/* Right Arm (Pivots at shoulder y = 0.9) */}
      <group ref={rightArmRef} position={[0.3, 0.9, 0]}>
        <group position={[0, -0.21, 0]}>
          {/* Sleeve */}
          <mesh castShadow position={[0, 0.09, 0]}>
            <boxGeometry args={[0.16, 0.22, 0.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Hand */}
          <mesh castShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[0.15, 0.2, 0.18]} />
            <meshStandardMaterial color="#fcd0a1" />
          </mesh>
        </group>
      </group>

      {/* Left Leg (Pivots at hip y = 0.48) */}
      <group ref={leftLegRef} position={[-0.11, 0.48, 0]}>
        <group position={[0, -0.24, 0]}>
          {/* Pants */}
          <mesh castShadow position={[0, 0.06, 0]}>
            <boxGeometry args={[0.19, 0.34, 0.22]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          {/* Shoe */}
          <mesh castShadow position={[0, -0.17, 0.02]}>
            <boxGeometry args={[0.19, 0.14, 0.25]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>
      </group>

      {/* Right Leg (Pivots at hip y = 0.48) */}
      <group ref={rightLegRef} position={[0.11, 0.48, 0]}>
        <group position={[0, -0.24, 0]}>
          {/* Pants */}
          <mesh castShadow position={[0, 0.06, 0]}>
            <boxGeometry args={[0.19, 0.34, 0.22]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          {/* Shoe */}
          <mesh castShadow position={[0, -0.17, 0.02]}>
            <boxGeometry args={[0.19, 0.14, 0.25]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>
      </group>
    </group>
  )
}
