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
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        padding: 'clamp(0.35rem, 0.9vw, 0.5rem) clamp(0.5rem, 1.4vw, 0.85rem)',
        borderRadius: '0.8rem',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}>
        <div style={{
          color: '#fbbf24',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          letterSpacing: '0.06rem',
          textTransform: 'uppercase',
          marginBottom: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}>
          <span>🎯 Target Word</span>
          {isRevealed ? (
            <span style={{
              background: '#22c55e',
              color: 'white',
              fontSize: '0.65rem',
              padding: '0.06rem 0.3rem',
              borderRadius: '0.25rem',
            }}>
              {peekCountdown ? `Visible (${peekCountdown}s)` : 'Visible'}
            </span>
          ) : (
            <span style={{
              background: '#6b7280',
              color: 'white',
              fontSize: '0.65rem',
              padding: '0.06rem 0.3rem',
              borderRadius: '0.25rem',
            }}>
              Hidden
            </span>
          )}
        </div>

        {/* Letter Boxes */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {targetWord.split('').map((char, index) => {
            const isCollected = index < inventory.length
            const isNext = index === nextLetterIndex

            return (
              <div
                key={index}
                style={{
                  width: 'clamp(1.6rem, 3.4vw, 2.3rem)',
                  height: 'clamp(1.9rem, 4.0vw, 2.6rem)',
                  borderRadius: '0.45rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: '900',
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.3rem)',
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
                    ? '2px solid #ffffff'
                    : isCollected
                    ? '2px solid #86efac'
                    : isRevealed
                    ? '1.5px solid #4b5563'
                    : '1.5px dashed #4b5563',
                  transform: isNext && isRevealed ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isNext && isRevealed ? '0 0 10px rgba(234, 179, 8, 0.8)' : 'none',
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
  const lastReward = useGameStore((state) => state.lastReward)
  const rewardEventId = useGameStore((state) => state.rewardEventId)

  const [playDeath] = useDeathSound()
  const [playWrongLetter] = useWrongLetterSound()
  const [playWin] = useWinSound()
  const prevGameState = useRef(gameState)
  const prevStrikes = useRef(cognitiveStrikes)
  const prevRewardEventId = useRef(rewardEventId)
  const [flashRed, setFlashRed] = useState(false)
  const [wrongLetterMessage, setWrongLetterMessage] = useState(null)
  const [celebration, setCelebration] = useState(null)

  const flashRedTimeoutRef = useRef(null)
  const wrongLetterMessageTimeoutRef = useRef(null)
  const celebrationTimeoutRef = useRef(null)

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
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current)
    }
  }, [])

  // Word completed celebration — keyed off rewardEventId (bumped ONLY in
  // gameStore's word-completion branch), not off targetWord changing. A
  // cognitive-strike downgrade also changes targetWord without completing a
  // word; watching targetWord directly (the old approach) fired this same
  // "WORD COMPLETED! Reward Unlocked!" banner on a downgrade too, a false
  // positive. rewardEventId only advances on an actual completion.
  useEffect(() => {
    if (rewardEventId !== prevRewardEventId.current && lastReward && gameState === 'playing') {
      playWin()
      setCelebration(lastReward)
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current)
      celebrationTimeoutRef.current = setTimeout(() => setCelebration(null), 3200)
    }
    prevRewardEventId.current = rewardEventId
  }, [rewardEventId, lastReward, gameState, playWin])

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {gameState === 'playing' && (
        <>
          <style>{`
            @keyframes rewardPop {
              0% { transform: scale(0.6); opacity: 0; }
              60% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>

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
          {celebration && (
            <div style={{
              position: 'absolute',
              top: '11rem',
              backgroundColor: 'rgba(22, 163, 74, 0.97)',
              color: 'white',
              padding: '1.2rem 2.4rem',
              borderRadius: '1.4rem',
              boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 0 0 6px rgba(134, 239, 172, 0.25)',
              border: '3px solid #86efac',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'rewardPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                🎉 WORD COMPLETED: {celebration.word}!
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '0.5rem 1rem',
                borderRadius: '0.9rem',
              }}>
                <span style={{
                  width: '1.6rem',
                  height: '1.6rem',
                  borderRadius: '50%',
                  backgroundColor: celebration.value,
                  border: '2px solid white',
                  boxShadow: `0 0 14px ${celebration.value}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
                  {celebration.isNew
                    ? `New ${celebration.type === 'trail' ? 'Trail' : 'Outfit'}: ${celebration.label}!`
                    : `Bonus Remix: ${celebration.label}!`}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#bbf7d0', fontWeight: 'normal' }}>
                {celebration.isNew
                  ? '⭐ Added to your Mastered Trophy Shelf & Outfit Closet!'
                  : '⭐ Added to your Mastered Trophy Shelf — equipped as a fresh look!'}
              </div>
            </div>
          )}

          {/* Bottom-Left: Run / Sprint Button (Left Thumb) */}
          <div style={{
            position: 'absolute',
            bottom: '1.8rem',
            left: '1.8rem',
            pointerEvents: 'auto',
            zIndex: 20,
          }}>
            <button
              onPointerDown={(e) => {
                e.preventDefault()
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', key: 'Shift', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              onPointerUp={(e) => {
                e.preventDefault()
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              onPointerLeave={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              onPointerCancel={() => {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft', key: 'Shift', bubbles: true }))
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }))
              }}
              style={{
                width: 'clamp(4.2rem, 11vw, 5.2rem)',
                height: 'clamp(4.2rem, 11vw, 5.2rem)',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                color: 'white',
                border: '3px solid white',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.5)',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🏃</span>
              <span>RUN</span>
            </button>
          </div>

          {/* Bottom-Right: Jump Button (Right Thumb) */}
          <div style={{
            position: 'absolute',
            bottom: '1.8rem',
            right: '1.8rem',
            pointerEvents: 'auto',
            zIndex: 20,
          }}>
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
                width: 'clamp(4.8rem, 12vw, 5.8rem)',
                height: 'clamp(4.8rem, 12vw, 5.8rem)',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.85)',
                color: 'white',
                border: '3px solid white',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.5)',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⬆️</span>
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
