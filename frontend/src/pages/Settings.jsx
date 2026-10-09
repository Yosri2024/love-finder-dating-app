import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import BottomNav from '../components/BottomNav'
import { changePassword } from '../services/api'

const GLOBAL_KEY = 'globalMuteSettings'
const DURATIONS = {
  '1h': 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  forever: null,
}
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

function loadGlobalSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(GLOBAL_KEY) || '{}')
    const hasKey = localStorage.getItem(GLOBAL_KEY) !== null
    return {
      globalNotifMuted: !!raw.globalNotifMuted,
      globalNotifMuteUntil: raw.globalNotifMuteUntil ?? null,
      globalCallMuted: !!raw.globalCallMuted,
      globalCallMuteUntil: raw.globalCallMuteUntil ?? null,
      // by default sleep 00h-08h configured; disabled until user enables — change to true if you want it on by default
      sleepEnabled: hasKey ? !!raw.sleepEnabled : false,
      sleepFrom: raw.sleepFrom || '00:00',
      sleepTo: raw.sleepTo || '08:00',
    }
  } catch {
    return { globalNotifMuted: false, globalNotifMuteUntil: null, globalCallMuted: false, globalCallMuteUntil: null, sleepEnabled: false, sleepFrom: '00:00', sleepTo: '08:00' }
  }
}
function isGlobalNotifMuted(g) {
  if (!g?.globalNotifMuted) return false
  if (g.globalNotifMuteUntil == null) return true
  return g.globalNotifMuteUntil > Date.now()
}
function isGlobalCallMuted(g) {
  if (!g?.globalCallMuted) return false
  if (g.globalCallMuteUntil == null) return true
  return g.globalCallMuteUntil > Date.now()
}
function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}
function isSleepActive(g) {
  if (!g?.sleepEnabled) return false
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const from = parseHM(g.sleepFrom)
  const to = parseHM(g.sleepTo)
  if (from === to) return false
  if (from < to) return cur >= from && cur < to
  return cur >= from || cur < to
}
function formatHM(hm) {
  const [h] = hm.split(':')
  return `${String(parseInt(h, 10)).padStart(2, '0')}h`
}
function formatRemaining(until) {
  if (until == null) return 'Forever'
  const ms = until - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.ceil(h / 24)}d left`
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''} left`.trim()
  if (m > 0) return `${m}m left`
  return '<1m left'
}

function SettingsRow({ icon, label, description, children, onClick }) {
  return (
    <button className="settings-row" onClick={onClick} type="button">
      <div className="settings-row-left">
        <span className="settings-row-icon">{icon}</span>
        <div className="settings-row-text">
          <span className="settings-row-label">{label}</span>
          {description && <span className="settings-row-desc">{description}</span>}
        </div>
      </div>
      <div className="settings-row-right">{children}</div>
    </button>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="settings-toggle" title={label} aria-label={label} onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} onClick={(e) => e.stopPropagation()} role="switch" aria-checked={checked} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
    </label>
  )
}

const icons = {
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c1.1 0 2-.9 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  online: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M18 8A6 6 0 006 8c0 7-6 9-6 9h16s-6-2-6-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  speaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  ),
  vibration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
}

