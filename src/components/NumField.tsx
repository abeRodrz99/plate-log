import { useEffect, useState } from 'react'
import { fmtN, parseNum } from '../domain/format'

interface Props {
  value: number | null
  onValue(v: number | null): void
  placeholder?: string
  label: string
}

/**
 * Numeric input that keeps its own text while typing ("12." stays "12.")
 * and re-syncs when the value changes from outside (e.g. copying a previous set).
 */
export function NumField({ value, onValue, placeholder, label }: Props) {
  const [text, setText] = useState(fmtN(value))
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : fmtN(value)))
  }, [value])
  return (
    <input
      className="num"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value)
        onValue(parseNum(e.target.value))
      }}
    />
  )
}
