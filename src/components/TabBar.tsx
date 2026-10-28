import { useApp } from '../state/AppState'
import { TABS, useNav, type Tab } from '../state/Nav'
import { Icon, type IconName } from './Icon'

const META: Record<Tab, { label: string; icon: IconName }> = {
  workout: { label: 'Workout', icon: 'bell' },
  progress: { label: 'Progress', icon: 'chart' },
  history: { label: 'History', icon: 'clock' },
}

export function TabBar() {
  const { tab } = useNav()
  const { active } = useApp()
  return (
    <nav className="nav" aria-label="Sections">
      <div className="nav-in">
        {TABS.map((t) => (
          <a key={t} href={`#${t}`} aria-current={tab === t ? 'page' : undefined}>
            <Icon name={META[t].icon} />
            {META[t].label}
            {t === 'workout' && active && <span className="live" title="Workout in progress" />}
          </a>
        ))}
      </div>
    </nav>
  )
}
