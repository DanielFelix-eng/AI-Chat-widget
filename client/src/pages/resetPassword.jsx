import { useState } from 'react'
import { authRequest, getErrorMessage } from '../lib/auth.js'

function ResetPassword({ navigate }) {
  const token = new URLSearchParams(window.location.search).get('token')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (values.password !== values.confirmPassword) {
      setError('The passwords do not match.')
      setBusy(false)
      return
    }

    try {
      await authRequest('resetPassword', { token, password: values.password })
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="followup-view">
        <span className="step-kicker">ACCOUNT RECOVERY</span>
        <h2>This link is incomplete</h2>
        <p>Request a new password reset link to continue.</p>
        <button className="primary-button" type="button" onClick={() => navigate('/forgot-password')}>Request a new link <span aria-hidden="true">↗</span></button>
      </div>
    )
  }

  return (
    <div className="followup-view">
      <span className="followup-icon complete-icon" aria-hidden="true">•</span>
      <span className="step-kicker">ACCOUNT RECOVERY</span>
      <h2>Choose a new password</h2>
      <p>Use at least 8 characters. Your reset link expires after one hour.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength="8" required />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required />
        </label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
