import { useState, useEffect, useRef } from 'react'

function SearchBar({ value, onChange, placeholder = 'Search...', autoFocus = true }) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus when the search bar mounts (user tapped the search icon)
  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => clearTimeout(t)
  }, [autoFocus])

  return (
    <div className={`search-bar visible ${focused ? 'focused' : ''}`}>
      <span className="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="search-input"
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default SearchBar