function Settings() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)
  const [vibration, setVibration] = useState(true)
  const [privateProfile, setPrivateProfile] = useState(false)
  const [showOnline, setShowOnline] = useState(true)
  // Change password (code emailed as confirmation by backend)
  const [showPwd, setShowPwd] = useState(false)
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNext, setPwdNext] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdInfo, setPwdInfo] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const handlePwdSubmit = async (e) => {
    e.preventDefault()
    if (!pwdCurrent) { setPwdError('Current password is required.'); return }
    if (!pwdNext || pwdNext.length < 6) { setPwdError('New password must be at least 6 characters.'); return }
    if (pwdNext !== pwdConfirm) { setPwdError('New passwords do not match.'); return }
    setPwdError('')
    setPwdLoading(true)
    try {
      const res = await changePassword({ currentPassword: pwdCurrent, newPassword: pwdNext })
      setPwdInfo((res.data?.message || 'Password changed.') + ' Confirmation sent to your email.')
      setPwdCurrent('')
      setPwdNext('')
      setPwdConfirm('')
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Could not change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  // Global Do Not Disturb — shared with Matches via localStorage
  const [globalSettings, setGlobalSettings] = useState(() => loadGlobalSettings())
  const [globalPicker, setGlobalPicker] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => { localStorage.setItem(GLOBAL_KEY, JSON.stringify(globalSettings)) }, [globalSettings])
  useEffect(() => {
    const id = setInterval(() => {
      setGlobalSettings(prev => {
        let changed = false
        const next = { ...prev }
        if (next.globalNotifMuted && next.globalNotifMuteUntil != null && next.globalNotifMuteUntil <= Date.now()) {
          next.globalNotifMuted = false
          next.globalNotifMuteUntil = null
          changed = true
        }
        if (next.globalCallMuted && next.globalCallMuteUntil != null && next.globalCallMuteUntil <= Date.now()) {
          next.globalCallMuted = false
          next.globalCallMuteUntil = null
          changed = true
        }
        return changed ? next : prev
      })
      setTick(t => t + 1)
    }, 30000)
    return () => clearInterval(id)
  }, [])

  const globalNotifOn = isGlobalNotifMuted(globalSettings)
  const globalCallOn = isGlobalCallMuted(globalSettings)
  const sleepActive = isSleepActive(globalSettings)

  const handleGlobalNotifToggle = () => {
    if (globalNotifOn) {
      setGlobalSettings(prev => ({ ...prev, globalNotifMuted: false, globalNotifMuteUntil: null }))
      setGlobalPicker(null)
    } else {
      setGlobalPicker(p => p === 'notif' ? null : 'notif')
    }
  }
  const handleGlobalCallToggle = () => {
    if (globalCallOn) {
      setGlobalSettings(prev => ({ ...prev, globalCallMuted: false, globalCallMuteUntil: null }))
      setGlobalPicker(null)
    } else {
      setGlobalPicker(p => p === 'call' ? null : 'call')
    }
  }
  const selectGlobalNotifDuration = (dur) => {
    const ms = DURATIONS[dur]
    setGlobalSettings(prev => ({ ...prev, globalNotifMuted: true, globalNotifMuteUntil: ms==null?null:Date.now()+ms }))
    setGlobalPicker(null)
  }
  const selectGlobalCallDuration = (dur) => {
    const ms = DURATIONS[dur]
    setGlobalSettings(prev => ({ ...prev, globalCallMuted: true, globalCallMuteUntil: ms==null?null:Date.now()+ms }))
    setGlobalPicker(null)
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-left">
          <h1><span style={{ color: 'var(--color-primary)', display: 'inline-flex', verticalAlign: 'middle' }}>{icons.gear}</span> Settings</h1>
        </div>
        <div className="header-right"><ThemeToggle /></div>
      </div>

      <div className="app-content">
        <div className="settings-section">
          <div className="settings-section-title">Account</div>
          <div className="settings-card">
            <SettingsRow icon={icons.user} label="Edit Profile" description="Change your name, bio, photos" onClick={() => navigate('/profile')} />
            <div className="settings-divider" />
            <SettingsRow icon={icons.mail} label="Email" description="yourname@email.com" />
            <div className="settings-divider" />
            <SettingsRow icon={icons.lock} label="Change Password" description={showPwd ? 'Tap again to hide' : 'Update your password'} onClick={() => { setShowPwd(v => !v); setPwdError(''); setPwdInfo('') }} />
            {showPwd && (
              <form onSubmit={handlePwdSubmit} noValidate style={{ padding: '12px' }}>
                {pwdError && <div className="error-msg">{pwdError}</div>}
                {pwdInfo && <div className="success-msg">{pwdInfo}</div>}
                <div className="form-group">
                  <label>Current password</label>
                  <input type="password" value={pwdCurrent} onChange={(e) => { setPwdCurrent(e.target.value); if (pwdError) setPwdError('') }} placeholder="Current password" autoComplete="current-password" />
                </div>
                <div className="form-group">
                  <label>New password</label>
                  <input type="password" value={pwdNext} onChange={(e) => { setPwdNext(e.target.value); if (pwdError) setPwdError('') }} placeholder="At least 6 characters" autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label>Confirm new password</label>
                  <input type="password" value={pwdConfirm} onChange={(e) => { setPwdConfirm(e.target.value); if (pwdError) setPwdError('') }} placeholder="Repeat new password" autoComplete="new-password" />
                </div>
                <button type="submit" className="btn" disabled={pwdLoading}>
                  {pwdLoading ? 'Changing...' : 'Change password'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Discovery</div>
          <div className="settings-card">
            <SettingsRow icon={icons.location} label="Location" description="San Francisco, CA" />
            <div className="settings-divider" />
            <SettingsRow icon={icons.eye} label="Private Profile" description="Only your matches can see you">
              <Toggle checked={privateProfile} onChange={setPrivateProfile} label="Private profile" />
            </SettingsRow>
            <div className="settings-divider" />
            <SettingsRow icon={icons.online} label="Show Online Status" description="Let others see when you're active">
              <Toggle checked={showOnline} onChange={setShowOnline} label="Show online status" />
            </SettingsRow>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Sleep Mode</div>
          <div className="settings-card" style={{ padding: '6px' }}>
            <SettingsRow
              icon={icons.moon}
              label="Sleep mode"
              description={globalSettings.sleepEnabled ? `${formatHM(globalSettings.sleepFrom)} – ${formatHM(globalSettings.sleepTo)}${sleepActive ? ' • Sleeping now' : ''} • mutes messages & calls` : 'Mute messages & calls on schedule (default 00h–08h)'}
              onClick={() => setGlobalSettings(prev => ({ ...prev, sleepEnabled: !prev.sleepEnabled }))}
            >
              <Toggle checked={globalSettings.sleepEnabled} onChange={(v) => setGlobalSettings(prev => ({ ...prev, sleepEnabled: v }))} label="Sleep mode" />
            </SettingsRow>
            {globalSettings.sleepEnabled && (
              <div className="sleep-time-picker" style={{ margin: '6px' }}>
                <div className="sleep-time-grid">
                  <label className="sleep-time-field">
                    <span className="sleep-time-label">From</span>
                    <select className="sleep-time-select" value={globalSettings.sleepFrom} onChange={(e) => setGlobalSettings(prev => ({ ...prev, sleepFrom: e.target.value }))}>
                      {HOURS.map(h => (
                        <option key={h} value={h}>{formatHM(h)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="sleep-time-field">
                    <span className="sleep-time-label">To</span>
                    <select className="sleep-time-select" value={globalSettings.sleepTo} onChange={(e) => setGlobalSettings(prev => ({ ...prev, sleepTo: e.target.value }))}>
                      {HOURS.map(h => (
                        <option key={h} value={h}>{formatHM(h)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="sleep-hint">
                  {sleepActive ? (
                    <span className="sleep-hint-active">🌙 Sleeping — messages & calls muted {formatHM(globalSettings.sleepFrom)} – {formatHM(globalSettings.sleepTo)}</span>
                  ) : (
                    <span>Messages & calls will be muted daily {formatHM(globalSettings.sleepFrom)} – {formatHM(globalSettings.sleepTo)}</span>
                  )}
                </div>
                <div className="sleep-example">Default 00h to 08h — {parseHM(globalSettings.sleepFrom) < parseHM(globalSettings.sleepTo) ? 'daytime' : 'overnight'} silence</div>
              </div>
            )}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Notifications</div>
          <div className="settings-card">
            <SettingsRow icon={icons.bell} label="Push Notifications" description="New matches and messages">
              <Toggle checked={notifications} onChange={setNotifications} label="Push notifications" />
            </SettingsRow>
            <div className="settings-divider" />
            <SettingsRow icon={icons.speaker} label="Sound Effects" description="Play sounds on actions">
              <Toggle checked={soundEffects} onChange={setSoundEffects} label="Sound effects" />
            </SettingsRow>
            <div className="settings-divider" />
            <SettingsRow icon={icons.vibration} label="Vibration" description="Vibrate on actions">
              <Toggle checked={vibration} onChange={setVibration} label="Vibration" />
            </SettingsRow>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Support</div>
          <div className="settings-card">
            <SettingsRow icon={icons.help} label="Help Center" description="FAQs and support" onClick={() => {}} />
            <div className="settings-divider" />
            <SettingsRow icon={icons.document} label="Terms of Service" onClick={() => {}} />
            <div className="settings-divider" />
            <SettingsRow icon={icons.lock} label="Privacy Policy" onClick={() => {}} />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title" style={{ color: 'var(--color-error)' }}>Danger Zone</div>
          <div className="settings-card">
            <SettingsRow icon={icons.trash} label="Delete Account" description="Permanently delete your account and data" onClick={() => {}} />
          </div>
        </div>

        <div className="settings-version">Love Finder v1.0.0</div>
      </div>

      <BottomNav />
    </div>
  )
}

export default Settings
