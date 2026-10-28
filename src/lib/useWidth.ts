import { useLayoutEffect, useRef, useState } from 'react'

/** Track an element's rendered width so SVGs can draw at true pixel size. */
export function useWidth<T extends HTMLElement>(initial = 360) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.round(el.getBoundingClientRect().width) || initial)
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || initial))
    ro.observe(el)
    return () => ro.disconnect()
  }, [initial])
  return [ref, width] as const
}
