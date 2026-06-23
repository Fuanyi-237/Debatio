import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BrandingState {
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  welcomeMessage: string | null
  footerText: string | null
  setBranding: (branding: Partial<Omit<BrandingState, 'setBranding'>>) => void
  resetToDefault: () => void
}

const defaultState = {
  logoUrl: null,
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#111827',
  welcomeMessage: null,
  footerText: 'Debatio - Structured Debate Platform',
}

export const useBranding = create<BrandingState>()(
  persist(
    (set) => ({
      ...defaultState,
      setBranding: (branding) => set((state) => ({ ...state, ...branding })),
      resetToDefault: () => set(defaultState),
    }),
    {
      name: 'branding-storage',
    }
  )
)
