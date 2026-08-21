import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls, Sparkles, Trail } from '@react-three/drei'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'
import { BlockyCharacter } from './BlockyCharacter.jsx'

function DustEffect({ active }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!active) return
    setMounted(true)
    const timeout = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(timeout)
  }, [active])

  if (!mounted) return null

  return <Sparkles count={15} scale={[1, 0.2, 1]} size={4} speed={0.5} color="#e0e0e0" />
}

export function Player() {
  const rigidBodyRef = useRef()
  const gameState = useGameStore((state) => state.gameState)
  const equippedColor = useGameStore((state) => state.equippedColor)
  const equippedTrail = useGameStore((state) => state.equippedTrail)
  const prevVelYRef = useRef(0)
  const prevJumpRef = useRef(false)
  const respawnTimeRef = useRef(0)
  const [dustActive, setDustActive] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const dustRearmTimeoutRef = useRef(null)
  const [, getKeys] = useKeyboardControls()

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { y, z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z

    // Death check with grace period to eliminate respawn race condition
    const now = performance.now()
    if (gameState === 'playing' && y < -10 && (now - respawnTimeRef.current > 800)) {
      useGameStore.getState().die()
    }

    const { x: velX, y: velY, z: velZ } = rigidBodyRef.current.linvel()
    const horizontalSpeed = Math.hypot(velX, velZ)
    const moving = horizontalSpeed > 0.4
    if (moving !== isMoving) {
      setIsMoving(moving)
    }

    // Direct, ultra-responsive, fail-proof jump handling
    const { jump } = getKeys ? getKeys() : {}
    const justPressedJump = jump && !prevJumpRef.current
    prevJumpRef.current = !!jump

    // Allow jump whenever character is near road level and not already shooting upwards
    if (justPressedJump && gameState === 'playing' && y >= -1.5 && velY < 2.0) {
      rigidBodyRef.current.setLinvel({ x: velX, y: 7.0, z: velZ }, true)
      setDustActive(true)
      clearTimeout(dustRearmTimeoutRef.current)
      dustRearmTimeoutRef.current = setTimeout(() => setDustActive(false), 200)
    }

    const wasFalling = prevVelYRef.current < -0.5
    const nowGrounded = Math.abs(velY) < 0.1
    if (wasFalling && nowGrounded) {
      setDustActive(true)
      clearTimeout(dustRearmTimeoutRef.current)
      dustRearmTimeoutRef.current = setTimeout(() => setDustActive(false), 50)
    }
    prevVelYRef.current = velY
  })

  // Instant Reset: teleport and zero velocity on death or respawn
  useEffect(() => {
    if (rigidBodyRef.current) {
      if (gameState === 'playing') {
        respawnTimeRef.current = performance.now()
        rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      } else if (gameState === 'dead') {
        // Freeze falling immediately on death so the body isn't at y = -200
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      }
    }
  }, [gameState])

  useEffect(() => {
    return () => clearTimeout(dustRearmTimeoutRef.current)
  }, [])

  return (
    <Ecctrl
      ref={rigidBodyRef}
      position={[0, 5, 0]}
      camInitDir={{ x: -0.25, y: Math.PI }}
      camTargetPos={{ x: 0, y: 1.2, z: 0 }}
      characterInitDir={Math.PI}
      camInitDis={-7.5}
      camMaxDis={-10}
      camMinDis={-3}
      maxVelLimit={6.5}
      sprintMult={2.2}
      jumpVel={7.0}
      animated={false}
    >
      {equippedTrail ? (
        <Trail width={1.5} length={4} decay={2} color={equippedTrail}>
          <group position={[0, -0.85, 0]}>
            <BlockyCharacter color={equippedColor} animateWalk={isMoving} />
          </group>
        </Trail>
      ) : (
        <group position={[0, -0.85, 0]}>
          <BlockyCharacter color={equippedColor} animateWalk={isMoving} />
        </group>
      )}
      <DustEffect active={dustActive} />
    </Ecctrl>
  )
}
