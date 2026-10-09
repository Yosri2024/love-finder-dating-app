import { useTheme } from '../contexts/ThemeContext'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="theme-toggle-wrapper">
      <label className="toggle" title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}>
        <input
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
          aria-label="Toggle theme"
        />
        <span className="button"></span>
      </label>
    </div>
  )
}

export default ThemeToggle
