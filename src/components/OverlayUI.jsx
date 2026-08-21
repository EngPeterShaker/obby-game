import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useDeathSound, useWrongLetterSound, useWinSound } from '../audio/sounds.js'

function WordProgressHUD() {
  const targetWord = useGameStore((state) => state.targetWord)
  const inventory = useGameStore((state) => state.inventory)
  const cognitiveStrikes = useGameStore((state) => state.cognitiveStrikes)
  const currentTier = useGameStore((state) => state.currentTier)

  const nextLetterIndex = inventory.length
  const nextLetter = targetWord[nextLetterIndex]

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.4rem',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Target Word Container */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '0.6rem 1.4rem',
        borderRadius: '1rem',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{
          color: '#fbbf24',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          letterSpacing: '0.1rem',
          textTransform: 'uppercase',
          marginBottom: '0.3rem',
        }}>
          🎯 Goal: Spell the Word
        </div>

        {/* Letter Boxes */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {targetWord.split('').map((char, index) => {
            const isCollected = index < inventory.length
            const isNext = index === nextLetterIndex

            return (
              <div
                key={index}
                style={{
                  width: '2.8rem',
                  height: '3.2rem',
                  borderRadius: '0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: '900',
                  fontSize: '1.6rem',
                  fontFamily: 'monospace',
                  transition: 'all 0.3s ease',
                  backgroundColor: isCollected
                    ? '#16a34a'
                    : isNext
                    ? '#eab308'
                    : '#374151',
                  color: isCollected || isNext ? '#ffffff' : '#9ca3af',
                  border: isNext
                    ? '3px solid #ffffff'
                    : isCollected
                    ? '2px solid #86efac'
                    : '2px solid #4b5563',
                  transform: isNext ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isNext ? '0 0 16px rgba(234, 179, 8, 0.8)' : 'none',
                }}
              >
                {isCollected ? inventory[index] : char}
              </div>
            )
          })}
        </div>

        {/* Hint Prompt */}
        {nextLetter && (
          <div style={{
            marginTop: '0.5rem',
            color: '#fef08a',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}>
            Collect letter: <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffffff' }}>"{nextLetter}"</span> (avoid decoys!)
          </div>
        )}
      </div>

      {/* Strikes Meter */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.6)',
        padding: '0.3rem 0.8rem',
        borderRadius: '0.8rem',
        color: '#f87171',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}>
        <span>Strikes (max 3):</span>
        <span>{cognitiveStrikes === 0 ? '💚 0/3' : cognitiveStrikes === 1 ? '⚠️ 1/3' : '🚨 2/3'}</span>
      </div>
    </div>
  )
}

export function OverlayUI() {
  const gameState = useGameStore((state) => state.gameState)
  const restart = useGameStore((state) => state.restart)
  const cognitiveStrikes = useGameStore((state) => state.cognitiveStrikes)
  const targetWord = useGameStore((state) => state.targetWord)

  const [playDeath] = useDeathSound()
  const [playWrongLetter] = useWrongLetterSound()
  const [playWin] = useWinSound()
  const prevGameState = useRef(gameState)
  const prevStrikes = useRef(cognitiveStrikes)
  const prevTargetWord = useRef(targetWord)
  const [flashRed, setFlashRed] = useState(false)
  const [wrongLetterMessage, setWrongLetterMessage] = useState(null)
  const [celebrationMessage, setCelebrationMessage] = useState(null)

  // Death sound
  useEffect(() => {
    if (gameState === 'dead' && prevGameState.current !== 'dead') {
      playDeath()
    }
    prevGameState.current = gameState
  }, [gameState, playDeath])

  // Wrong-letter feedback
  useEffect(() => {
    if (cognitiveStrikes > prevStrikes.current) {
      playWrongLetter()
      setFlashRed(true)
      setWrongLetterMessage('❌ Wrong Letter! Check the top banner!')
      const timeout1 = setTimeout(() => setFlashRed(false), 250)
      const timeout2 = setTimeout(() => setWrongLetterMessage(null), 1500)
      prevStrikes.current = cognitiveStrikes
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
      }
    }
    prevStrikes.current = cognitiveStrikes
  }, [cognitiveStrikes, playWrongLetter])

  // Word completed celebration
  useEffect(() => {
    if (prevTargetWord.current && prevTargetWord.current !== targetWord && gameState === 'playing') {
      playWin()
      setCelebrationMessage(`🎉 WORD COMPLETED: ${prevTargetWord.current}! Reward Unlocked!`)
      const timeout = setTimeout(() => setCelebrationMessage(null), 2500)
      prevTargetWord.current = targetWord
      return () => clearTimeout(timeout)
    }
    prevTargetWord.current = targetWord
  }, [targetWord, gameState, playWin])

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {gameState === 'playing' && (
        <>
          <WordProgressHUD />

          {/* Wrong Letter Alert Banner */}
          {wrongLetterMessage && (
            <div style={{
              position: 'absolute',
              top: '8rem',
              backgroundColor: 'rgba(220, 38, 38, 0.9)',
              color: 'white',
              padding: '0.6rem 1.4rem',
              borderRadius: '0.8rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.2s',
            }}>
              {wrongLetterMessage}
            </div>
          )}

          {/* Celebration Banner */}
          {celebrationMessage && (
            <div style={{
              position: 'absolute',
              top: '8rem',
              backgroundColor: 'rgba(22, 163, 74, 0.95)',
              color: 'white',
              padding: '0.8rem 1.8rem',
              borderRadius: '1rem',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              border: '2px solid #86efac',
            }}>
              {celebrationMessage}
            </div>
          )}

          {/* On-screen Jump Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', bubbles: true }))
            }}
            onPointerUp={(e) => {
              e.preventDefault()
              window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', key: 'j', bubbles: true }))
            }}
            style={{
              position: 'absolute',
              bottom: '2rem',
              right: '2rem',
              width: '5.5rem',
              height: '5.5rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.85)',
              color: 'white',
              border: '3px solid white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <span>⬆️</span>
            <span>JUMP</span>
          </button>
        </>
      )}

      {flashRed && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,0,0,0.35)',
          pointerEvents: 'none',
        }} />
      )}

      {gameState === 'dead' && (
        <div style={{
          pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)',
          padding: '2rem 3rem', borderRadius: '1rem', textAlign: 'center', color: 'white',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>You Fell!</h1>
          <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Don't worry! Try jumping over the gaps.</p>
          <button
            onClick={restart}
            style={{
              fontSize: '1.4rem',
              padding: '0.8rem 2.2rem',
              borderRadius: '0.8rem',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Respawn
          </button>
        </div>
      )}
    </div>
  )
}
