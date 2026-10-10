import { useState } from 'react'
import { authRequest, getErrorMessage } from '../lib/auth.js'

function SignUp({ navigate, rememberEmail }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const values = Object.fromEntries(new FormData(event.currentTarget))

    try {
      await authRequest('signup', values)
      rememberEmail(values.email)
      navigate('/verify-email')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="form-heading">
        <span className="step-kicker">GET STARTED</span>
        <h2>Create your account</h2>
        <p>Start building a better support experience.</p>
      </div>

      <div className="mode-switch" role="group" aria-label="Account access">
        <button type="button" aria-pressed="true" className="active">Create account</button>
        <button type="button" aria-pressed="false" onClick={() => navigate('/login')}>Sign in</button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Your name</span>
          <input name="name" type="text" placeholder="e.g. Alex Morgan" autoComplete="name" minLength="2" maxLength="50" required />
        </label>
        <label className="field">
          <span>Work email</span>
          <input name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength="8" required />
        </label>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Create account'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>

      <p className="legal-copy">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
    </>
  )
}

export default SignUp
