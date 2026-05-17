import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
})

const STORAGE_KEY = 'payid-v4-theme-v5'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
    }
    return 'dark'
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-v4-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useV4Theme() {
  return useContext(ThemeContext)
}

/* Helper to get theme-aware style/color maps */
export function useV4Palette() {
  const { theme } = useV4Theme()
  const dark = theme === 'dark'

  return {
    dark,
    /* Root */
    rootBg: dark ? 'bg-[#0B0F1A]' : 'bg-[#F1F5F9]',
    rootText: dark ? 'text-[#E2E8F0]' : 'text-[#0F172A]',

    /* Cards - Enhanced glassmorphism */
    cardBg: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
    cardBgSolid: dark ? 'bg-white/3' : 'bg-white/80',
    cardBorder: dark ? 'border-white/10' : 'border-black/5',
    cardHover: dark ? 'hover:bg-white/5' : 'hover:bg-white/90',
    bgElevated: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',

    /* Glassmorphism utilities - Apple-like premium feel */
    glass: {
      bg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
      border: dark ? 'border-white/10' : 'border-black/5',
      blur: 'backdrop-blur-20',
      shadow: 'shadow-lg',
    },

    /* Text */
    textMain: dark ? 'text-white' : 'text-[#0F172A]',
    textMuted: dark ? 'text-[#475569]' : 'text-[#64748B]',
    textSecondary: dark ? 'text-[#64748B]' : 'text-[#94A3B8]',

    /* Input / terminal */
    inputBg: dark ? 'bg-[#0B0F1A]' : 'bg-[#FFFFFF]',
    inputBorder: dark ? 'border-white/10' : 'border-black/10',
    terminalBg: dark ? '#080C14' : '#F8FAFC',
    terminalMuted: dark ? '#334155' : '#CBD5E1',
    terminalText: dark ? '#64748B' : '#475569',

    /* Accent glow orbs */
    orbColor: dark ? '#00D084' : '#00D084',
  }
}
