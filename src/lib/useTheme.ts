import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'platelog.theme'

const systemTheme = (): Theme =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Follows the system theme until the person picks one; the pick is remembered on this device. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? systemTheme())
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* storage blocked: the choice just lasts for this visit */
      }
      return next
    })
  }, [])
  return { theme, toggle }
}
