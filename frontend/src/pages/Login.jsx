import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, verifyLoginCode, checkEmail } from '../services/api'
import ThemeToggle from '../components/ThemeToggle'

const COUNTRIES = [
  { code: '+1', iso: 'us', name: 'USA' },
  { code: '+212', iso: 'ma', name: 'Morocco' },
  { code: '+33', iso: 'fr', name: 'France' },
  { code: '+44', iso: 'gb', name: 'UK' },
  { code: '+49', iso: 'de', name: 'Germany' },
  { code: '+34', iso: 'es', name: 'Spain' },
  { code: '+39', iso: 'it', name: 'Italy' },
  { code: '+213', iso: 'dz', name: 'Algeria' },
  { code: '+216', iso: 'tn', name: 'Tunisia' },
  { code: '+20', iso: 'eg', name: 'Egypt' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+90', iso: 'tr', name: 'Turkey' },
  { code: '+91', iso: 'in', name: 'India' },
  { code: '+55', iso: 'br', name: 'Brazil' },
  { code: '+61', iso: 'au', name: 'Australia' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const isValidEmailJS = (v) => EMAIL_REGEX.test(String(v || '').trim())
const isValidPhoneJS = (v) => /^[0-9]{6,15}$/.test(String(v || '').trim())

function Login({ setToken }) {
  const navigate = useNavigate()
  const [loginMethod, setLoginMethod] = useState('email') // email | phone
  const [formData, setFormData] = useState({ email: '', password: '', countryCode: '+1', phone: '' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // 2-step login: credentials -> email code
  const [step, setStep] = useState('credentials')
  const [code, setCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [lastPayload, setLastPayload] = useState(null)
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [info, setInfo] = useState('')
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
    // clear JS error live
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    }
    if (error) setError('')
  }

  // live existence check on the email field (debounced)
  useEffect(() => {
    if (loginMethod !== 'email' || step !== 'credentials') {
      setEmailHint(null)
      return
    }
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
  }, [formData.email, loginMethod, step])

  const finishLogin = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    navigate('/browse')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // ---- JavaScript validation (no HTML required/pattern/type=email) ----
    const errs = {}
    if (loginMethod === 'email') {
      const email = formData.email.trim()
      if (!email) errs.email = 'Email is required.'
      else if (!isValidEmailJS(email)) errs.email = 'Invalid email — must contain @ and a domain (ex: name@mail.com).'
    } else {
      const phone = formData.phone.trim()
      if (!phone) errs.phone = 'Phone number is required.'
      else if (!/^[0-9]+$/.test(phone)) errs.phone = 'Phone must contain digits only (0-9).'
      else if (!isValidPhoneJS(phone)) errs.phone = 'Phone must be 6 to 15 digits.'
    }
    if (!formData.password) errs.password = 'Password is required.'
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters.'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setError(Object.values(errs)[0])
      return
    }
    setFieldErrors({})
    setError('')
    setLoading(true)
    try {
      let payload
      if (loginMethod === 'email') {
        payload = { email: formData.email.trim(), password: formData.password }
      } else {
        const fullPhone = `${formData.countryCode}${formData.phone.trim()}`
        payload = { email: fullPhone, phone: fullPhone, phoneNumber: fullPhone, username: fullPhone, countryCode: formData.countryCode, password: formData.password }
      }
      const res = await login(payload)
      if (res.data?.requiresCode) {
        // step 2: code sent by email
        setLastPayload(payload)
        setPendingEmail(payload.email || formData.email.trim())
        setCode('')
        setCodeError('')
        setInfo(res.data?.message || 'Code sent to your email.')
        setStep('code')
      } else if (res.data?.token) {
        finishLogin(res.data.token, res.data.user)
      } else {
        setError('Unexpected response. Try again.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    const c = code.trim()
    if (!/^[0-9]{6}$/.test(c)) {
      setCodeError('Enter the 6-digit code sent to your email.')
      return
    }
    setCodeError('')
    setCodeLoading(true)
    try {
      const res = await verifyLoginCode({ email: pendingEmail, code: c })
      finishLogin(res.data.token, res.data.user)
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Invalid code. Try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleResend = async () => {
    if (!lastPayload) return
    setCodeLoading(true)
    setCodeError('')
    try {
      const res = await login(lastPayload)
      setInfo(res.data?.message || 'New code sent to your email.')
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Could not resend code.')
    } finally {
      setCodeLoading(false)
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
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue your journey</p>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {info && step === 'code' && <div className="success-msg">{info}</div>}

        {step === 'code' ? (
          <form onSubmit={handleCodeSubmit} noValidate>
            <div className="form-group">
              <label>6-digit code sent to {pendingEmail}</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); if (codeError) setCodeError('') }}
                placeholder="123456"
                autoComplete="one-time-code"
                autoFocus
                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '20px', fontWeight: 800, borderColor: codeError ? 'var(--color-error)' : undefined }}
              />
              {codeError && (
                <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{codeError}</span>
              )}
            </div>
            <button type="submit" className="btn" disabled={codeLoading}>
              {codeLoading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button type="button" onClick={handleResend} disabled={codeLoading} style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer' }}>
                Resend code
              </button>
              <button type="button" onClick={() => { setStep('credentials'); setInfo(''); setCodeError('') }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                ← Back
              </button>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit} noValidate>
          {loginMethod === 'email' ? (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="text"
                inputMode="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                style={fieldErrors.email ? { borderColor: 'var(--color-error)' } : undefined}
              />
              {fieldErrors.email && (
                <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.email}</span>
              )}
              {!fieldErrors.email && emailHint === 'checking' && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '6px', display: 'block' }}>Checking email...</span>
              )}
              {!fieldErrors.email && emailHint && emailHint.exists === true && (
                <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600, marginTop: '6px', display: 'block' }}>✓ Account found — enter your password, a code will be emailed.</span>
              )}
              {!fieldErrors.email && emailHint && emailHint.exists === false && (
                <span style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', display: 'block' }}>
                  <span style={{ color: 'var(--color-error)' }}>No account with this email.</span>{' '}
                  <Link to="/register" style={{ color: 'var(--color-primary)' }}>Create one →</Link>
                </span>
              )}
              <button type="button" onClick={() => setLoginMethod('phone')} style={{ background: 'none', border: 'none', padding: 0, marginTop: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left' }}>
                Use phone number instead →
              </button>
            </div>
          ) : (
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
                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '280px', maxWidth: 'calc(100vw - 32px)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', maxHeight: '260px', overflowY: 'auto', zIndex: 20, marginTop: '6px', boxShadow: 'var(--shadow-lg)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    </div>
                  )}
                </div>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="612345678" inputMode="numeric" style={{ height: '52px', boxSizing: 'border-box', borderColor: fieldErrors.phone ? 'var(--color-error)' : undefined }} />
              </div>
              {fieldErrors.phone && (
                <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600, marginTop: '6px', display: 'block' }}>{fieldErrors.phone}</span>
              )}
              <button type="button" onClick={() => setLoginMethod('email')} style={{ background: 'none', border: 'none', padding: 0, marginTop: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left' }}>
                ← Use email instead
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Your password"
                autoComplete="current-password"
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
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <Link to="/forgot" className="forgot-link" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        )}

        <p className="auth-link">
          New to Love Finder?
          <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
