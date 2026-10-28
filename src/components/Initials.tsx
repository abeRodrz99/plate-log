const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const initials = (s: string) =>
  s
    .replace(/\(.*?\)/g, '')
    .split(/[\s/-]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/** Round exercise badge; tinted per name so lifts are recognisable at a glance. */
export function Initials({ name }: { name: string }) {
  return (
    <span className="dot" style={{ ['--h' as string]: hue(name) }} title={name}>
      {initials(name)}
    </span>
  )
}
