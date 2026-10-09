import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, checkEmail } from '../services/api'
import ThemeToggle from '../components/ThemeToggle'

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isValidEmailJS = (v) => EMAIL_REGEX.test(String(v || '').trim())
const isValidPhoneJS = (v) => /^[0-9]{6,15}$/.test(String(v || '').trim())

function Register({ setToken }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    gender: 'MALE',
    countryCode: '+1',
    phone: ''
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // live email existence check while typing
  const [emailHint, setEmailHint] = useState(null) // null | 'checking' | { exists: bool }
  const hintTimer = useRef(null)
  const selectedCountry = COUNTRIES.find(c => c.code === formData.countryCode) || COUNTRIES[0]
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES
    const q = countrySearch.toLowerCase()
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q))
  }, [countrySearch])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    }
    if (error) setError('')
  }

  // live existence check on the email field (debounced)
  useEffect(() => {
    const v = formData.email.trim()
    if (!isValidEmailJS(v)) {
      setEmailHint(null)
      return
    }
    setEmailHint('checking')
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(async () => {
      try {
        const res = await checkEmail(v)
        setEmailHint({ exists: !!res.data?.exists })
      } catch {
        setEmailHint(null)
      }
    }, 450)
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current) }
  }, [formData.email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // ---- JavaScript validation (no HTML required/pattern/type=email) ----
    const errs = {}
    const name = formData.name.trim()
    const email = formData.email.trim()
    const phone = formData.phone.trim()
    if (!name) errs.name = 'Full name is required.'
    else if (name.length < 2) errs.name = 'Name must be at least 2 characters.'
    if (!email) errs.email = 'Email is required.'
    else if (!isValidEmailJS(email)) errs.email = 'Invalid email — must contain @ and a domain (ex: name@mail.com).'
    if (!phone) errs.phone = 'Phone number is required.'
    else if (!/^[0-9]+$/.test(phone)) errs.phone = 'Phone must contain digits only (0-9).'
    else if (!isValidPhoneJS(phone)) errs.phone = 'Phone must be 6 to 15 digits.'
    if (!formData.password) errs.password = 'Password is required.'
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters.'
    if (!formData.confirmPassword) errs.confirmPassword = 'Please confirm your password.'
    else if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    if (!String(formData.age).trim()) errs.age = 'Age is required.'
    else {
      const ageNum = Number(formData.age)
      if (!Number.isInteger(ageNum)) errs.age = 'Age must be a whole number.'
      else if (ageNum < 18) errs.age = 'You must be at least 18 years old.'
      else if (ageNum > 100) errs.age = 'Age must be 100 or less.'
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setError(Object.values(errs)[0])
      return
    }
    setFieldErrors({})
    setError('')
    setLoading(true)

    try {
      const { confirmPassword, ...payload } = formData
      const res = await register(payload)
      // Save user info, redirect to email verification
      localStorage.setItem('userEmail', formData.email)
      navigate('/verify')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}>
          <ThemeToggle />
        </div>
        <div className="auth-logo">
          <div className="auth-logo-icon">💕</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start your love story today</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              style={fieldErrors.name ? { borderColor: 'var(--color-error)' } : undefined}
            />
            {fieldErrors.name && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="text"
              inputMode="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={fieldErrors.email ? { borderColor: 'var(--color-error)' } : undefined}
            />
            {fieldErrors.email && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.email}</span>
            )}
            {!fieldErrors.email && emailHint === 'checking' && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '6px', display: 'block' }}>Checking email...</span>
            )}
            {!fieldErrors.email && emailHint && emailHint.exists === false && (
              <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, marginTop: '6px', display: 'block' }}>✓ Email available — a verification code will be sent.</span>
            )}
            {!fieldErrors.email && emailHint && emailHint.exists === true && (
              <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                <span style={{ color: 'var(--color-error)' }}>Email already registered.</span>{' '}
                <Link to="/login" style={{ color: 'var(--color-primary)' }}>Sign in →</Link>
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr', gap: '8px', alignItems: 'stretch' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <button type="button" onClick={() => setCountryOpen(o => !o)} style={{ width: '100%', height: '52px', boxSizing: 'border-box', padding: '0 8px', background: countryOpen ? 'var(--color-primary)' : 'var(--color-input-bg)', border: countryOpen ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between', transform: countryOpen ? 'scale(1.02)' : 'scale(1)', transition: 'all 150ms ease', color: countryOpen ? 'white' : 'var(--color-text)', minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: countryOpen ? 'white' : 'var(--color-text)', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <img src={`https://flagcdn.com/20x15/${selectedCountry.iso}.png`} width="20" height="15" alt={selectedCountry.name} style={{ borderRadius: '3px', objectFit: 'cover', flexShrink: 0, boxShadow: countryOpen ? '0 0 0 1px rgba(255,255,255,0.4)' : '0 0 0 1px rgba(0,0,0,0.06)' }} />
                    <span style={{ color: countryOpen ? 'white' : 'var(--color-text)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', minWidth: 0 }}>{selectedCountry.name}</span>
                    <span style={{ color: countryOpen ? 'white' : 'var(--color-text-secondary)', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>{selectedCountry.code}</span>
                  </span>
                  <span style={{ fontSize: '10px', color: countryOpen ? 'white' : 'var(--color-text-secondary)', transform: countryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms, color 150ms', flexShrink: 0 }}>▼</span>
                </button>
                {countryOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, width: '280px', maxWidth: 'calc(100vw - 32px)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: '300px', overflowY: 'auto', zIndex: 20, marginTop: '6px', boxShadow: 'var(--shadow-lg)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ position: 'sticky', top: 0, background: 'var(--color-surface)', paddingBottom: '6px', zIndex: 1 }}>
                      <input type="text" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Search country..." autoFocus style={{ width: '100%', padding: '10px 12px', background: 'var(--color-input-bg)', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                    </div>
                    {filteredCountries.map(c => (
                      <button key={c.code + c.name} type="button" onClick={() => { setFormData({ ...formData, countryCode: c.code }); setCountryOpen(false); setCountrySearch('') }} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', background: formData.countryCode === c.code ? 'var(--color-primary)' : 'transparent', border: formData.countryCode === c.code ? '1px solid var(--color-primary)' : '1px solid transparent', borderRadius: '10px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: formData.countryCode === c.code ? 'white' : 'var(--color-text)' }}>
                        <img src={`https://flagcdn.com/20x15/${c.iso}.png`} width="20" height="15" alt={c.name} style={{ borderRadius: '3px', boxShadow: formData.countryCode === c.code ? '0 0 0 1px rgba(255,255,255,0.4)' : '0 0 0 1px rgba(0,0,0,0.06)' }} />
                        <span style={{ flex: 1, color: formData.countryCode === c.code ? 'white' : 'var(--color-text)', fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontWeight: 800, color: formData.countryCode === c.code ? 'white' : 'var(--color-text)', fontSize: '13px' }}>{c.code}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>No country found</div>}
                  </div>
                )}
              </div>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="612345678" inputMode="numeric" style={{ height: '52px', boxSizing: 'border-box', borderColor: fieldErrors.phone ? 'var(--color-error)' : undefined }} />
            </div>
            {fieldErrors.phone && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                style={{ paddingRight: '48px', borderColor: fieldErrors.password ? 'var(--color-error)' : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat password"
              autoComplete="new-password"
              style={{ borderColor: fieldErrors.confirmPassword ? 'var(--color-error)' : undefined }}
            />
            {fieldErrors.confirmPassword && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.confirmPassword}</span>
            )}
            {!fieldErrors.confirmPassword && formData.confirmPassword && formData.confirmPassword !== formData.password && (
              <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>Passwords do not match</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Age</label>
              <input
                type="text"
                inputMode="numeric"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="18"
                style={fieldErrors.age ? { borderColor: 'var(--color-error)' } : undefined}
              />
              {fieldErrors.age && (
                <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.age}</span>
              )}
            </div>

            <div className="form-group">
              <label>I am</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                
              </select>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register


