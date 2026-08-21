import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore.js'

export function TouchSwipeController() {
  const gameState = useGameStore((state) => state.gameState)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const isTouchingRef = useRef(false)
  const currentSteerRef = useRef(null) // 'left' | 'right' | null
  const isMovingForwardRef = useRef(false)

  useEffect(() => {
    if (gameState !== 'playing') {
      // Clear any keys when not playing
      if (currentSteerRef.current) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: currentSteerRef.current === 'left' ? 'KeyA' : 'KeyD' }))
        currentSteerRef.current = null
      }
      if (isMovingForwardRef.current) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }))
        isMovingForwardRef.current = false
      }
      isTouchingRef.current = false
    }
  }, [gameState])

  const handlePointerDown = (e) => {
    // Only capture primary touch
    if (gameState !== 'playing') return
    isTouchingRef.current = true
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
    }

    // Touch down always moves forward down the track
    if (!isMovingForwardRef.current) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }))
      isMovingForwardRef.current = true
    }
  }

  const handlePointerMove = (e) => {
    if (!isTouchingRef.current || gameState !== 'playing') return

    const deltaX = e.clientX - touchStartRef.current.x
    const deltaY = e.clientY - touchStartRef.current.y
    const now = performance.now()
    const deltaTime = now - touchStartRef.current.time

    // Check for upward swipe to jump (fast upward flick)
    if (deltaY < -40 && deltaTime < 400) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', bubbles: true }))
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', key: 'j', bubbles: true }))
      }, 100)
      // Reset start Y to prevent multiple jump triggers in single swipe
      touchStartRef.current.y = e.clientY
    }

    // Steer left or right based on horizontal drag offset
    const steerThreshold = 18 // pixels of horizontal drag

    if (deltaX < -steerThreshold) {
      // Steer Left
      if (currentSteerRef.current !== 'left') {
        if (currentSteerRef.current === 'right') {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd', bubbles: true }))
        }
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a', bubbles: true }))
        currentSteerRef.current = 'left'
      }
    } else if (deltaX > steerThreshold) {
      // Steer Right
      if (currentSteerRef.current !== 'right') {
        if (currentSteerRef.current === 'left') {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', key: 'a', bubbles: true }))
        }
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true }))
        currentSteerRef.current = 'right'
      }
    } else {
      // Centered (no steer)
      if (currentSteerRef.current) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: currentSteerRef.current === 'left' ? 'KeyA' : 'KeyD', bubbles: true }))
        currentSteerRef.current = null
      }
    }
  }

  const handlePointerUp = () => {
    if (!isTouchingRef.current) return
    isTouchingRef.current = false

    // Release all movement keys
    if (currentSteerRef.current) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: currentSteerRef.current === 'left' ? 'KeyA' : 'KeyD', bubbles: true }))
      currentSteerRef.current = null
    }

    if (isMovingForwardRef.current) {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
      isMovingForwardRef.current = false
    }
  }

  if (gameState !== 'playing') return null

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        top: '6rem', // Leave top HUD buttons clickable
        left: '7.5rem', // Leave left RUN button clickable
        right: '7.5rem', // Leave right JUMP button clickable
        bottom: 0,
        zIndex: 5,
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        WebkitTapHighlightColor: 'transparent',
      }}
    />
  )
}
