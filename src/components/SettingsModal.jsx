import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const cameraPreset = useGameStore((state) => state.cameraPreset) || 'low'
  const setCameraPreset = useGameStore((state) => state.setCameraPreset)

  const cameraPresets = [
    {
      id: 'low',
      title: '🎥 Low Platformer',
      desc: 'Close, grounded perspective looking straight down the runway',
      badge: 'Grounded & Low',
    },
    {
      id: 'classic',
      title: '🏃 Classic 3rd Person',
      desc: 'Standard action platformer camera positioned behind the character',
      badge: 'Balanced',
    },
    {
      id: 'high',
      title: '🦅 High / Overview',
      desc: 'Elevated bird\'s eye perspective for an expansive view of upcoming letters & gaps',
      badge: 'Wide Overview',
    },
    {
      id: 'close',
      title: '🔍 Close Action',
      desc: 'Tight over-the-shoulder view focused close to the player',
      badge: 'Close-Up',
    },
  ]

  return (
    <>
      {/* Floating Settings Button in Top-Right */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '15.5rem',
          zIndex: 30,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.25)',
          padding: '0.6rem 1.1rem',
          borderRadius: '0.8rem',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s, background-color 0.2s',
        }}
      >
        <span>⚙️</span>
        <span>Settings</span>
      </button>

      {/* Settings Modal Dialog */}
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
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '1.2rem',
              border: '2px solid #374151',
              maxWidth: '520px',
              width: '100%',
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
                <span style={{ fontSize: '1.6rem' }}>⚙️</span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>Game Settings</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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

            {/* Camera Presets Section */}
            <div>
              <div style={{
                color: '#60a5fa',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <span>🎥</span>
                <span>Camera Perspective Presets</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {cameraPresets.map((preset) => {
                  const isSelected = cameraPreset === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setCameraPreset(preset.id)}
                      style={{
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.25)' : '#111827',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #374151',
                        borderRadius: '0.8rem',
                        padding: '0.8rem 1rem',
                        cursor: 'pointer',
                        color: '#ffffff',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          color: isSelected ? '#60a5fa' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}>
                          <span>{preset.title}</span>
                          {isSelected && <span style={{ color: '#60a5fa', fontSize: '0.9rem' }}>✓ Active</span>}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          {preset.desc}
                        </div>
                      </div>

                      <span style={{
                        background: isSelected ? '#3b82f6' : '#374151',
                        color: isSelected ? '#ffffff' : '#9ca3af',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.4rem',
                        whiteSpace: 'nowrap',
                      }}>
                        {preset.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '0.8rem',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '0.4rem',
              }}
            >
              Save & Apply
            </button>
          </div>
        </div>
      )}
    </>
  )
}
