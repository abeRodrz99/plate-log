const PATHS = {
  home: 'M4 11l8-7 8 7M6 10v9h12v-9',
  plus: 'M12 5v14M5 12h14',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 7v-3M12 20v-3M7 12H4M20 12h-3M8.5 8.5L6.5 6.5M17.5 17.5l-2-2M15.5 8.5l2-2M6.5 17.5l2-2',
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
  const px = size ?? (['bell', 'clock', 'chart', 'home'].includes(name) ? 22 : 18)
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
      {name === 'sun' && <circle cx="12" cy="12" r="3.5" />}
      <path d={PATHS[name]} />
    </svg>
  )
}
