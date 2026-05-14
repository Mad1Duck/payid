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

const STORAGE_KEY = 'payid-v4-theme'

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

    /* Cards */
    cardBg: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)',
    cardBgSolid: dark ? 'bg-white/2' : 'bg-black/3',
    cardBorder: dark ? 'border-white/6' : 'border-black/8',
    cardHover: dark ? 'hover:bg-white/4' : 'hover:bg-black/4',

    /* Text */
    textMain: dark ? 'text-white' : 'text-[#0F172A]',
    textMuted: dark ? 'text-[#475569]' : 'text-[#64748B]',
    textSecondary: dark ? 'text-[#64748B]' : 'text-[#94A3B8]',

    /* Input / terminal */
    inputBg: dark ? 'bg-[#0B0F1A]' : 'bg-[#FFFFFF]',
    inputBorder: dark ? 'border-white/8' : 'border-black/8',
    terminalBg: dark ? '#080C14' : '#F8FAFC',
    terminalMuted: dark ? '#334155' : '#CBD5E1',
    terminalText: dark ? '#64748B' : '#475569',

    /* Accent glow orbs */
    orbColor: dark ? '#00D084' : '#00D084',
  }
}
