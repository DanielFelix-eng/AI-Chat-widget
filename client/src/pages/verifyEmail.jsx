import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { authRequest, getErrorMessage } from '../lib/auth.js'
import { initializeAuth, setCredentials } from '../store/authSlice.js'

function VerifyEmail({ navigate, email }) {
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const values = Object.fromEntries(new FormData(event.currentTarget))

    try {
      const result = await authRequest('verifyEmail', { code: values.code })
      if (!result.user) throw new Error('The server did not return the verified user.')
      dispatch(setCredentials(result.user))
      await dispatch(initializeAuth()).unwrap()
      navigate('/pricing', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const resendCode = async () => {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const result = await authRequest('resendVerification')
      setNotice(result.message || 'A new code has been sent.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="followup-view">
      <span className="followup-icon" aria-hidden="true">✉</span>
      <span className="step-kicker">ONE QUICK CHECK</span>
      <h2>Check your inbox</h2>
      <p>We sent a 6-digit verification code{email ? <> to <strong>{email}</strong></> : ''}. Enter it below to verify your email and continue.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Verification code</span>
          <input className="code-input" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="000000" aria-label="Six-digit verification code" required />
        </label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        {notice && <p className="form-alert success" role="status">{notice}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Verifying…' : 'Verify email'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>
      <button className="text-button" type="button" onClick={resendCode} disabled={busy}>Didn’t get the email? <strong>Resend code</strong></button>
      <button className="text-button" type="button" onClick={() => navigate('/login')}>Back to sign in</button>
    </div>
  )
}

export default VerifyEmail
