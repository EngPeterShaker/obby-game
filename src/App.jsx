import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import { Player } from './components/Player.jsx'
import { OverlayUI } from './components/OverlayUI.jsx'
import { LevelManager } from './components/LevelManager.jsx'

// ecctrl@1.0.82 confirmed action names (Task 4 investigation, from ecctrl's
// own readme.md): 'leftward' / 'rightward', NOT 'left' / 'right'.
const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'leftward', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'rightward', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
]

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} castShadow />
          <Physics gravity={[0, -9.81, 0]}>
            <LevelManager />
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <OverlayUI />
    </div>
  )
}
