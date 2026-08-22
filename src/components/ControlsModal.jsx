import { useState, useEffect } from 'react'

export function ControlsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('laptop') // 'laptop' | 'mobile'

  useEffect(() => {
    // Detect mobile / touch device
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches))

    if (isTouchDevice) {
      setActiveTab('mobile')
    } else {
      setActiveTab('laptop')
    }
  }, [])

  return (
    <>
      {/* Modal Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '1.2rem',
              border: '2px solid #374151',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '1.8rem',
              color: '#ffffff',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.6rem' }}>🎮</span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>How to Play & Controls</h2>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                ✖
              </button>
            </div>

            {/* Device Switcher Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#111827',
                borderRadius: '0.8rem',
                padding: '0.3rem',
                gap: '0.3rem',
              }}
            >
              <button
                onClick={() => setActiveTab('laptop')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '0.6rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  backgroundColor: activeTab === 'laptop' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'laptop' ? '#ffffff' : '#9ca3af',
                  transition: 'all 0.2s',
                }}
              >
                💻 Laptop / Desktop
              </button>
              <button
                onClick={() => setActiveTab('mobile')}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '0.6rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  backgroundColor: activeTab === 'mobile' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'mobile' ? '#ffffff' : '#9ca3af',
                  transition: 'all 0.2s',
                }}
              >
                📱 Mobile / Touch
              </button>
            </div>

            {/* Tab 1: Laptop / Desktop Controls */}
            {activeTab === 'laptop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.4rem' }}>
                    🏃 Movement
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Move Forward / Back / Sides</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: '#374151', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
                      W, A, S, D or ↑ ↓ ← →
                    </span>
                  </div>
                </div>

                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#4ade80', marginBottom: '0.4rem' }}>
                    ⬆️ Jump
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Jump over road gaps</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: '#374151', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
                      Space, J, K, E, or ⬆️ button
                    </span>
                  </div>
                </div>

                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.4rem' }}>
                    ⚡ Sprint / Run
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Run fast</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: '#374151', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
                      Hold Shift, R, F, or 🏃 button
                    </span>
                  </div>
                </div>

                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#c084fc', marginBottom: '0.4rem' }}>
                    🎥 Camera
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Rotate view</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: '#374151', padding: '0.2rem 0.5rem', borderRadius: '0.4rem' }}>
                      Click & Drag Mouse
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Mobile / Touch Controls */}
            {activeTab === 'mobile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.4rem' }}>
                    🕹️ Movement & Camera
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                    • Drag on screen to steer and run forward.<br />
                    • Swipe to rotate the camera around your character.
                  </div>
                </div>

                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#4ade80', marginBottom: '0.4rem' }}>
                    ⬆️ Jump Button
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                    Tap the green <strong>⬆️ JUMP</strong> button at the bottom-right corner to leap over road gaps.
                  </div>
                </div>

                <div style={{ background: '#111827', padding: '0.9rem', borderRadius: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.4rem' }}>
                    🏃 Sprint / Run Button
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                    Hold down the blue <strong>🏃 RUN</strong> button to sprint at double speed.
                  </div>
                </div>
              </div>
            )}

            {/* Game Rules / Goal */}
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                padding: '0.8rem 1rem',
                borderRadius: '0.8rem',
                fontSize: '0.88rem',
                color: '#fef08a',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              }}
            >
              <div><strong>🎯 Memory Goal:</strong> The target word is revealed for 3 seconds then hides into <code>[ ? ]</code>!</div>
              <div>• Collect the letters in order to spell the word.</div>
              <div>• Tap <strong>💡 Peek Word (2s)</strong> anytime to reveal the word for 2 seconds.</div>
              <div>• Jump over molten lava gaps and dodge <strong>🦅 Flying Birds</strong> (hitting a bird is instant death!).</div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '0.8rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Got it, Let's Play!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
