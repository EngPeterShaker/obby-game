import { useState, useEffect } from 'react'

export function LandscapeGuard() {
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const isTouchDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches

      const isHeightGreater = window.innerHeight > window.innerWidth
      const isMobileTabletWidth = Math.min(window.innerWidth, window.innerHeight) <= 1024

      // Trigger guard if touch device is held in portrait
      setIsPortrait(isHeightGreater && (isTouchDevice || isMobileTabletWidth))
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  if (!isPortrait) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        textAlign: 'center',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Animated Rotating Device Icon */}
      <div
        style={{
          width: '5.5rem',
          height: '5.5rem',
          borderRadius: '1.2rem',
          border: '3px solid #38bdf8',
          boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '2.8rem',
          marginBottom: '1.8rem',
          animation: 'rotateDevice 2s infinite ease-in-out',
        }}
      >
        📱
      </div>

      <style>{`
        @keyframes rotateDevice {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(90deg) scale(1.1); }
          100% { transform: rotate(90deg) scale(1); }
        }
      `}</style>

      <h1
        style={{
          fontSize: '1.8rem',
          fontWeight: '900',
          margin: '0 0 0.8rem 0',
          color: '#38bdf8',
          letterSpacing: '0.05rem',
        }}
      >
        Please Rotate to Landscape
      </h1>

      <p
        style={{
          fontSize: '1.05rem',
          color: '#94a3b8',
          maxWidth: '380px',
          lineHeight: '1.5',
          margin: 0,
        }}
      >
        <strong>Obby Game</strong> is designed for landscape mode on tablets and phones for the best visibility, controls, and gameplay!
      </p>

      <div
        style={{
          marginTop: '1.8rem',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          padding: '0.6rem 1.2rem',
          borderRadius: '0.8rem',
          fontSize: '0.9rem',
          color: '#bae6fd',
        }}
      >
        🔄 Turn your device sideways to continue
      </div>
    </div>
  )
}
