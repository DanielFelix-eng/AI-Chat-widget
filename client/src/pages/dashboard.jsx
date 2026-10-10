import { useEffect, useState } from 'react'
import { authRequest, getErrorMessage } from '../lib/auth.js'

function Dashboard({ navigate }) {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    authRequest('verifyToken', { method: 'GET' })
      .then(() => {
        if (active) setStatus('ready')
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError))
          navigate('/login', { replace: true })
        }
      })

    return () => {
      active = false
    }
  }, [navigate])

  if (status !== 'ready') {
    return <p className="form-alert error" role="alert">{error || 'Checking your session…'}</p>
  }

  return (
    <div className="followup-view">
      <span className="followup-icon complete-icon" aria-hidden="true">✓</span>
      <span className="step-kicker">ACCOUNT READY</span>
      <h2>You’re signed in</h2>
      <p>Your account is ready. Next, we’ll set up your workspace and AI assistant.</p>
      <div className="next-step-card">
        <span className="next-step-number">01</span>
        <span><strong>Workspace setup</strong><small>Give your AI assistant a home</small></span>
        <span className="next-arrow" aria-hidden="true">→</span>
      </div>
    </div>
  )
}

export default Dashboard
