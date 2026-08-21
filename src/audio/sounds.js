// Web Audio API Synthesizer: Zero-latency, zero-dependency, works 100% offline
// without needing external .mp3 files or generating 404 network errors.

class SoundFX {
  constructor() {
    this.ctx = null
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  playCollect() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // 2-tone melodic sparkle chime (C5 -> C6)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.28)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(659.25, now + 0.05)
    osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.2)
    gain2.gain.setValueAtTime(0.2, now + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.05)
    osc2.stop(now + 0.32)
  }

  playFall() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Descending comic fall pitch
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(280, now)
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.45)
  }

  playBuzz() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Short friendly error buzzer
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.setValueAtTime(110, now + 0.08)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.22)
  }

  playWin() {
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Triumphant 4-tone victory arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const start = now + i * 0.09
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.3, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.38)
    })
  }
}

const sfx = new SoundFX()

export function useCollectSound() {
  return [() => sfx.playCollect()]
}

export function useDeathSound() {
  return [() => sfx.playFall()]
}

export function useWrongLetterSound() {
  return [() => sfx.playBuzz()]
}

export function useWinSound() {
  return [() => sfx.playWin()]
}
