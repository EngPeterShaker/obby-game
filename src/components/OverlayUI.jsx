import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useDeathSound, useWrongLetterSound } from '../audio/sounds.js'

function WordProgressHUD() {
  const targetWord = useGameStore((state) => state.targetWord)
  const inventory = useGameStore((state) => state.inventory)

  const display = targetWord
    .split('')
    .map((letter, i) => (i < inventory.length ? inventory[i] : '_'))
    .join(' ')

  return (
    <div style={{
      position: 'absolute', top: '1rem', left: '1rem',
      color: 'white', fontSize: '1.5rem', fontFamily: 'monospace',
      letterSpacing: '0.25rem', background: 'rgba(0,0,0,0.5)',
      padding: '0.5rem 1rem', borderRadius: '0.5rem',
      pointerEvents: 'none',
    }}>
      {display}
    </div>
  )
}

export function OverlayUI() {
  const gameState = useGameStore((state) => state.gameState)
  const restart = useGameStore((state) => state.restart)
  const cognitiveStrikes = useGameStore((state) => state.cognitiveStrikes)

  const [playDeath] = useDeathSound()
  const [playWrongLetter] = useWrongLetterSound()
  const prevGameState = useRef(gameState)
  const prevStrikes = useRef(cognitiveStrikes)
  const [flashRed, setFlashRed] = useState(false)

  // Death sound: fire once on the 'playing' -> 'dead' transition, not on
  // every render while gameState === 'dead'.
  useEffect(() => {
    if (gameState === 'dead' && prevGameState.current !== 'dead') {
      playDeath()
    }
    prevGameState.current = gameState
  }, [gameState, playDeath])

  // Wrong-letter feedback: cognitiveStrikes only increases on a wrong-letter
  // collection (collectLetter in gameStore.js resets it to 0 on any correct
  // pickup), so a strict increase is an unambiguous "wrong letter" event.
  // The 200ms flash uses a cleanup-cleared setTimeout so a death (which
  // unmounts nothing here, since OverlayUI stays mounted, but could still
  // race a restart/state change) never calls setState after this effect's
  // own re-run or the component's unmount.
  useEffect(() => {
    if (cognitiveStrikes > prevStrikes.current) {
      playWrongLetter()
      setFlashRed(true)
      const timeout = setTimeout(() => setFlashRed(false), 200)
      prevStrikes.current = cognitiveStrikes
      return () => clearTimeout(timeout)
    }
    prevStrikes.current = cognitiveStrikes
  }, [cognitiveStrikes, playWrongLetter])

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {gameState === 'playing' && <WordProgressHUD />}
      {flashRed && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,0,0,0.3)',
          pointerEvents: 'none',
        }} />
      )}
      {gameState === 'dead' && (
        <div style={{
          pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)',
          padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: 'white',
        }}>
          <h1>You Fell!</h1>
          <button onClick={restart} style={{ fontSize: '1.5rem', padding: '0.5rem 1.5rem' }}>
            Respawn
          </button>
        </div>
      )}
    </div>
  )
}
