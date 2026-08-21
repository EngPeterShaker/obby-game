import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { useDeathSound, useWrongLetterSound, useWinSound } from '../audio/sounds.js'

function WordProgressHUD() {
  const targetWord = useGameStore((state) => state.targetWord)
  const inventory = useGameStore((state) => state.inventory)
  const cognitiveStrikes = useGameStore((state) => state.cognitiveStrikes)
  const masteredWords = useGameStore((state) => state.masteredWords)

  const [isRevealed, setIsRevealed] = useState(true)
  const [peekCountdown, setPeekCountdown] = useState(null)
  const hideTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  const nextLetterIndex = inventory.length
  const nextLetter = targetWord[nextLetterIndex]

  // Reveal for 3 seconds on new target word
  useEffect(() => {
    setIsRevealed(true)
    setPeekCountdown(3)

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    let remaining = 3
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current)
        setPeekCountdown(null)
      } else {
        setPeekCountdown(remaining)
      }
    }, 1000)

    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false)
      setPeekCountdown(null)
    }, 3000)

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [targetWord])

  // Handle 2-second peek button
  const handlePeek = () => {
    if (isRevealed && peekCountdown !== null) return // Already peeking

    setIsRevealed(true)
    setPeekCountdown(2)

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    let remaining = 2
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current)
        setPeekCountdown(null)
      } else {
        setPeekCountdown(remaining)
      }
    }, 1000)

    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false)
      setPeekCountdown(null)
    }, 2000)
  }

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.5rem',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Target Word Container (Top-Left) */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '0.7rem 1.3rem',
        borderRadius: '1.2rem',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}>
        <div style={{
          color: '#fbbf24',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          letterSpacing: '0.1rem',
          textTransform: 'uppercase',
          marginBottom: '0.3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>🎯 Target Word</span>
          {isRevealed ? (
            <span style={{
              background: '#22c55e',
              color: 'white',
              fontSize: '0.72rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '0.3rem',
            }}>
              {peekCountdown ? `Visible (${peekCountdown}s)` : 'Visible'}
            </span>
          ) : (
            <span style={{
              background: '#6b7280',
              color: 'white',
              fontSize: '0.72rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '0.3rem',
            }}>
              Hidden
            </span>
          )}
        </div>

        {/* Letter Boxes */}
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          {targetWord.split('').map((char, index) => {
            const isCollected = index < inventory.length
            const isNext = index === nextLetterIndex

            return (
              <div
                key={index}
                style={{
                  width: '2.9rem',
                  height: '3.3rem',
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
                    : isNext && isRevealed
                    ? '#eab308'
                    : isRevealed
                    ? '#374151'
                    : '#1f2937',
                  color: isCollected || (isRevealed && isNext) ? '#ffffff' : isRevealed ? '#9ca3af' : '#6b7280',
                  border: isNext && isRevealed
                    ? '3px solid #ffffff'
                    : isCollected
                    ? '2px solid #86efac'
                    : isRevealed
                    ? '2px solid #4b5563'
                    : '2px dashed #4b5563',
                  transform: isNext && isRevealed ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isNext && isRevealed ? '0 0 14px rgba(234, 179, 8, 0.8)' : 'none',
                }}
              >
                {isCollected ? inventory[index] : isRevealed ? char : '?'}
              </div>
            )
          })}
        </div>

        {/* Hint or Hidden Notice */}
        <div style={{
          marginTop: '0.4rem',
          fontSize: '0.86rem',
          fontWeight: '600',
          color: isRevealed ? '#fef08a' : '#9ca3af',
        }}>
          {isRevealed && nextLetter ? (
            <span>Collect letter: <strong style={{ fontSize: '1rem', color: '#ffffff' }}>"{nextLetter}"</strong></span>
          ) : (
            <span>🧠 Hidden! Remember the letters</span>
          )}
        </div>
      </div>

      {/* Action Row: Peek Button, Strikes, Mastered Trophy */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', pointerEvents: 'auto' }}>
        {/* Peek Button */}
        <button
          onClick={handlePeek}
          style={{
            background: isRevealed
              ? 'rgba(234, 179, 8, 0.9)'
              : 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '2px solid #fbbf24',
            color: isRevealed ? '#000000' : '#fbbf24',
            padding: '0.35rem 0.85rem',
            borderRadius: '0.8rem',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: isRevealed ? '0 0 14px rgba(234, 179, 8, 0.6)' : '0 4px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <span>💡</span>
          <span>{isRevealed && peekCountdown ? `Showing (${peekCountdown}s)` : 'Peek Word (2s)'}</span>
        </button>

        {/* Strikes Meter */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '0.35rem 0.75rem',
          borderRadius: '0.8rem',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#f87171',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}>
          <span>Strikes:</span>
          <span>{cognitiveStrikes === 0 ? '💚 0/3' : cognitiveStrikes === 1 ? '⚠️ 1/3' : '🚨 2/3'}</span>
        </div>

        {/* Mastered Words Badge */}
        {masteredWords.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '0.35rem 0.75rem',
            borderRadius: '0.8rem',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#fbbf24',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}>
            <span>🏆</span>
            <span>{masteredWords.length}</span>
          </div>
        )}
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

  const flashRedTimeoutRef = useRef(null)
  const wrongLetterMessageTimeoutRef = useRef(null)

  // Death sound
  useEffect(() => {
    if (gameState === 'dead' && prevGameState.current !== 'dead') {
      playDeath()
    }
    prevGameState.current = gameState
  }, [gameState, playDeath])

  // Wrong-letter feedback with guaranteed 2.0-second auto-clearing timer
  useEffect(() => {
    if (cognitiveStrikes > prevStrikes.current) {
      playWrongLetter()
      setFlashRed(true)
      setWrongLetterMessage('❌ Wrong Letter! Check the top banner!')

      // Clear any existing timers
      if (flashRedTimeoutRef.current) clearTimeout(flashRedTimeoutRef.current)
      if (wrongLetterMessageTimeoutRef.current) clearTimeout(wrongLetterMessageTimeoutRef.current)

      // Auto-clear red screen overlay after 2 seconds
      flashRedTimeoutRef.current = setTimeout(() => {
        setFlashRed(false)
      }, 2000)

      // Auto-clear message banner after 2 seconds
      wrongLetterMessageTimeoutRef.current = setTimeout(() => {
        setWrongLetterMessage(null)
      }, 2000)
    }
    prevStrikes.current = cognitiveStrikes
  }, [cognitiveStrikes, playWrongLetter])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (flashRedTimeoutRef.current) clearTimeout(flashRedTimeoutRef.current)
      if (wrongLetterMessageTimeoutRef.current) clearTimeout(wrongLetterMessageTimeoutRef.current)
    }
  }, [])

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
              backgroundColor: 'rgba(220, 38, 38, 0.95)',
              color: 'white',
              padding: '0.7rem 1.6rem',
              borderRadius: '0.8rem',
              fontSize: '1.15rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              border: '2px solid #fca5a5',
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
              padding: '1rem 2rem',
              borderRadius: '1.2rem',
              fontSize: '1.35rem',
              fontWeight: 'bold',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              border: '3px solid #86efac',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              animation: 'fadeIn 0.2s',
            }}>
              <div>{celebrationMessage}</div>
              <div style={{ fontSize: '0.95rem', color: '#bbf7d0', fontWeight: 'normal' }}>
                ⭐ Added to your Mastered Trophy Shelf & Unlocked New Outfit!
              </div>
            </div>
          )}

          {/* On-screen Controls (Run & Jump) */}
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            pointerEvents: 'auto',
          }}>
            {/* Run / Sprint Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault()
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              onPointerUp={(e) => {
                e.preventDefault()
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              style={{
                width: '4.8rem',
                height: '4.8rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                color: 'white',
                border: '3px solid white',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              <span>🏃</span>
              <span>RUN</span>
            </button>

            {/* Jump Button */}
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
                width: '5.5rem',
                height: '5.5rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.85)',
                color: 'white',
                border: '3px solid white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
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
          </div>
        </>
      )}

      {/* Red Warning Screen Overlay with smooth fade */}
      {flashRed && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(239, 68, 68, 0.22)',
          boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.7)',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
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
