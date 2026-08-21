import { useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, ContactShadows } from '@react-three/drei'
import { Player } from './components/Player.jsx'
import { OverlayUI } from './components/OverlayUI.jsx'
import { LevelManager } from './components/LevelManager.jsx'
import { ShowcasePlayer } from './components/ShowcasePlayer.jsx'
import { LobbyUI } from './components/LobbyUI.jsx'
import { useGameStore } from './store/gameStore.js'

const NORMAL_SKY_COLOR = '#87ceeb'
const SAFETY_MODE_SKY_COLOR = '#2a0a4a'

// Safety Mode environmental signaling (spec §3.5): the sky/fog color
// gradually shifts toward purple once mechanicalDeaths >= 6, and reverts
// once the player spells a word (which resets mechanicalDeaths to 0).
//
// Chose a useFrame-driven THREE.Color lerp over @react-spring/three's
// animated.color here: react-spring's spring output for a color string is
// an AnimatedString, not a plain array, so feeding it into
// `args={[bgColor]}` on `<animated.color>`/`<animated.fog>` requires an
// extra interpolation step (`bgColor.to(...)`) to convert it into
// something Three.js's Color/Fog constructors accept — the brief itself
// flags this as awkward and offers this lerp as a verified-simpler
// alternative. Driving `scene.background`/`scene.fog` directly every frame
// sidesteps that conversion entirely and is easy to reason about.
const normalColor = new THREE.Color(NORMAL_SKY_COLOR)
const safetyModeColor = new THREE.Color(SAFETY_MODE_SKY_COLOR)

function SafeModeBackground() {
  const isSafeMode = useGameStore((state) => state.mechanicalDeaths >= 6)
  const colorRef = useRef(new THREE.Color(NORMAL_SKY_COLOR))

  useFrame(({ scene }) => {
    const target = isSafeMode ? safetyModeColor : normalColor
    colorRef.current.lerp(target, 0.02)

    if (!scene.fog) {
      scene.fog = new THREE.Fog(colorRef.current.clone(), 10, 50)
    }
    scene.background = colorRef.current
    scene.fog.color.copy(colorRef.current)
  })

  return null
}

// ecctrl@1.0.82 confirmed action names (Task 4 investigation, from ecctrl's
// own readme.md): 'leftward' / 'rightward', NOT 'left' / 'right'.
const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'leftward', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'rightward', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space', 'KeyJ', 'KeyK', 'KeyE', 'KeyZ', 'KeyC', 'Numpad0'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight', 'KeyR', 'KeyF'] },
]

export default function App() {
  const gameState = useGameStore((state) => state.gameState)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }} shadows>
          <SafeModeBackground />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} castShadow />
          {gameState === 'lobby' && <ShowcasePlayer />}
          {(gameState === 'playing' || gameState === 'dead') && (
            <Physics gravity={[0, -9.81, 0]}>
              <LevelManager />
              <Player />
              <ContactShadows position={[0, -0.49, 0]} opacity={0.4} scale={10} blur={2} far={10} />
            </Physics>
          )}
        </Canvas>
      </KeyboardControls>
      <LobbyUI />
      <OverlayUI />
    </div>
  )
}
