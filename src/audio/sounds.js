import useSound from 'use-sound'

// Sound asset files (public/sounds/*.mp3) are NOT part of this task's scope
// (Task 14 brief §constraint 3) — they are binary audio assets to be added
// separately. Until then, use-sound will fail to fetch these URLs with a
// console 404 in a real browser; that's expected and non-fatal (use-sound
// swallows load errors and simply makes the returned `play` function a
// no-op). These hooks exist so the play-call sites (Collectible,
// OverlayUI) are wired correctly ahead of the assets landing.
export function useCollectSound() {
  return useSound('/sounds/collect.mp3', { volume: 0.5 })
}

export function useDeathSound() {
  return useSound('/sounds/fall.mp3', { volume: 0.5 })
}

export function useWrongLetterSound() {
  return useSound('/sounds/buzz.mp3', { volume: 0.4 })
}

export function useWinSound() {
  return useSound('/sounds/fanfare.mp3', { volume: 0.6 })
}
