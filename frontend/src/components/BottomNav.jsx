import { useNavigate, useLocation } from 'react-router-dom'

// Inline SVG icons — sized via CSS, not attributes
const icons = {
  discover: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5z"/>
    </svg>
  ),
  matches: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function BottomNav({ onSearchClick, searchOpen }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Active state: highlight only when NOT in search mode
  const isDiscover = location.pathname === '/browse' && !searchOpen
  const isMatches = location.pathname === '/matches' && !searchOpen
  const isProfile = location.pathname === '/profile' && !searchOpen

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <ul className="nav-ul">
          <li className={`nav-li ${isDiscover ? 'active' : ''}`}>
            <button
              className="nav-svg"
              onClick={() => {
                if (searchOpen && onSearchClick) onSearchClick()
                navigate('/browse')
              }}
              title="Discover"
              aria-label="Discover"
            >
              {icons.discover}
            </button>
          </li>

          <li className={`nav-li ${searchOpen ? 'active' : ''}`}>
            <button
              className="nav-svg"
              onClick={() => (onSearchClick ? onSearchClick() : navigate('/browse', { state: { autoSearch: true } }))}
              title="Search"
              aria-label="Search"
            >
              {icons.search}
            </button>
          </li>

          <li className={`nav-li ${isMatches ? 'active' : ''}`}>
            <button
              className="nav-svg"
              onClick={() => {
                if (searchOpen && onSearchClick) onSearchClick()
                navigate('/matches')
              }}
              title="Messages"
              aria-label="Messages"
            >
              {icons.matches}
            </button>
          </li>

          <li className={`nav-li ${isProfile ? 'active' : ''}`}>
            <button
              className="nav-svg"
              onClick={() => {
                if (searchOpen && onSearchClick) onSearchClick()
                navigate('/profile')
              }}
              title="Profile"
              aria-label="Profile"
            >
              {icons.profile}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default BottomNav
