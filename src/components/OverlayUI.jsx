import { useGameStore } from '../store/gameStore.js'

export function OverlayUI() {
  const gameState = useGameStore((state) => state.gameState)
  const restart = useGameStore((state) => state.restart)

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
    }}>
      {gameState === 'dead' && (
        <div style={{
          pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)',
          padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: 'white',
        }}>
          <h1>You Fell!</h1>
          <button onClick={restart} style={{ fontSize: '1.5rem', padding: '0.5rem 1.5rem' }}>
            Respawn
          </button>
        </div>
      )}
    </div>
  )
}
