import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyProfile, updateProfile } from '../services/api'
import BottomNav from '../components/BottomNav'

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', iso: 'us', name: 'USA' },
  { code: '+212', flag: '🇲🇦', iso: 'ma', name: 'Morocco' },
  { code: '+33', flag: '🇫🇷', iso: 'fr', name: 'France' },
  { code: '+44', flag: '🇬🇧', iso: 'gb', name: 'UK' },
  { code: '+49', flag: '🇩🇪', iso: 'de', name: 'Germany' },
  { code: '+34', flag: '🇪🇸', iso: 'es', name: 'Spain' },
  { code: '+39', flag: '🇮🇹', iso: 'it', name: 'Italy' },
  { code: '+213', flag: '🇩🇿', iso: 'dz', name: 'Algeria' },
  { code: '+216', flag: '🇹🇳', iso: 'tn', name: 'Tunisia' },
  { code: '+20', flag: '🇪🇬', iso: 'eg', name: 'Egypt' },
  { code: '+966', flag: '🇸🇦', iso: 'sa', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', iso: 'ae', name: 'UAE' },
  { code: '+90', flag: '🇹🇷', iso: 'tr', name: 'Turkey' },
  { code: '+91', flag: '🇮🇳', iso: 'in', name: 'India' },
  { code: '+55', flag: '🇧🇷', iso: 'br', name: 'Brazil' },
  { code: '+61', flag: '🇦🇺', iso: 'au', name: 'Australia' },
]

function Profile({ setToken }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: 'MALE',
    bio: '',
    interests: '',
    countryCode: '+1',
    phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const selectedCountry = COUNTRIES.find(c => c.code === (profile.countryCode || '+1')) || COUNTRIES[0]
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES
    const q = countrySearch.toLowerCase()
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q))
  }, [countrySearch])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getMyProfile()
      setProfile(res.data)
    } catch (err) {
      const cached = localStorage.getItem('user')
      if (cached) setProfile(JSON.parse(cached))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await updateProfile(profile)
      setMessage('Profile saved! ✅')
    } catch (err) {
      setMessage('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    navigate('/login')
  }

  const handleSearchClick = () => navigate('/browse', { state: { autoSearch: true } })

  const headerAvatar = (
    <div className="app-header">
      <div className="header-left">
        <h1>
          <span style={{ color: 'var(--color-primary)', display: 'inline-flex', verticalAlign: 'middle' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span> Profile
        </h1>
      </div>
      <div className="header-right">
        <button
          className="header-btn header-btn-icon"
          title="Settings"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
          </svg>
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="app-container">
        {headerAvatar}
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading your profile...</div>
        </div>
        <BottomNav onSearchClick={handleSearchClick} />
      </div>
    )
  }

  return (
    <div className="app-container">
      {headerAvatar}

      <div className="app-content">
        {message && <div className={message.includes('✅') ? 'success-msg' : 'error-msg'}>{message}</div>}

        <div className="profile-page-header">
          <div className="profile-avatar-large">
            {profile.name ? profile.name[0].toUpperCase() : '?'}
          </div>
          <div className="profile-page-name">{profile.name || 'Your Name'}</div>
          <div className="profile-page-bio">{profile.bio || 'Add a bio to tell people about yourself'}</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="profile-form-card">
            <div className="profile-form-title">Basic Info</div>
            <div className="form-group">
              <label>Name</label>
              <input name="name" value={profile.name || ''} onChange={handleChange} placeholder="Your name" />
            </div>

            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={profile.age || ''}
                onChange={handleChange}
                min="18"
                max="100"
                placeholder="18"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div style={{ display: 'grid', gridTemplateColumns: '155px 1fr', gap: '8px', alignItems: 'stretch' }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <button type="button" onClick={() => setCountryOpen(o => !o)} style={{ width: '100%', height: '52px', boxSizing: 'border-box', padding: '0 8px', background: countryOpen ? 'var(--color-primary)' : 'var(--color-input-bg)', border: countryOpen ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', transform: countryOpen ? 'scale(1.02)' : 'scale(1)', transition: 'all 150ms ease', color: countryOpen ? 'white' : 'var(--color-text)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: countryOpen ? 'white' : 'var(--color-text)', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <img src={`https://flagcdn.com/20x15/${selectedCountry.iso}.png`} width="20" height="15" alt={selectedCountry.name} style={{ borderRadius: '3px', objectFit: 'cover', flexShrink: 0, boxShadow: countryOpen ? '0 0 0 1px rgba(255,255,255,0.4)' : '0 0 0 1px rgba(0,0,0,0.06)' }} />
                      <span style={{ color: countryOpen ? 'white' : 'var(--color-text)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', minWidth: 0 }}>{selectedCountry.name}</span>
                      <span style={{ color: countryOpen ? 'white' : 'var(--color-text-secondary)', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>{selectedCountry.code}</span>
                    </span>
                    <span style={{ fontSize: '10px', transform: countryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>▼</span>
                  </button>
                  {countryOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: '260px', overflowY: 'auto', zIndex: 20, marginTop: '6px', boxShadow: 'var(--shadow-lg)', padding: '6px' }}>
                      {COUNTRIES.map(c => (
                        <button key={c.code + c.name} type="button" onClick={() => { setProfile({ ...profile, countryCode: c.code }); setCountryOpen(false) }} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', background: (profile.countryCode || '+1') === c.code ? 'var(--color-primary)' : 'transparent', border: (profile.countryCode || '+1') === c.code ? '1px solid var(--color-primary)' : '1px solid transparent', borderRadius: '10px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: (profile.countryCode || '+1') === c.code ? 'white' : 'var(--color-text)' }}>
                          <img src={`https://flagcdn.com/20x15/${c.iso}.png`} width="20" height="15" alt={c.name} style={{ borderRadius: '3px', boxShadow: (profile.countryCode || '+1') === c.code ? '0 0 0 1px rgba(255,255,255,0.4)' : '0 0 0 1px rgba(0,0,0,0.06)' }} />
                          <span style={{ flex: 1, color: (profile.countryCode || '+1') === c.code ? 'white' : 'var(--color-text)', fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontWeight: 800, color: (profile.countryCode || '+1') === c.code ? 'white' : 'var(--color-text)', fontSize: '13px' }}>{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="tel" name="phone" value={profile.phone || ''} onChange={handleChange} placeholder="612345678" inputMode="numeric" style={{ height: '52px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <div className="profile-form-card">
            <div className="profile-form-title">About You</div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={profile.bio || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Tell people about yourself..."
              />
            </div>

            <div className="form-group">
              <label>Interests</label>
              <input
                name="interests"
                value={profile.interests || ''}
                onChange={handleChange}
                placeholder="music, travel, food, movies"
              />
              <div style={{ marginTop: '8px' }}>
                {profile.interests && profile.interests.split(',').filter(i => i.trim()).map((interest, idx) => (
                  <span key={idx} className="tag primary">{interest.trim()}</span>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ marginTop: '12px', color: 'var(--color-error)', borderColor: 'rgba(244,67,54,0.3)', background: 'rgba(244,67,54,0.08)' }}
          >
            Logout
          </button>
        </form>
      </div>

      <BottomNav onSearchClick={handleSearchClick} />
    </div>
  )
}

export default Profile


