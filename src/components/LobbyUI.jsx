import { useGameStore } from '../store/gameStore.js'

export function LobbyUI() {
  const gameState = useGameStore((state) => state.gameState)
  const unlockedColors = useGameStore((state) => state.unlockedColors)
  const equippedColor = useGameStore((state) => state.equippedColor)
  const equipColor = useGameStore((state) => state.equipColor)
  const startGame = useGameStore((state) => state.startGame)

  if (gameState !== 'lobby') return null

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '2rem', pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto', background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
        padding: '1rem', borderRadius: '0.5rem', maxWidth: '300px',
      }}>
        <h3 style={{ color: 'white' }}>Colors</h3>
        {unlockedColors.map((color) => (
          <button
            key={color}
            onClick={() => equipColor(color)}
            style={{
              background: color, width: '3rem', height: '3rem', margin: '0.25rem',
              border: color === equippedColor ? '3px solid white' : '1px solid gray',
              borderRadius: '50%', cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
        <button
          onClick={startGame}
          style={{
            fontSize: '2rem', padding: '1rem 3rem', borderRadius: '2rem',
            background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer',
          }}
        >
          PLAY
        </button>
      </div>
    </div>
  )
}
