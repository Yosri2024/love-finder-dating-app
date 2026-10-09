import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyEmail } from '../services/api'

function VerifyEmail() {
  const navigate = useNavigate()
  const email = localStorage.getItem('userEmail') || ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const doVerify = async (six) => {
    setError('')
    setLoading(true)
    try {
      const res = await verifyEmail({ email, code: six })
      const { token, user } = res.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const six = code.trim()
    if (!/^[0-9]{6}$/.test(six)) {
      setError('Enter the 6-digit code.')
      return
    }
    await doVerify(six)
  }

  const handleResend = () => {
    if (resendIn > 0) return
    setResendIn(30)
    const id = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📧</div>
          <h1 className="auth-title">Verify Email</h1>
          <p className="auth-subtitle">
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
          </p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="verify-code">Verification Code</label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(v)
                if (error) setError('')
                if (v.length === 6 && !loading) doVerify(v)
              }}
              placeholder="000000"
              autoComplete="one-time-code"
              style={{
                textAlign: 'center',
                fontSize: '28px',
                letterSpacing: '12px',
                fontWeight: '600',
                fontFamily: 'monospace',
                borderColor: error ? 'var(--color-error)' : undefined
              }}
            />
          </div>

          <button type="submit" className="btn" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="auth-link">
          Didn't get the code? Check your spam folder
          <br />
          <button type="button" onClick={handleResend} disabled={resendIn > 0} style={{ background: 'none', border: 'none', padding: 0, marginTop: '6px', fontSize: '13px', fontWeight: 700, color: resendIn > 0 ? 'var(--color-text-tertiary)' : 'var(--color-primary)', cursor: resendIn > 0 ? 'default' : 'pointer' }}>
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail
