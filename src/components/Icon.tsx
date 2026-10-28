const PATHS = {
  bell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  clock: 'M12 7v5l3 2',
  chart: 'M4 19V5M4 19h16M8 15l3-4 3 3 5-7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  chev: 'M6 9l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size }: { name: IconName; size?: number }) {
  const px = size ?? (name === 'bell' || name === 'clock' || name === 'chart' ? 22 : 18)
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'clock' && <circle cx="12" cy="12" r="9" />}
      <path d={PATHS[name]} />
    </svg>
  )
}
