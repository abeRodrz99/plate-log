import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { prefersReducedMotion, project, rubberband, springTo } from '../lib/spring'

interface Props {
  label: string
  onClose(): void
  /** Receives `close`, which animates the sheet away (optionally with a flick velocity) and then calls onClose. */
  children(close: (velocity?: number) => void): ReactNode
}

interface Drag {
  id: number
  offset: number
  history: { t: number; y: number }[]
}

/**
 * Modal bottom sheet driven by springs. It slides up critically damped, tracks the
 * finger 1:1 when dragged by the grabber, rubber-bands upward, and on release projects
 * the flick to decide between dismissing and springing back with the release velocity.
 */
export function BottomSheet({ label, onClose, children }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const s = useRef({ y: 0, h: 480, cancel: null as null | (() => void), closing: false, drag: null as Drag | null })

  const apply = useCallback((y: number) => {
    const st = s.current
    st.y = y
    if (bodyRef.current) bodyRef.current.style.transform = `translate3d(0,${y}px,0)`
    if (backRef.current) backRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - y / st.h)))
  }, [])

  useLayoutEffect(() => {
    const st = s.current
    st.h = bodyRef.current?.offsetHeight || 480
    if (prefersReducedMotion()) apply(0)
    else {
      apply(st.h)
      st.cancel = springTo(st.h, 0, 0, { response: 0.38, damping: 1 }, apply)
    }
    return () => st.cancel?.()
  }, [apply])

  const close = useCallback(
    (velocity = 0) => {
      const st = s.current
      if (st.closing) return
      st.closing = true
      st.cancel?.()
      if (prefersReducedMotion()) {
        onClose()
        return
      }
      st.cancel = springTo(st.y, st.h, velocity, { response: 0.32, damping: 1 }, apply, onClose)
    },
    [apply, onClose],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const down = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current
    st.cancel?.()
    st.closing = false
    e.currentTarget.setPointerCapture(e.pointerId)
    st.drag = { id: e.pointerId, offset: e.clientY - st.y, history: [{ t: performance.now(), y: e.clientY }] }
  }

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = s.current.drag
    if (!d || e.pointerId !== d.id) return
    let y = e.clientY - d.offset
    if (y < 0) y = -rubberband(-y, s.current.h)
    d.history.push({ t: performance.now(), y: e.clientY })
    if (d.history.length > 8) d.history.shift()
    apply(y)
  }

  const up = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current
    const d = st.drag
    if (!d || e.pointerId !== d.id) return
    st.drag = null
    const now = performance.now()
    const recent = d.history.filter((p) => now - p.t < 100)
    const v = recent.length > 1 ? ((recent[recent.length - 1].y - recent[0].y) / Math.max(1, recent[recent.length - 1].t - recent[0].t)) * 1000 : 0
    if (st.y + project(v) > st.h * 0.5) close(v)
    else if (prefersReducedMotion()) apply(0)
    else st.cancel = springTo(st.y, 0, v, { response: 0.34, damping: 0.8 }, apply)
  }

  return (
    <div id="sheet">
      <div className="sheet-back" ref={backRef} style={{ opacity: 0 }} onClick={() => close()} />
      <div className="sheet-body" role="dialog" aria-label={label} ref={bodyRef}>
        <div className="sheet-grab" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {children(close)}
      </div>
    </div>
  )
}
