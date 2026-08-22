// src/components/TopMenu.jsx
import { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { SettingsModal } from './SettingsModal.jsx'
import { ControlsModal } from './ControlsModal.jsx'
import { WordAdminPanel } from './WordAdminPanel.jsx'

// Replaces three independently-mounted, always-visible floating buttons
// (Settings, How to Play & Controls, Word Admin) that each hardcoded their
// own `right: Xrem` offset to avoid overlapping one another. That math only
// worked on wide-enough viewports — on a narrower screen the buttons
// wrapped/overlapped the target-word HUD. One trigger + a small dropdown
// avoids needing three separate magic-number offsets to ever line up
// correctly again.
//
// Also fixes a second, independent problem: none of the three old buttons
// checked `gameState`, so they stayed on screen during actual gameplay too,
// permanently competing with the live HUD and the reward celebration
// banner for the same corner. Settings/Controls/Word Admin are all
// pre-game or parent-only concerns, so this component (and therefore all
// three panels) only renders in the lobby.
const MENU_ITEMS = [
  { id: 'settings', icon: '⚙️', label: 'Settings' },
  { id: 'controls', icon: '🎮', label: 'How to Play & Controls' },
  { id: 'wordAdmin', icon: '🔒', label: 'Word Admin (Parents)' },
]

export function TopMenu() {
  const gameState = useGameStore((state) => state.gameState)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openPanelId, setOpenPanelId] = useState(null) // 'settings' | 'controls' | 'wordAdmin' | null

  if (gameState !== 'lobby') return null

  return (
    <>
      <button
        onClick={() => setIsMenuOpen((open) => !open)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 30,
          pointerEvents: 'auto',
          backgroundColor: isMenuOpen ? 'rgba(59, 130, 246, 0.85)' : 'rgba(0, 0, 0, 0.75)',
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
          transition: 'background-color 0.15s ease',
        }}
      >
        <span>☰</span>
        <span>Menu</span>
      </button>

      {isMenuOpen && (
        <>
          {/* Click-away backdrop — invisible, just closes the dropdown */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 29, pointerEvents: 'auto' }}
          />

          <div
            style={{
              position: 'absolute',
              top: '4.2rem',
              right: '1rem',
              zIndex: 31,
              pointerEvents: 'auto',
              backgroundColor: 'rgba(17, 24, 39, 0.97)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '0.9rem',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              minWidth: '13rem',
            }}
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setOpenPanelId(item.id)
                  setIsMenuOpen(false)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.55rem 0.7rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <SettingsModal isOpen={openPanelId === 'settings'} onClose={() => setOpenPanelId(null)} />
      <ControlsModal isOpen={openPanelId === 'controls'} onClose={() => setOpenPanelId(null)} />
      <WordAdminPanel isOpen={openPanelId === 'wordAdmin'} onClose={() => setOpenPanelId(null)} />
    </>
  )
}
