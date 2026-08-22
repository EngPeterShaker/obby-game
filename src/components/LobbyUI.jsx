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
  // Level 1 reward-pool colors
  '#fb7185': 'Coral Blush',
  '#fde047': 'Lemon Sparkle',
  '#a3e635': 'Lime Zest',
  '#5eead4': 'Aqua Mint',
  '#93c5fd': 'Sky Powder',
  '#d8b4fe': 'Lilac Dream',
  '#fdba74': 'Peach Glow',
  '#f9a8d4': 'Cotton Candy',
  // Level 3 reward-pool colors
  '#eab308': 'Champion Gold',
  '#0ea5e9': 'Sapphire Shine',
  '#059669': 'Jade Legend',
  '#7c3aed': 'Cosmic Violet',
}

const TRAIL_NAMES = {
  // Level 2 reward-pool trails
  '#fb923c': 'Sunset Streak',
  '#4ade80': 'Emerald Streak',
  '#38bdf8': 'Sky Streak',
  '#f472b6': 'Bubblegum Streak',
  '#a78bfa': 'Violet Streak',
  '#22d3ee': 'Aqua Streak',
  '#fbbf24': 'Amber Streak',
  // Level 3 reward-pool trails
  '#f43f5e': 'Ruby Blaze',
  '#a855f7': 'Amethyst Rush',
  '#db2777': 'Magenta Comet',
  '#f59e0b': 'Solar Flare',
}

const MODE_OPTIONS = [
  {
    id: 'spelling_en',
    title: 'English Spelling',
    icon: '🇺🇸',
    badge: 'Words',
    desc: 'Spell English words letter by letter',
    color: '#38bdf8',
  },
  {
    id: 'spelling_ar',
    title: 'تهجئة الكلمات العربية',
    icon: '🇸🇦',
    badge: 'عربي',
    desc: 'تهجئة الكلمات العربية من اليمين لليسار',
    color: '#10b981',
  },
  {
    id: 'vowels_en',
    title: 'Missing Vowels',
    icon: '🅰️',
    badge: 'A,E,I,O,U',
    desc: 'Find and collect missing vowel letters in words',
    color: '#f59e0b',
  },
  {
    id: 'math_basic',
    title: 'Math Equations',
    icon: '🔢',
    badge: '1 + 2 = ?',
    desc: 'Solve arithmetic equations by collecting numbers',
    color: '#a855f7',
  },
]

