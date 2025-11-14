import { create } from 'zustand'

interface AppState {
  // Application settings
  theme: 'light' | 'dark'
  language: string

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  theme: 'light',
  language: 'en',
  isLoading: false,
  error: null,

  // Actions
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))