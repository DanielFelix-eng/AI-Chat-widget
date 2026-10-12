import { useEffect, useState } from 'react'
import { authRequest, getErrorMessage } from '../lib/auth.js'

function Dashboard({ navigate }) {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')
  const [company, setCompany] = useState(null)

  useEffect(() => {
    let active = true
    authRequest('verifyToken', { method: 'GET' })
      .then(() => {
        return fetch('/api/company/me', { credentials: 'include' })
      })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.message || 'Could not load your company.')
        }
        if (active) {
          if (!result.company) {
            navigate('/onboarding', { replace: true })
          } else {
            setCompany(result.company)
            setStatus('ready')
          }
        }
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
      <span className="step-kicker">WORKSPACE READY</span>
      <h2>{company.name}</h2>
      <p>Your workspace is set up. Your AI assistant is ready for its first support conversations.</p>
      <div className="next-step-card">
        <span className="next-step-number">01</span>
        <span><strong>{company.widgetConfig.botName}</strong><small>{company.widgetConfig.greeting}</small></span>
        <span className="next-arrow" aria-hidden="true">✓</span>
      </div>
      <button className="text-button" type="button" onClick={() => navigate('/onboarding')}>Edit workspace details</button>
    </div>
  )
}

export default Dashboard