export function LobbyUI() {
  const gameState = useGameStore((state) => state.gameState)
  const gameMode = useGameStore((state) => state.gameMode || 'spelling_en')
  const setGameMode = useGameStore((state) => state.setGameMode)
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

  // Active drawer state: 'modes' | 'outfits' | 'levels' | 'trophies' | null
  const [activeMenu, setActiveMenu] = useState(null)

  if (gameState !== 'lobby') return null

  const levelOptions = [
    {
      id: 'level_1',
      title: 'Level 1: Easy',
      badge: 'Tier 1',
      examples: gameMode === 'spelling_ar' ? 'قطة, كلب, شمس, قمر...' : gameMode === 'math_basic' ? '2 + 3 = ?, 5 - 2 = ?' : 'CAT, DOG, SUN, ONE, TEN...',
      color: '#22c55e',
    },
    {
      id: 'level_2',
      title: 'Level 2: Medium',
      badge: 'Tier 2',
      examples: gameMode === 'spelling_ar' ? 'طائر, كتاب, سمكة, شجرة...' : gameMode === 'math_basic' ? '12 + 6 = ?, 15 - 7 = ?' : 'JUMP, FAST, BIRD, STAR...',
      color: '#eab308',
    },
    {
      id: 'level_3',
      title: 'Level 3: Hard',
      badge: 'Tier 3',
      examples: gameMode === 'spelling_ar' ? 'طائرة, صاروخ, كوكب, حديقة...' : gameMode === 'math_basic' ? '4 × 3 = ?, 25 - 8 = ?' : 'SPACE, ROCKET, PLANET...',
      color: '#ef4444',
    },
  ]

  const currentLevelInfo = levelOptions.find((l) => l.id === currentTier) || levelOptions[0]
  const currentModeInfo = MODE_OPTIONS.find((m) => m.id === gameMode) || MODE_OPTIONS[0]

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
        maxWidth: '420px',
        zIndex: 25,
      }}>
        {/* Toggle Pills Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {/* Game Mode Pill */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'modes' ? null : 'modes')}
            style={{
              backgroundColor: activeMenu === 'modes' ? currentModeInfo.color : 'rgba(0, 0, 0, 0.78)',
              color: activeMenu === 'modes' ? '#0f172a' : '#ffffff',
              border: `2px solid ${activeMenu === 'modes' ? currentModeInfo.color : 'rgba(255, 255, 255, 0.25)'}`,
              padding: '0.5rem 0.85rem',
              borderRadius: '0.8rem',
              fontSize: '0.86rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'modes' ? `0 0 14px ${currentModeInfo.color}88` : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{currentModeInfo.icon}</span>
            <span>{currentModeInfo.title.split(' ')[0]}</span>
            <span style={{
              fontSize: '0.72rem',
              background: activeMenu === 'modes' ? 'rgba(0,0,0,0.2)' : currentModeInfo.color,
              color: activeMenu === 'modes' ? '#000000' : '#000000',
              padding: '0.1rem 0.3rem',
              borderRadius: '0.3rem',
              fontWeight: '900',
            }}>
              {currentModeInfo.badge}
            </span>
          </button>

          {/* Outfits Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'outfits' ? null : 'outfits')}
            style={{
              backgroundColor: activeMenu === 'outfits' ? '#38bdf8' : 'rgba(0, 0, 0, 0.78)',
              color: activeMenu === 'outfits' ? '#0f172a' : '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              padding: '0.5rem 0.85rem',
              borderRadius: '0.8rem',
              fontSize: '0.86rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'outfits' ? '0 0 14px rgba(56, 189, 248, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              width: '0.85rem',
              height: '0.85rem',
              borderRadius: '50%',
              backgroundColor: equippedColor,
              display: 'inline-block',
              border: '1px solid white',
            }} />
            <span>🎨 Outfits</span>
          </button>

          {/* Difficulty Level Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'levels' ? null : 'levels')}
            style={{
              backgroundColor: activeMenu === 'levels' ? currentLevelInfo.color : 'rgba(0, 0, 0, 0.78)',
              color: activeMenu === 'levels' ? '#000000' : '#ffffff',
              border: `2px solid ${activeMenu === 'levels' ? currentLevelInfo.color : 'rgba(255, 255, 255, 0.25)'}`,
              padding: '0.5rem 0.85rem',
              borderRadius: '0.8rem',
              fontSize: '0.86rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'levels' ? `0 0 14px ${currentLevelInfo.color}88` : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📖</span>
            <span>{currentLevelInfo.title.split(':')[0]}</span>
          </button>

          {/* Trophies Button */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'trophies' ? null : 'trophies')}
            style={{
              backgroundColor: activeMenu === 'trophies' ? '#fbbf24' : 'rgba(0, 0, 0, 0.78)',
              color: activeMenu === 'trophies' ? '#000000' : '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              padding: '0.5rem 0.85rem',
              borderRadius: '0.8rem',
              fontSize: '0.86rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backdropFilter: 'blur(8px)',
              boxShadow: activeMenu === 'trophies' ? '0 0 14px rgba(251, 191, 36, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏆</span>
            <span>({masteredWords.length})</span>
          </button>
        </div>

        {/* On-Click Content Drawer: Game Modes */}
        {activeMenu === 'modes' && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.90)',
            backdropFilter: 'blur(12px)',
            padding: '1rem 1.2rem',
            borderRadius: '1rem',
            border: `2px solid ${currentModeInfo.color}`,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            width: '100%',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                🎮 Select Game Mode / Skill:
              </span>
              <button
                onClick={() => setActiveMenu(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✖
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MODE_OPTIONS.map((opt) => {
                const isSelected = gameMode === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setGameMode(opt.id)
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
                      <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: opt.color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{opt.icon}</span>
                        <span>{opt.title}</span>
                        {isSelected && <span style={{ color: '#86efac' }}>✓</span>}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                        {opt.desc}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      background: opt.color,
                      color: '#000000',
                      fontWeight: 'bold',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '0.3rem',
                      flexShrink: 0,
                    }}>
                      {opt.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* On-Click Content Drawer: Outfits */}
        {activeMenu === 'outfits' && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.90)',
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
                      {TRAIL_NAMES[trail] || trail}
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
            background: 'rgba(0, 0, 0, 0.90)',
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
            background: 'rgba(0, 0, 0, 0.90)',
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
                🏆 Mastered Trophies ({masteredWords.length})
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
                Complete words and equations during runs to earn star trophies and unlock new outfits!
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
