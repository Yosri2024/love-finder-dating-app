import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // email | reset
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const v = email.trim()
    if (!v) { setError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setError('Invalid email — must contain @ and a domain (ex: name@mail.com).'); return }
    setError('')
    setLoading(true)
    try {
      const res = await forgotPassword(v)
      setInfo(res.data?.message || 'Reset code sent to your email.')
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{6}$/.test(code.trim())) { setError('Enter the 6-digit code sent to your email.'); return }
    if (!newPassword) { setError('New password is required.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await resetPassword({ email: email.trim(), code: code.trim(), newPassword })
      setInfo((res.data?.message || 'Password changed.') + ' Redirecting to login...')
      setTimeout(() => navigate('/login'), 1600)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔑</div>
          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-subtitle">{step === 'email' ? 'We’ll send you a reset code' : `Enter the code sent to ${email}`}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {info && <div className="success-msg">{info}</div>}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="forgot-email">Email Address</label>
              <input id="forgot-email" type="text" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError('') }} placeholder="you@example.com" autoComplete="email" style={error ? { borderColor: 'var(--color-error)' } : undefined} />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} noValidate>
            <div className="form-group">
              <label>Reset code</label>
              <input type="text" inputMode="numeric" value={code} onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); if (error) setError('') }} placeholder="123456" autoComplete="one-time-code" style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '20px', fontWeight: 800 }} />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }} placeholder="Repeat new password" autoComplete="new-password" />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Changing...' : 'Change password'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setError(''); setInfo('') }} style={{ background: 'none', border: 'none', padding: 0, marginTop: '12px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              ← Use a different email
            </button>
          </form>
        )}

        <p className="auth-link">
          Remembered?
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
