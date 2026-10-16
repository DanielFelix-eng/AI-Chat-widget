import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { authRequest, getErrorMessage } from '../lib/auth.js'
import { setCredentials } from '../store/authSlice.js'

function Login({ navigate, rememberEmail }) {
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const values = Object.fromEntries(new FormData(event.currentTarget))

    try {
      const result = await authRequest('login', values)
      if (!result.user) throw new Error('The server did not return the signed-in user.')
      dispatch(setCredentials(result.user))
      rememberEmail(values.email)
      navigate(result.user?.isVerified === true ? '/dashboard' : '/verify-email')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="form-heading">
        <span className="step-kicker">WELCOME BACK</span>
        <h2>Sign in to Nudge</h2>
        <p>Sign in to continue to your workspace.</p>
      </div>

      <div className="mode-switch" role="group" aria-label="Account access">
        <button type="button" aria-pressed="false" onClick={() => navigate('/signup')}>Create account</button>
        <button type="button" aria-pressed="true" className="active">Sign in</button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Work email</span>
          <input name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" placeholder="Your password" autoComplete="current-password" required />
        </label>
        <button className="forgot-link" type="button" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
        {error && <p className="form-alert error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>
    </>
  )
}

export default Login
