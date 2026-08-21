import { useState } from 'react'
import { useCustomWordsStore } from '../store/customWordsStore.js'
import { useGameStore } from '../store/gameStore.js'
import { getEffectiveVocabulary, assignTierByLength } from '../store/gameStore.logic.js'
import vocabData from '../data/vocabulary.json'

const TIER_LABELS = {
  level_1: 'Level 1: Easy',
  level_2: 'Level 2: Medium',
  level_3: 'Level 3: Hard',
}

// The math gate is deliberately just friction against a child wandering in
// mid-play, not real security — do not "harden" this into a real PIN/auth
// system without discussing that trade-off first.
function generateMathProblem() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a * b }
}

export function WordAdminPanel() {
  const gameState = useGameStore((state) => state.gameState)
  const [isOpen, setIsOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [problem, setProblem] = useState(generateMathProblem)
  const [answerInput, setAnswerInput] = useState('')
  const [gateError, setGateError] = useState('')
  const [activeTier, setActiveTier] = useState('level_1')
  const [newWordInput, setNewWordInput] = useState('')
  const [wordError, setWordError] = useState('')

  const addedWords = useCustomWordsStore((state) => state.addedWords)
  const hiddenWords = useCustomWordsStore((state) => state.hiddenWords)
  const addWord = useCustomWordsStore((state) => state.addWord)
  const removeAddedWord = useCustomWordsStore((state) => state.removeAddedWord)
  const hideBuiltinWord = useCustomWordsStore((state) => state.hideBuiltinWord)
  const unhideWord = useCustomWordsStore((state) => state.unhideWord)
  const restoreDefaults = useCustomWordsStore((state) => state.restoreDefaults)

  const effectiveVocab = getEffectiveVocabulary(vocabData, { addedWords, hiddenWords })

  function openPanel() {
    setIsOpen(true)
    setUnlocked(false)
    setProblem(generateMathProblem())
    setAnswerInput('')
    setGateError('')
  }

  function checkGate() {
    if (Number(answerInput) === problem.answer) {
      setUnlocked(true)
      setGateError('')
    } else {
      setGateError('Try again')
      setProblem(generateMathProblem())
      setAnswerInput('')
    }
  }

  function handleAddWord() {
    const word = newWordInput.trim().toUpperCase()
    if (!word) {
      setWordError('Enter a word')
      return
    }
    if (!/^[A-Z]+$/.test(word)) {
      setWordError('Letters only')
      return
    }
    const tier = assignTierByLength(word)

    // If this word is a hidden built-in, re-adding it means "un-hide it", not
    // "add it as a new custom word" — otherwise it ends up in BOTH addedWords
    // and hiddenWords simultaneously, which corrupts the merge once hiddenWords
    // is later cleared (e.g. via Restore All Defaults).
    if (hiddenWords.includes(word) && vocabData[tier].words.includes(word)) {
      unhideWord(word)
      setNewWordInput('')
      setWordError('')
      setActiveTier(tier)
      return
    }

    if (effectiveVocab[tier].words.includes(word)) {
      setWordError('Already in the list')
      return
    }
    addWord(word, tier)
    setNewWordInput('')
    setWordError('')
    setActiveTier(tier)
  }

  function handleRemoveWord(word, tier) {
    const isBuiltin = vocabData[tier].words.includes(word)
    if (isBuiltin) {
      hideBuiltinWord(word)
    } else {
      removeAddedWord(word, tier)
    }
  }

  if (gameState !== 'lobby') return null

  if (!isOpen) {
    return (
      <button
        onClick={openPanel}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '30rem',
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
        }}
      >
        <span>🔒</span>
        <span>Word Admin</span>
      </button>
    )
  }

  return (
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
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.8rem',
          color: '#ffffff',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🔒 Parent Access</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer' }}
          >
            ✖
          </button>
        </div>

        {!unlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ fontSize: '1.2rem' }}>
              What is {problem.a} × {problem.b}?
            </div>
            <input
              type="number"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkGate()}
              style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #4b5563', fontSize: '1rem' }}
            />
            {gateError && <div style={{ color: '#ef4444' }}>{gateError}</div>}
            <button
              onClick={checkGate}
              style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Unlock
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {Object.keys(TIER_LABELS).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: activeTier === tier ? '2px solid #3b82f6' : '1px solid #4b5563',
                    background: activeTier === tier ? 'rgba(59,130,246,0.2)' : '#111827',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {TIER_LABELS[tier]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {effectiveVocab[activeTier].words.map((word) => {
                const canRemove = effectiveVocab[activeTier].words.length > 1
                return (
                  <span
                    key={word}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#374151',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '0.5rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {word}
                    <button
                      onClick={() => canRemove && handleRemoveWord(word, activeTier)}
                      disabled={!canRemove}
                      title={canRemove ? 'Remove' : "Can't remove the last word in a tier"}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: canRemove ? '#ef4444' : '#6b7280',
                        cursor: canRemove ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                placeholder="Add a word..."
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #4b5563' }}
              />
              <button
                onClick={handleAddWord}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Add
              </button>
            </div>
            {wordError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{wordError}</div>}

            <button
              onClick={restoreDefaults}
              style={{ backgroundColor: '#374151', color: '#d1d5db', border: '1px solid #4b5563', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Restore All Defaults
            </button>
          </>
        )}
      </div>
    </div>
  )
}
