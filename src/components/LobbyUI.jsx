import { useGameStore } from '../store/gameStore.js'

export function LobbyUI() {
  const gameState = useGameStore((state) => state.gameState)
  const unlockedColors = useGameStore((state) => state.unlockedColors)
  const equippedColor = useGameStore((state) => state.equippedColor)
  const equipColor = useGameStore((state) => state.equipColor)
  const unlockedTrails = useGameStore((state) => state.unlockedTrails)
  const equippedTrail = useGameStore((state) => state.equippedTrail)
  const equipTrail = useGameStore((state) => state.equipTrail)
  const masteredWords = useGameStore((state) => state.masteredWords)
  const startGame = useGameStore((state) => state.startGame)

  if (gameState !== 'lobby') return null

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
      padding: '2rem',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    }}>
      {/* Top Left: Customization Panel & Mastered Words */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '340px',
      }}>
        {/* Colors Panel */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '1rem 1.2rem',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <h3 style={{ color: 'white', margin: '0 0 0.6rem 0', fontSize: '1.1rem' }}>
            🎨 Outfits ({unlockedColors.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {unlockedColors.map((color) => (
              <button
                key={color}
                onClick={() => equipColor(color)}
                style={{
                  background: color,
                  width: '2.8rem',
                  height: '2.8rem',
                  border: color === equippedColor ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '0.6rem',
                  cursor: 'pointer',
                  transform: color === equippedColor ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  boxShadow: color === equippedColor ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Trails Panel (if any unlocked) */}
        {unlockedTrails.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '1rem 1.2rem',
            borderRadius: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}>
            <h3 style={{ color: 'white', margin: '0 0 0.6rem 0', fontSize: '1.1rem' }}>
              ✨ Particle Trails
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                onClick={() => equipTrail(null)}
                style={{
                  background: '#374151',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: equippedTrail === null ? '2px solid #ffffff' : '1px solid #4b5563',
                  fontSize: '0.85rem',
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
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: trail === equippedTrail ? '3px solid #ffffff' : '1px solid gray',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: trail === equippedTrail ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
                  }}
                >
                  {trail}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mastered Words Reward Shelf */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          padding: '1rem 1.2rem',
          borderRadius: '1rem',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <h3 style={{ color: '#fbbf24', margin: '0 0 0.6rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🏆</span>
            <span>Mastered Words ({masteredWords.length})</span>
          </h3>

          {masteredWords.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              Spell words during the run to earn trophies & unlock new outfits!
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {masteredWords.map((word) => (
                <span
                  key={word}
                  style={{
                    background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                    color: '#000000',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px rgba(234, 179, 8, 0.4)',
                    letterSpacing: '0.05rem',
                  }}
                >
                  ⭐ {word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Center: Play Button */}
      <div style={{ pointerEvents: 'auto', textAlign: 'center', marginBottom: '1rem' }}>
        <button
          onClick={startGame}
          style={{
            fontSize: '2.2rem',
            fontWeight: '900',
            padding: '1rem 4rem',
            borderRadius: '2.5rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            border: '3px solid #86efac',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(34, 197, 94, 0.5)',
            transform: 'scale(1)',
            transition: 'all 0.2s ease',
            letterSpacing: '0.1rem',
          }}
        >
          PLAY NOW
        </button>
      </div>
    </div>
  )
}
