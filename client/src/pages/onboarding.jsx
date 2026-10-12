import { useEffect, useState } from 'react'

function Onboarding({ navigate }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [color, setColor] = useState('#65d0f4')
  const [assistantName, setAssistantName] = useState('Support assistant')
  const [greeting, setGreeting] = useState('Hi! How can I help you today?')

  useEffect(() => {
    let active = true
    fetch('/api/company/me', { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login', { replace: true })
            return
          }
          throw new Error(result.message || 'Could not load your workspace.')
        }
        if (active && result.company) {
          setCompanyName(result.company.name || '')
          setWebsite(result.company.website || '')
          setAssistantName(result.company.widgetConfig?.botName || 'Support assistant')
          setGreeting(result.company.widgetConfig?.greeting || 'Hi! How can I help you today?')
          setColor(result.company.widgetConfig?.primaryColor || '#65d0f4')
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load your workspace.')
        }
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (step === 1) {
      setStep(2)
      setError('')
      return
    }
    setError('')
    setBusy(true)

    try {
      const response = await fetch('/api/company/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          website,
          botName: assistantName,
          greeting,
          primaryColor: color,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Could not save your workspace. Please try again.')
      }
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save your workspace. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return <p className="form-alert" role="status">Loading your workspace…</p>
  }

  return (
    <div className="onboarding-view">
      <div className="onboarding-progress" aria-label="Onboarding progress">
        <span className={`progress-step${step === 1 ? ' active' : ' complete'}`}><i>{step > 1 ? '✓' : '1'}</i> Your workspace</span>
        <span className="progress-track" />
        <span className={`progress-step${step === 2 ? ' active' : ''}`}><i>2</i> Your assistant</span>
      </div>

      <div className="form-heading">
        <span className="step-kicker">{step === 1 ? 'STEP 1 · YOUR WORKSPACE' : 'STEP 2 · YOUR ASSISTANT'}</span>
        <h2>{step === 1 ? 'Tell us about your company' : 'Make your assistant yours'}</h2>
        <p>{step === 1 ? 'First, let’s give your support workspace a name.' : 'Choose how your AI assistant welcomes your customers.'}</p>
      </div>

      <form className="auth-form onboarding-form" onSubmit={handleSubmit}>
        {step === 1 ? (
          <>
            <label className="field">
              <span>Company name</span>
              <input name="name" type="text" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Northstar Studio" autoComplete="organization" minLength="2" maxLength="100" required />
            </label>
            <label className="field">
              <span>Company website <small>Optional</small></span>
              <input name="website" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://yourcompany.com" autoComplete="url" maxLength="200" />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>Assistant name</span>
              <input name="botName" type="text" value={assistantName} onChange={(event) => setAssistantName(event.target.value)} minLength="2" maxLength="50" required />
            </label>
            <label className="field">
              <span>Welcome message</span>
              <input name="greeting" type="text" value={greeting} onChange={(event) => setGreeting(event.target.value)} maxLength="180" required />
            </label>
            <label className="field color-field">
              <span>Brand color</span>
              <span className="color-control">
                <input name="primaryColor" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Choose a brand color" />
                <span>{color.toUpperCase()}</span>
              </span>
            </label>

            <div className="assistant-preview" style={{ '--assistant-color': color }}>
              <div className="assistant-preview-heading">
                <span className="assistant-preview-avatar">✦</span>
                <span><strong>{assistantName || 'Your assistant'}</strong><small><i /> Online</small></span>
                <span className="assistant-preview-dots" aria-hidden="true">•••</span>
              </div>
              <p>{greeting || 'Your welcome message will appear here.'}</p>
              <span className="assistant-preview-caption">A little preview of your chat widget</span>
            </div>
            <button className="text-button onboarding-back" type="button" onClick={() => setStep(1)} disabled={busy}>← Back to company details</button>
          </>
        )}

        {error && <p className="form-alert error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Saving your workspace…' : step === 1 ? 'Continue to assistant' : 'Create workspace'}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
      </form>
      <p className="legal-copy">You can update your workspace and assistant settings any time.</p>
    </div>
  )
}

export default Onboarding
