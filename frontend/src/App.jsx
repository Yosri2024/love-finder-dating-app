import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Register from './pages/Register'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import Browse from './pages/Browse'
import Matches from './pages/Matches'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

function SwipeBack({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [drag, setDrag] = useState({ x: 0, active: false })
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)

  // no back from root / browse
  const canGoBack = location.pathname !== '/browse' && location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register'

  const onPointerDown = (e) => {
    if (!canGoBack) return
    // Always block typing areas and open menus
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return
    if (e.target.closest('.emoji-picker, .chat-options-menu, .match-settings-menu, .global-mute-menu, .global-mute-overlay, .sleep-time-picker, .mute-timer-picker')) return
    // For interactive elements (buttons/links/cards) only allow edge swipe to avoid stealing taps
    const isInteractive = e.target.closest('button, a, [role="button"], .profile-card .action-buttons')
    if (isInteractive && e.clientX > 80) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    isDragging.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    setDrag({ x: 0, active: true })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    const dy = Math.abs(e.clientY - startY.current)
    // require mostly horizontal
    if (dy > 60 && Math.abs(dx) < 40) {
      isDragging.current = false
      setDrag({ x: 0, active: false })
      return
    }
    if (dx < 0) {
      // dragging left — show resistance
      setDrag({ x: dx * 0.2, active: true })
      return
    }
    // dragging right — follow finger with damping
    const damped = Math.min(dx, window.innerWidth) * 0.95
    setDrag({ x: damped, active: true })
  }

  const onPointerUp = (e) => {
    if (!isDragging.current) return
    isDragging.current = false
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId) } catch {}
    const dx = drag.x
    if (dx > 90) {
      setDrag({ x: window.innerWidth, active: false })
      setTimeout(() => {
        navigate(-1)
        // reset after navigation so next page is interactive
        setTimeout(() => setDrag({ x: 0, active: false }), 50)
      }, 160)
    } else {
      setDrag({ x: 0, active: false })
    }
  }

  const style = drag.active
    ? { transform: `translateX(${drag.x}px)`, opacity: drag.x > 0 ? `${1 - drag.x / (window.innerWidth * 1.2)}` : '1', transition: 'none' }
    : { transform: 'translateX(0)', opacity: '1', transition: 'transform 260ms cubic-bezier(0.32, 0.72, 0, 1), opacity 260ms ease' }

  return (
    <div
      className={`page-transition ${drag.active ? 'swiping' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={style}
    >
      {children}
    </div>
  )
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Real auth — app now opens on login when not authenticated
  const isLoggedIn = !!token

  return (
    <SwipeBack>
      <Routes>
        {/* Public routes */}
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/browse" /> : <Register setToken={setToken} />}
        />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/browse" /> : <Login setToken={setToken} />}
        />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route
          path="/browse"
          element={isLoggedIn ? <Browse /> : <Navigate to="/login" />}
        />
        <Route
          path="/matches"
          element={isLoggedIn ? <Matches /> : <Navigate to="/login" />}
        />
        <Route
          path="/chat/:matchId"
          element={isLoggedIn ? <Chat /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={isLoggedIn ? <Profile setToken={setToken} /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isLoggedIn ? <Settings /> : <Navigate to="/login" />}
        />

        {/* Default route */}
        <Route
          path="/"
          element={<Navigate to={isLoggedIn ? '/browse' : '/login'} />}
        />
      </Routes>
    </SwipeBack>
  )
}

export default App
