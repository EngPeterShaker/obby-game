import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const COLOR_NAMES = {
  '#ff1493': 'Neon Pink',
  'hotpink': 'Neon Pink',
  '#00e5ff': 'Electric Cyan',
  '#10b981': 'Emerald Green',
  '#8b5cf6': 'Royal Purple',
  '#f97316': 'Blaze Orange',
  '#facc15': 'Sunburst Gold',
  '#ef4444': 'Crimson Red',
  '#14b8a6': 'Diamond Teal',
  '#6366f1': 'Cosmic Indigo',
  '#ec4899': 'Bubblegum Pink',
  '#1e293b': 'Stealth Midnight',
  '#f8fafc': 'Cloud White',
  'blue': 'Electric Blue',
  'gold': 'Champion Gold',
}

export function LobbyUI() {
  const gameState = useGameStore((state) => state.gameState)
  const unlockedColors = useGameStore((state) => state.unlockedColors)
  const equippedColor = useGameStore((state) => state.equippedColor)
  const equipColor = useGameStore((state) => state.equipColor)
  const unlockedTrails = useGameStore((state) => state.unlockedTrails)
  const equippedTrail = useGameStore((state) => state.equippedTrail)
  const equipTrail = useGameStore((state) => state.equipTrail)
  const masteredWords = useGameStore((state) => state.masteredWords)
  const currentTier = useGameStore((state) => state.currentTier)
  const setTier = useGameStore((state) => state.setTier)
  const startGame = useGameStore((state) => state.startGame)

  // Active drawer state: 'outfits' | 'levels' | 'trophies' | null
  const [activeMenu, setActiveMenu] = useState(null)

  if (gameState !== 'lobby') return null

  const levelOptions = [
    {
      id: 'level_1',
      title: 'Level 1: Easy',
      badge: '3 Letters',
      examples: 'CAT, DOG, SUN, ONE, TEN...',
      color: '#22c55e',
    },
    {
      id: 'level_2',
      title: 'Level 2: Medium',
      badge: '4 Letters',
      examples: 'JUMP, FAST, BIRD, STAR, FOUR...',
      color: '#eab308',
    },
    {
      id: 'level_3',
      title: 'Level 3: Hard',
      badge: '5+ Letters',
      examples: 'SPACE, ROCKET, PLANET, THREE...',
      color: '#ef4444',
    },
  ]

  const currentLevelInfo = levelOptions.find((l) => l.id === currentTier) || levelOptions[0]

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    }}>
      {/* Top Left: Sleek Category Menu Buttons */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.6rem',
        maxWidth: '360px',
        zIndex: 25,
      }}>
        {/* Toggle Pills Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Outfits Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'outfits' ? null : 'outfits')}
            style={{
              backgroundColor: activeMenu === 'outfits' ? '#38bdf8' : 'rgba(0, 0, 0, 0.75)',
              color: activeMenu === 'outfits' ? '#0f172a' : '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              padding: '0.55rem 0.9rem',
              borderRadius: '0.8rem',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'outfits' ? '0 0 14px rgba(56, 189, 248, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              width: '0.9rem',
              height: '0.9rem',
              borderRadius: '50%',
              backgroundColor: equippedColor,
              display: 'inline-block',
              border: '1px solid white',
            }} />
            <span>🎨 Outfits</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({COLOR_NAMES[equippedColor] || 'Custom'})</span>
          </button>

          {/* Difficulty Level Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'levels' ? null : 'levels')}
            style={{
              backgroundColor: activeMenu === 'levels' ? currentLevelInfo.color : 'rgba(0, 0, 0, 0.75)',
              color: activeMenu === 'levels' ? '#000000' : '#ffffff',
              border: `2px solid ${activeMenu === 'levels' ? currentLevelInfo.color : 'rgba(255, 255, 255, 0.25)'}`,
              padding: '0.55rem 0.9rem',
              borderRadius: '0.8rem',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'levels' ? `0 0 14px ${currentLevelInfo.color}88` : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📖</span>
            <span>{currentLevelInfo.title.split(':')[0]}</span>
            <span style={{
              fontSize: '0.75rem',
              background: activeMenu === 'levels' ? 'rgba(0,0,0,0.2)' : currentLevelInfo.color,
              color: activeMenu === 'levels' ? '#000000' : '#000000',
              padding: '0.1rem 0.35rem',
              borderRadius: '0.3rem',
            }}>
              {currentLevelInfo.badge}
            </span>
          </button>

          {/* Trophies Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'trophies' ? null : 'trophies')}
            style={{
              backgroundColor: activeMenu === 'trophies' ? '#fbbf24' : 'rgba(0, 0, 0, 0.75)',
              color: activeMenu === 'trophies' ? '#000000' : '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              padding: '0.55rem 0.9rem',
              borderRadius: '0.8rem',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'trophies' ? '0 0 14px rgba(251, 191, 36, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏆</span>
            <span>Trophies</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({masteredWords.length})</span>
          </button>
        </div>

        {/* On-Click Content Drawer: Outfits */}
        {activeMenu === 'outfits' && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '1rem 1.2rem',
            borderRadius: '1rem',
            border: '2px solid #38bdf8',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            width: '100%',
            maxHeight: 'calc(100vh - 12rem)',
            overflowY: 'auto',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.95rem' }}>
                🎨 Choose Character Color:
              </span>
              <button
                onClick={() => setActiveMenu(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✖
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
              {unlockedColors.map((color) => (
                <button
                  key={color}
                  title={COLOR_NAMES[color] || color}
                  onClick={() => equipColor(color)}
                  style={{
                    background: color,
                    width: '2.5rem',
                    height: '2.5rem',
                    border: color === equippedColor ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '0.6rem',
                    cursor: 'pointer',
                    transform: color === equippedColor ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: color === equippedColor ? `0 0 16px ${color}` : 'none',
                  }}
                />
              ))}
            </div>

            {/* Particle Trails */}
            {unlockedTrails.length > 0 && (
              <div>
                <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.88rem', margin: '0.6rem 0 0.4rem 0' }}>
                  ✨ Particle Trails
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <button
                    onClick={() => equipTrail(null)}
                    style={{
                      background: '#374151',
                      color: 'white',
                      padding: '0.35rem 0.7rem',
                      borderRadius: '0.5rem',
                      border: equippedTrail === null ? '2px solid #ffffff' : '1px solid #4b5563',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    None
                  </button>
                  {unlockedTrails.map((trail) => (
                    <button
                      key={trail}
                      onClick={() => equipTrail(trail)}
                      style={{
                        background: trail,
                        color: 'white',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '0.5rem',
                        border: trail === equippedTrail ? '3px solid #ffffff' : '1px solid gray',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {trail}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* On-Click Content Drawer: Level / Difficulty */}
        {activeMenu === 'levels' && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '1rem 1.2rem',
            borderRadius: '1rem',
            border: `2px solid ${currentLevelInfo.color}`,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            width: '100%',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                📖 Select Difficulty:
              </span>
              <button
                onClick={() => setActiveMenu(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✖
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {levelOptions.map((opt) => {
                const isSelected = currentTier === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTier(opt.id)
                      setActiveMenu(null)
                    }}
                    style={{
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.18)' : '#111827',
                      border: isSelected ? `2px solid ${opt.color}` : '1px solid #374151',
                      borderRadius: '0.7rem',
                      padding: '0.6rem 0.8rem',
                      cursor: 'pointer',
                      color: 'white',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 0 12px ${opt.color}66` : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: opt.color }}>
                        {opt.title} {isSelected && '✓'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                        {opt.examples}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      background: opt.color,
                      color: '#000000',
                      fontWeight: 'bold',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.3rem',
                    }}>
                      {opt.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* On-Click Content Drawer: Mastered Words Trophies */}
        {activeMenu === 'trophies' && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '1rem 1.2rem',
            borderRadius: '1rem',
            border: '2px solid #fbbf24',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            width: '100%',
            maxHeight: 'calc(100vh - 12rem)',
            overflowY: 'auto',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.95rem' }}>
                🏆 Mastered Trophy Words ({masteredWords.length})
              </span>
              <button
                onClick={() => setActiveMenu(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✖
              </button>
            </div>
            {masteredWords.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.82rem', lineHeight: '1.4' }}>
                Spell words during runs to earn star trophies and unlock new outfits!
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {masteredWords.map((word) => (
                  <span
                    key={word}
                    style={{
                      background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                      color: '#000000',
                      fontWeight: '900',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.4rem',
                      boxShadow: '0 2px 6px rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    ⭐ {word}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Center: Big Play Button */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.8rem',
      }}>
        <button
          onClick={() => startGame(currentTier)}
          style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
            fontWeight: '900',
            padding: 'clamp(0.7rem, 2vw, 1rem) clamp(2.5rem, 6vw, 4rem)',
            borderRadius: '2.5rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            border: '3px solid #86efac',
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(34, 197, 94, 0.6)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            letterSpacing: '0.08rem',
          }}
        >
          ▶ PLAY NOW
        </button>
      </div>
    </div>
  )
}
