// ecctrl@1.0.82 confirmed API (Task 4 investigation): ref.current is the raw
// Rapier RigidBody (no wrapper object, no useImperativeHandle) — exposes
// .translation(), .setTranslation(), .linvel(), .setLinvel(), etc. directly.
import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../store/gameStore.js'

// Landing dust puff. `active` flips true for a brief window on a
// falling->grounded velocity transition (see Player's useFrame below);
// this sub-component turns that pulse into a ~300ms visible burst.
//
// The setTimeout below is guarded with a cleanup so it can never call
// setState after unmount — e.g. if the player dies (Player.jsx unmounts
// the whole <Ecctrl> tree, including this component, per the gameState
// === 'dead' early-return) partway through the 300ms window.
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
  const prevVelYRef = useRef(0)
  const [dustActive, setDustActive] = useState(false)
  // Holds the id of the "re-arm" timeout scheduled below, so it can be
  // cancelled if Player unmounts (death) before it fires — same
  // unmount-safety requirement as DustEffect's own internal timeout.
  const dustRearmTimeoutRef = useRef(null)

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const { y, z } = rigidBodyRef.current.translation()
    useGameStore.getState().playerZ = z

    if (y < -10 && useGameStore.getState().gameState === 'playing') {
      useGameStore.getState().die()
    }

    // Dust puff trigger: detect a falling -> grounded velocity transition.
    // This setState-in-useFrame call is the narrow, spec-sanctioned
    // exception (Task 14 brief / spec §3.9): it's event-triggered — fires
    // only on landing, a handful of times per session, never continuously
    // per-frame — and it uses React's own useState, NOT Zustand's set().
    // The hard rule "never call Zustand's set() inside useFrame for
    // per-frame data" is untouched by this; playerZ above is still
    // written via direct mutation (useGameStore.getState().playerZ = z),
    // never useGameStore's set(). Do not generalize this useState call to
    // anything that runs every frame.
    const { y: velY } = rigidBodyRef.current.linvel()
    const wasFalling = prevVelYRef.current < -0.5
    const nowGrounded = Math.abs(velY) < 0.1
    if (wasFalling && nowGrounded) {
      setDustActive(true)
      clearTimeout(dustRearmTimeoutRef.current)
      dustRearmTimeoutRef.current = setTimeout(() => setDustActive(false), 50)
    }
    prevVelYRef.current = velY
  })

  // Respawn: whenever gameState transitions to 'playing' (including the
  // post-death "Respawn" click), teleport the rigid body back to the spawn
  // point and zero out velocity so it doesn't retain falling momentum.
  useEffect(() => {
    if (gameState === 'playing' && rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [gameState])

  // Cancel any pending dust re-arm timeout on unmount (e.g. death cuts in
  // mid-window) so it never fires setDustActive after this component is
  // gone.
  useEffect(() => {
    return () => clearTimeout(dustRearmTimeoutRef.current)
  }, [])

  // While dead, unmount the controller entirely (per brief) — the death
  // modal takes over and there's nothing to render/control until respawn.
  if (gameState === 'dead') return null

  return (
    <Ecctrl
      ref={rigidBodyRef}
      position={[0, 5, 0]}
      camInitDis={-6}
      camMaxDis={-8}
      maxVelLimit={6}
      jumpVel={5}
      animated={false}
    >
      <mesh castShadow position={[0, -0.9, 0]}>
        <capsuleGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
      <DustEffect active={dustActive} />
    </Ecctrl>
  )
}
