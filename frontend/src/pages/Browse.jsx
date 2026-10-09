import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getRecommendations, likeUser, passUser, searchUsers } from '../services/api'
import BottomNav from '../components/BottomNav'
import SearchBar from '../components/SearchBar'

// --- Like (heart) inline SVGs - catraco Uiverse style ---
const HeartOutline = () => (
  <svg className="svg-outline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

const HeartFilled = () => (
  <svg className="svg-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

const HeartCelebrate = () => (
  <svg className="svg-celebrate" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

// --- Pass (X) - premium rounded X with stroke ---
const XOutline = () => (
  <svg className="svg-outline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const XFilled = () => (
  <svg className="svg-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const XCelebrate = () => (
  <svg className="svg-celebrate" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function Browse() {
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (location.state?.autoSearch) {
      setSearchOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Like / Super Like checked state for Uiverse animations
  const [likeChecked, setLikeChecked] = useState(false)
  const [superChecked, setSuperChecked] = useState(false)
  const [passChecked, setPassChecked] = useState(false)

  // Drag-to-pass state
  const [drag, setDrag] = useState({ x: 0, active: false })
  const [swipeOut, setSwipeOut] = useState(null) // 'left' | 'right' | 'super' | null
  const [superLikeInfo, setSuperLikeInfo] = useState(null)
  const [showSuperLike, setShowSuperLike] = useState(false)
  const cardRef = useRef(null)
  const startX = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await getRecommendations()
      setUsers(res.data || [])
    } catch (err) {
      setUsers([
        { id: 1, name: 'Sophie', age: 25, bio: 'Love hiking and coffee ☕', gender: 'FEMALE' },
        { id: 2, name: 'Alex', age: 28, bio: 'Musician and traveler 🎸✈️', gender: 'MALE' },
        { id: 3, name: 'Maya', age: 24, bio: 'Foodie, dog lover 🐕🍕', gender: 'FEMALE' },
        { id: 4, name: 'Liam', age: 30, bio: 'Designer who loves art 🎨', gender: 'MALE' },
        { id: 5, name: 'Emma', age: 26, bio: 'Yoga instructor, bookworm 📚🧘', gender: 'FEMALE' },
        { id: 6, name: 'Noah', age: 29, bio: 'Photographer, surfer 📷🏄', gender: 'MALE' }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Live server search across ALL verified profiles (not just recommendations),
  // debounced so each keystroke ("k", "kh", ...) queries the backend.
  useEffect(() => {
    const q = searchQuery.trim()
    if (!searchOpen || !q) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await searchUsers(q)
        setSearchResults(res.data || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery, searchOpen])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    // server results first; offline fallback filters local recommendations
    const list = searchResults.length > 0 ? searchResults : users
    // names first (prefix, then contains); bio only for 2+ letters
    const starts = []
    const nameHits = []
    const rest = []
    for (const u of list) {
      const name = (u.name || '').toLowerCase()
      const bio = (u.bio || '').toLowerCase()
      if (!name && !bio) continue
      const prefix = name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))
      if (prefix) starts.push(u)
      else if (name.includes(q)) nameHits.push(u)
      else if (q.length >= 2 && bio.includes(q)) rest.push(u)
    }
    return [...starts, ...nameHits, ...rest]
  }, [users, searchResults, searchQuery])

  useEffect(() => {
    if (currentIndex >= filteredUsers.length && filteredUsers.length > 0) {
      setCurrentIndex(0)
    }
  }, [filteredUsers, currentIndex])

  useEffect(() => {
    if (!searchOpen) setSearchQuery('')
  }, [searchOpen])

  const resetButtonState = () => {
    setLikeChecked(false)
    setSuperChecked(false)
    setPassChecked(false)
  }

  const nextUser = () => {
    setTimeout(() => {
      if (currentIndex < filteredUsers.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setCurrentIndex(0)
      }
      resetButtonState()
      setDrag({ x: 0, active: false })
      setSwipeOut(null)
    }, 30)
  }

  const handleLike = async () => {
    if (swipeOut) return
    if (likeChecked) return
    setLikeChecked(true)
    setSwipeOut('right')
    const user = filteredUsers[currentIndex]
    if (!user) return
    try { await likeUser(user.id) } catch (e) { /* ignore */ }
    setTimeout(() => nextUser(), 40)
  }

  const handleSuperLike = async () => {
    if (swipeOut) return
    if (superChecked) return
    const user = filteredUsers[currentIndex]
    if (!user) return
    setSuperChecked(true)
    setSuperLikeInfo(user)
    setShowSuperLike(true)
    setSwipeOut('super')
    try { await likeUser(user.id) } catch (e) { /* ignore */ }
    setTimeout(() => {
      setShowSuperLike(false)
      nextUser()
    }, 1100)
  }

  const handlePass = async () => {
    if (swipeOut) return
    if (passChecked || isDragging.current) return
    setPassChecked(true)
    setSwipeOut('left')
    const user = filteredUsers[currentIndex]
    if (!user) return
    try { await passUser(user.id) } catch (e) { /* ignore */ }
    setTimeout(() => nextUser(), 25)
  }

  // === Drag-to-pass gesture ===
  // User can hold the card or the X button and drag left to pass.
  // Threshold: drag > 100px triggers a pass.

  const handlePointerDown = (e) => {
    if (swipeOut) return
    // Do not start drag when clicking action buttons (X / Heart / Star)
    if (e.target.closest('.action-buttons')) return
    // Only respond to primary button / first touch
    if (e.pointerType === 'mouse' && e.button !== 0) return
    isDragging.current = true
    startX.current = e.clientX
    setDrag({ x: 0, active: true })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    setDrag({ x: dx, active: true })
  }

  const handlePointerUp = (e) => {
    if (!isDragging.current) return
    isDragging.current = false
    const dx = drag.x
    const threshold = 100
    if (dx < -threshold) {
      // Dragged left enough — pass
      setSwipeOut('left')
      handlePass()
    } else if (dx > threshold) {
      // Dragged right enough — like
      setSwipeOut('right')
      handleLike()
    } else {
      // Snap back
      setDrag({ x: 0, active: false })
    }
  }

  const cardTransform = swipeOut === 'left'
    ? 'translateX(-150%) rotate(-25deg)'
    : swipeOut === 'super'
      ? 'translateY(-140%) scale(0.88) rotate(0deg)'
      : swipeOut === 'right'
        ? 'translateX(150%) rotate(25deg)'
        : `translateX(${drag.x}px) rotate(${drag.x * 0.05}deg)`

  const cardTransition = swipeOut === 'super'
    ? 'transform 520ms cubic-bezier(0.32, 0.72, 0, 1), opacity 380ms ease'
    : swipeOut
      ? 'transform 140ms cubic-bezier(0.55, 0, 0.55, 0.2), opacity 140ms ease'
      : drag.active
        ? 'none'
        : 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)'

  const likeIndicatorOpacity = Math.min(Math.max(drag.x / 100, 0), 1)
  const passIndicatorOpacity = Math.min(Math.max(-drag.x / 100, 0), 1)

  if (loading) {
    return (
      <div className="app-container">
        {!searchOpen && (
          <div className="app-header">
            <div className="header-left">
              <h1><span style={{ color: 'var(--color-primary)', display: 'inline-flex', verticalAlign: 'middle' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></span> Discover</h1>
            </div>
          </div>
        )}
        <div className="app-content" aria-busy="true">
          <div className="profile-card" aria-hidden="true">
            <div className="skeleton" style={{ height: '280px' }} />
            <div style={{ padding: '16px 20px' }}>
              <div className="skeleton" style={{ height: '22px', width: '55%', marginBottom: '10px' }} />
              <div className="skeleton" style={{ height: '14px', width: '85%' }} />
            </div>
          </div>
          <div className="loading-text" role="status">Finding people nearby...</div>
        </div>
        <BottomNav onSearchClick={() => setSearchOpen(!searchOpen)} searchOpen={searchOpen} />
      </div>
    )
  }

  const currentUser = filteredUsers[currentIndex]

  return (
    <div className="app-container">
      {!searchOpen && (
        <div className="app-header">
          <div className="header-left">
            <h1>
              <span style={{ color: 'var(--color-primary)', display: 'inline-flex', verticalAlign: 'middle' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></span> Discover
            </h1>
          </div>
        </div>
      )}

      {searchOpen ? (
        <div className="app-content search-mode">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or interests..."
          />
          {searchQuery.trim() === '' ? (
            <div className="empty-state">
              <div className="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg></div>
              <div className="empty-state-title">Search people</div>
              <div className="empty-state-text">Type a name or interest to find someone</div>
            </div>
          ) : searching && filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="loading-text" role="status">Searching...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="10" /><path d="M8 15h8" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg></div>
              <div className="empty-state-title">No matches found</div>
              <div className="empty-state-text">Nothing for "{searchQuery}". Try a different search.</div>
            </div>
          ) : (
            <div className="match-list">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="match-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const idx = users.findIndex((x) => x.id === u.id)
                    if (idx !== -1) {
                      setCurrentIndex(idx)
                    } else {
                      // result from server search (already liked/passed/matched):
                      // spotlight it on the card so it can be viewed again
                      setUsers((prev) => [u, ...prev.filter((x) => x.id !== u.id)])
                      setCurrentIndex(0)
                    }
                    setSearchOpen(false)
                  }}
                >
                  <div className="match-avatar">{(u.name || '?')[0]}</div>
                  <div className="match-info">
                    <div className="match-name">
                      {u.name} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '14px' }}>{u.age}</span>
                    </div>
                    {u.bio && <div className="match-last-message">{u.bio}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="app-content">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="10" /><path d="M8 15h8" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg></div>
              <div className="empty-state-title">No more profiles</div>
              <div className="empty-state-text">Check back later for new people in your area</div>
            </div>
          ) : (
          <div
            ref={cardRef}
            className={`profile-card ${drag.active ? 'swiping' : ''}`}
            style={{
              transform: cardTransform,
              transition: cardTransition,
              opacity: swipeOut ? 0 : 1
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Swipe direction indicators */}
            <div
              className="swipe-indicator pass"
              style={{ opacity: passIndicatorOpacity }}
            >
              PASS
            </div>
            <div
              className="swipe-indicator like"
              style={{ opacity: likeIndicatorOpacity }}
            >
              LIKE
            </div>

            <div className={`profile-photo hue-${(currentUser.id || 0) % 6}`}>
              <span className="profile-photo-badge"><span className="dot" />Active now</span>
              <span className="profile-photo-text">{currentUser.name[0]}</span>
            </div>
            <div className="profile-info">
              <div className="profile-name">
                {currentUser.name} <span className="profile-age">{currentUser.age}</span>
              </div>
              <p className="profile-bio">{currentUser.bio}</p>
              <div className="profile-distance">
                <span>📍</span> Active recently
              </div>
            </div>

            <div className="action-buttons">
              {/* PASS (X) - Uiverse style */}
              <label className="heart-container pass-x" title="Pass or drag card left">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={passChecked}
                  onChange={() => { if (!passChecked) handlePass() }}
                />
                <div className="svg-container">
                  <XOutline />
                  <XFilled />
                  <XCelebrate />
                </div>
              </label>

              {/* LIKE (Heart) - Uiverse style */}
              <label className="heart-container like-heart" title="Like">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={likeChecked}
                  onChange={() => { if (!likeChecked) handleLike() }}
                />
                <div className="svg-container">
                  <HeartOutline />
                  <HeartFilled />
                  <HeartCelebrate />
                </div>
              </label>

              {/* SUPER LIKE (Star) - Uiverse style */}
              <label className="container" title="Super Like">
                <input
                  type="checkbox"
                  checked={superChecked}
                  onChange={() => { if (!superChecked) handleSuperLike() }}
                />
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.446l-7.416 3.967 1.48-8.279L0 9.306l8.332-1.151z" />
                </svg>
              </label>
            </div>
          </div>
          )}
        </div>
      )}

      {showSuperLike && superLikeInfo && (
        <div className="superlike-overlay">
          <div className="superlike-center">
            <div className="superlike-star-wrap">
              <div className="superlike-star-glow" />
              <div className="superlike-star">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.446l-7.416 3.967 1.48-8.279L0 9.306l8.332-1.151z" /></svg>
              </div>
            </div>
            <div className="superlike-title">Super Liked!</div>
            <div className="superlike-name">{superLikeInfo.name} • {superLikeInfo.age}</div>
            <div className="superlike-sub">You stood out • They'll see you first</div>
          </div>
        </div>
      )}

      <BottomNav onSearchClick={() => setSearchOpen(!searchOpen)} searchOpen={searchOpen} />
    </div>
  )
}

export default Browse

