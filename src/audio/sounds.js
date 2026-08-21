import useSound from 'use-sound'

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

export function useCoinSound() {
  return useSound('/sounds/coin.mp3', { volume: 0.5 })
}
