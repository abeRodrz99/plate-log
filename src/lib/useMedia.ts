import { useSyncExternalStore } from 'react'

/** Subscribe to a CSS media query. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

/** True at the desktop layout breakpoint (keep in sync with layout.css). */
export const useWide = () => useMedia('(min-width: 960px)')
