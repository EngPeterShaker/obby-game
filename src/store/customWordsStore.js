// src/store/customWordsStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCustomWordsStore = create(
  persist(
    (set) => ({
      addedWords: { level_1: [], level_2: [], level_3: [] },
      hiddenWords: [],

      addWord: (word, tier) => set((state) => {
        const currentTierWords = state.addedWords[tier] || []
        if (currentTierWords.includes(word)) return state
        return {
          addedWords: {
            ...state.addedWords,
            [tier]: [...currentTierWords, word],
          },
        }
      }),

      removeAddedWord: (word, tier) => set((state) => ({
        addedWords: {
          ...state.addedWords,
          [tier]: (state.addedWords[tier] || []).filter((w) => w !== word),
        },
      })),

      hideBuiltinWord: (word) => set((state) => (
        state.hiddenWords.includes(word)
          ? state
          : { hiddenWords: [...state.hiddenWords, word] }
      )),

      // Re-adding a hidden built-in word must un-hide it rather than go through
      // addWord — otherwise the word ends up in BOTH addedWords and hiddenWords
      // at once, which corrupts the effective-vocabulary merge once hiddenWords
      // is later cleared (e.g. via Restore All Defaults).
      unhideWord: (word) => set((state) => ({
        hiddenWords: state.hiddenWords.filter((w) => w !== word),
      })),

      restoreDefaults: () => set({ hiddenWords: [] }),
    }),
    {
      // Word customizations are a distinct concern from game progress, so they
      // persist under their own storage key rather than piggybacking on the
      // game store's 'obby-save-data' — clearing/resetting one shouldn't affect the other.
      name: 'obby-custom-vocab',
    }
  )
)
