import { useState, useEffect } from 'react'
import { useWinSound } from '../audio/sounds.js'

export function SplashScreen({ onDismiss }) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [playWinSound] = useWinSound()

  const handleStart = () => {
    try {
      playWinSound()
    } catch {
      // Audio might need user gesture which this click provides
    }
    setFadeOut(true)
    setTimeout(() => {
      setVisible(false)
      if (onDismiss) onDismiss()
    }, 450)
  }

  if (!visible) return null

  return (
    <div
      onClick={handleStart}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 65%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
        color: '#ffffff',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        opacity: fadeOut ? 0 : 1,
        transform: fadeOut ? 'scale(1.06)' : 'scale(1)',
        transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Background Floating Ambient Particles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'pulseGlow 3s infinite alternate ease-in-out',
        }}
      />

      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes floatBadge {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* Main Card Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '560px',
          width: '100%',
          gap: '1.2rem',
          zIndex: 10,
        }}
      >
        {/* Animated Avatar / Badge Icon */}
        <div
          style={{
            width: 'clamp(5rem, 14vw, 7rem)',
            height: 'clamp(5rem, 14vw, 7rem)',
            borderRadius: '1.8rem',
            background: 'linear-gradient(135deg, #ff1493, #8b5cf6, #00e5ff)',
            border: '4px solid #ffffff',
            boxShadow: '0 0 40px rgba(255, 20, 147, 0.6), 0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 'clamp(2.5rem, 7vw, 3.6rem)',
            animation: 'floatBadge 3s ease-in-out infinite',
          }}
        >
          🏃‍♂️
        </div>

        {/* Small Pre-Header Badge */}
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1.5px solid #38bdf8',
            color: '#38bdf8',
            fontSize: 'clamp(0.75rem, 2vw, 0.95rem)',
            fontWeight: 'bold',
            letterSpacing: '0.15rem',
            textTransform: 'uppercase',
            padding: '0.35rem 1rem',
            borderRadius: '2rem',
            boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)',
          }}
        >
          ✨ 3D Spelling Obby ✨
        </div>

        {/* Welcome Daniel Greeting */}
        <h1
          style={{
            margin: '0.2rem 0',
            fontSize: 'clamp(2.2rem, 6.5vw, 3.8rem)',
            fontWeight: '900',
            letterSpacing: '0.04rem',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00, #ff1493, #00e5ff, #ffd700)',
            backgroundSize: '200% auto',
            color: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmerText 4s linear infinite',
            textShadow: '0 4px 30px rgba(255, 215, 0, 0.3)',
            lineHeight: 1.15,
          }}
        >
          Welcome Daniel
        </h1>

        {/* Subtitle Message */}
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(0.95rem, 2.6vw, 1.25rem)',
            color: '#cbd5e1',
            maxWidth: '440px',
            lineHeight: 1.4,
          }}
        >
          Spell words, dodge flying birds, leap over lava gaps, and unlock awesome outfits!
        </p>

        {/* Big Pulsing Start Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleStart()
          }}
          style={{
            marginTop: '0.8rem',
            fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
            fontWeight: '900',
            padding: 'clamp(0.75rem, 2vw, 1rem) clamp(2.4rem, 6vw, 3.6rem)',
            borderRadius: '2rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#ffffff',
            border: '3px solid #86efac',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.4)',
            letterSpacing: '0.08rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'transform 0.15s ease',
          }}
        >
          <span>LET'S PLAY</span>
          <span>▶</span>
        </button>

        {/* Tap anywhere hint */}
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
          (Tap anywhere or press button to start)
        </div>
      </div>
    </div>
  )
}
