import { useTheme } from '../lib/useTheme'
import { Icon } from './Icon'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button className="icon round" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  )
}
