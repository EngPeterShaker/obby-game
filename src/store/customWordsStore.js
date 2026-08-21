// src/store/customWordsStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCustomWordsStore = create(
  persist(
    (set) => ({
      addedWords: { level_1: [], level_2: [], level_3: [] },
      hiddenWords: [],

      addWord: (word, tier) => set((state) => {
        if (state.addedWords[tier].includes(word)) return state
        return {
          addedWords: {
            ...state.addedWords,
            [tier]: [...state.addedWords[tier], word],
          },
        }
      }),

      removeAddedWord: (word, tier) => set((state) => ({
        addedWords: {
          ...state.addedWords,
          [tier]: state.addedWords[tier].filter((w) => w !== word),
        },
      })),

      hideBuiltinWord: (word) => set((state) => (
        state.hiddenWords.includes(word)
          ? state
          : { hiddenWords: [...state.hiddenWords, word] }
      )),

      restoreDefaults: () => set({ hiddenWords: [] }),
    }),
    {
      name: 'obby-custom-vocab',
    }
  )
)
