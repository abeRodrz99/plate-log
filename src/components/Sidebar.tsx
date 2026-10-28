import { useStart } from '../lib/useStart'
import { useAccount } from '../state/Account'
import { useLogActivity } from '../state/ActivityUI'
import { useApp } from '../state/AppState'
import { TABS, useNav } from '../state/Nav'
import { Icon } from './Icon'
import { TAB_META } from './TabBar'
import { ThemeToggle } from './ThemeToggle'

/** Desktop navigation: persistent left rail. Hidden on phones, where the TabBar takes over. */
export function Sidebar() {
  const { tab } = useNav()
  const { active } = useApp()
  const start = useStart()
  const logActivity = useLogActivity()
  const { email, signOut } = useAccount()
  return (
    <aside className="side" aria-label="Main">
      <a className="brand" href="#home">
        <span className="logo" aria-hidden="true" />
        Plate Log
      </a>
      <button className="btn block" onClick={() => start()}>
        <Icon name="plus" size={18} />
        {active ? 'Resume workout' : 'Start workout'}
      </button>
      <button className="btn ghost block" onClick={logActivity}>
        Log activity
      </button>
      <nav className="side-nav">
        {TABS.map((t) => (
          <a key={t} href={`#${t}`} aria-current={tab === t ? 'page' : undefined}>
            <Icon name={TAB_META[t].icon} size={20} />
            {TAB_META[t].label}
            {t === 'workout' && active && <span className="live" title="Workout in progress" />}
          </a>
        ))}
      </nav>
      <div className="side-foot">
        <ThemeToggle />
        {signOut && (
          <div className="acct">
            <span title={email ?? ''}>{email}</span>
            <button className="link" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
