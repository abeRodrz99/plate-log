import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Two-tap confirmation for destructive actions (browsers can't show confirm dialogs
 * in every context). First call arms `key` for 3 seconds and returns false; a second
 * call with the same key inside that window returns true.
 */
export function useConfirm() {
  const [armed, setArmed] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const confirm = useCallback(
    (key: string): boolean => {
      window.clearTimeout(timer.current)
      if (armed === key) {
        setArmed(null)
        return true
      }
      setArmed(key)
      timer.current = window.setTimeout(() => setArmed(null), 3000)
      return false
    },
    [armed],
  )

  return { armed, confirm }
}
