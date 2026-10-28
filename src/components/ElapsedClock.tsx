import { useEffect, useState } from 'react'
import { fmtClock } from '../domain/format'

export function ElapsedClock({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return <div className="clock">{fmtClock((now - since) / 1000)}</div>
}
