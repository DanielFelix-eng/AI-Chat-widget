import { useState } from 'react'
import { authRequest, getErrorMessage } from '../lib/auth.js'

function ForgotPassword({ navigate }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const values = Object.fromEntries(new FormData(event.currentTarget))

    try {
      const result = await authRequest('forgotPassword', values)
      setNotice(result.message || 'If an account exists for this email, we’ll send a reset link shortly.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="followup-view">
      <span className="followup-icon" aria-hidden="true">↗</span>
      <span className="step-kicker">ACCOUNT RECOVERY</span>
      <h2>Reset your password</h2>
      <p>Enter the email address on your account and we’ll send you a link to choose a new password.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Work email</span>
          <input name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        {notice && <p className="form-alert success" role="status">{notice}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>
      <button className="text-button" type="button" onClick={() => navigate('/login')}>Back to sign in</button>
    </div>
  )
}

export default ForgotPassword
