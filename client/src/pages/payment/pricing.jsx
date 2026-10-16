import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowRight, Check, Clock3, CreditCard, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { initializeAuth } from '../../store/authSlice.js'
import './pricing.css'

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: 300,
    description: 'Everything you need to launch helpful AI support.',
    features: ['1,500 AI replies / month', '1 assistant widget', '25 knowledge documents', '2 team seats'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 600,
    description: 'More capacity and tools for a growing support team.',
    features: ['6,000 AI replies / month', '3 assistant widgets', '100 knowledge documents', '5 team seats', 'Analytics and live handoff'],
  },
]

async function readResponse(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The server returned an unreadable response.')
  }
  if (!response.ok) throw new Error(result.message || 'Could not complete your plan selection.')
  return result
}

function Pricing({ navigate }) {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const subscription = user?.subscription
  const [selectedPlan, setSelectedPlan] = useState('starter')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    if (payment?.status !== 'pending') return undefined
    let active = true
    let completing = false

    const checkPayment = async () => {
      if (completing) return
      try {
        const response = await fetch(`/api/billing/transactions/${encodeURIComponent(payment.reference)}`, {
          credentials: 'include',
        })
        const result = await readResponse(response)
        if (!active) return
        if (result.status === 'failed') {
          setPayment((current) => current?.reference === payment.reference ? { ...current, status: 'failed' } : current)
          return
        }
        if (result.status === 'success') {
          completing = true
          await dispatch(initializeAuth()).unwrap()
          navigate('/onboarding', { replace: true })
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not verify your payment.')
      }
    }

    checkPayment()
    const intervalId = window.setInterval(checkPayment, 4000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [dispatch, navigate, payment])

  const startTrial = async (planKey) => {
    setBusy(true)
    setError('')
    try {
      await readResponse(await fetch('/api/billing/trial', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      }))
      const refreshedUser = await dispatch(initializeAuth()).unwrap()
      navigate(refreshedUser.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start your free month.')
    } finally {
      setBusy(false)
    }
  }

  const startPayment = async (event) => {
    event.preventDefault()
    const plan = plans.find(({ key }) => key === selectedPlan)
    if (!plan) return

    setBusy(true)
    setError('')
    try {
      const result = await readResponse(await fetch('/api/billing/mpesa/charge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.key, interval: 'monthly', phone }),
      }))
      setPayment({ reference: result.reference, status: 'pending', planKey: plan.key })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start your M-Pesa payment.')
    } finally {
      setBusy(false)
    }
  }

  const hasUsedTrial = Boolean(subscription?.trialUsed)
  const trialExpired = hasUsedTrial && !subscription?.hasAccess
  const activePlan = plans.find(({ key }) => key === subscription?.planKey)

  return (
    <main className="pricing-page">
      <header className="pricing-topbar">
        <a className="pricing-brand" href="/"><span>n</span> AI Chat<span className="pricing-brand-dot">.</span></a>
        <span className="pricing-secure-label"><ShieldCheck size={15} /> Secure plan selection</span>
      </header>

      <section className="pricing-content">
        <div className="pricing-intro">
          <span className="pricing-eyebrow"><Sparkles size={14} /> A BETTER WAY TO SUPPORT</span>
          <h1>{subscription?.hasAccess ? 'Your plan is ready.' : trialExpired ? 'Keep your assistant online.' : 'Start with a free month.'}</h1>
          <p>
            {subscription?.hasAccess
              ? 'Your plan is active. Continue to finish setting up your workspace.'
              : trialExpired
                ? subscription.status === 'trialing'
                  ? 'Your free month has ended. Choose a plan and pay monthly to restore workspace access.'
                  : 'Your subscription has ended. Choose a plan and pay monthly to restore workspace access.'
                : 'Choose a plan to start your one-month trial. No payment is taken today; after the trial, continue with a monthly M-Pesa payment.'}
          </p>
        </div>

        {error && <p className="pricing-error" role="alert">{error}</p>}

        {subscription?.hasAccess ? (
          <section className="pricing-active-plan">
            <span className="pricing-active-icon"><Check size={20} /></span>
            <div>
              <strong>{activePlan?.name || subscription.planKey} plan active</strong>
              <p>{subscription.status === 'trialing' && subscription.trialEndsAt
                ? `Your free month ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}.`
                : 'Your subscription is active.'}</p>
            </div>
            <button type="button" onClick={() => navigate(user?.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true })}>
              Continue <ArrowRight size={16} />
            </button>
          </section>
        ) : (
          <>
            <div className="pricing-plan-grid">
              {plans.map((plan) => (
                <article className={`pricing-plan-card${selectedPlan === plan.key ? ' selected' : ''}`} key={plan.key}>
                  {plan.key === 'starter' && <span className="pricing-recommended">MOST POPULAR</span>}
                  <div className="pricing-plan-name"><span><CreditCard size={17} /></span><h2>{plan.name}</h2></div>
                  <p className="pricing-plan-description">{plan.description}</p>
                  <div className="pricing-price"><strong>KES {plan.price}</strong><span>/ month</span></div>
                  <div className="pricing-trial-note"><Clock3 size={14} /> {hasUsedTrial ? 'Monthly plan' : 'First month free'}</div>
                  <ul>{plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}</ul>
                  {hasUsedTrial ? (
                    <button
                      className="pricing-plan-button"
                      type="button"
                      onClick={() => setSelectedPlan(plan.key)}
                      aria-pressed={selectedPlan === plan.key}
                    >
                      {selectedPlan === plan.key ? 'Selected for payment' : 'Choose this plan'}
                    </button>
                  ) : (
                    <button className="pricing-plan-button" type="button" disabled={busy} onClick={() => startTrial(plan.key)}>
                      {busy ? <><LoaderCircle className="pricing-spin" size={16} /> Starting trial…</> : 'Start free month'}
                    </button>
                  )}
                </article>
              ))}
            </div>

            {trialExpired && (
              <form className="pricing-payment" onSubmit={startPayment}>
                <div className="pricing-payment-heading">
                  <span className="pricing-payment-icon"><CreditCard size={18} /></span>
                  <div><strong>Pay with M-Pesa</strong><p>Monthly payment for {plans.find(({ key }) => key === selectedPlan)?.name}: KES {plans.find(({ key }) => key === selectedPlan)?.price}.</p></div>
                </div>
                {payment?.status === 'failed' ? (
                  <div className="pricing-payment-error" role="alert">
                    Payment did not complete. Check the phone number or try again.
                    <button type="button" onClick={() => setPayment(null)}>Try again</button>
                  </div>
                ) : payment?.status === 'pending' ? (
                  <p className="pricing-payment-pending" role="status"><LoaderCircle className="pricing-spin" size={16} /> Approve the payment request on your phone. Waiting for confirmation…</p>
                ) : (
                  <>
                    <label htmlFor="pricing-phone">M-Pesa phone number</label>
                    <div className="pricing-phone-field"><span>KE</span><input id="pricing-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
                    <button className="pricing-pay-button" type="submit" disabled={busy}>
                      {busy ? <><LoaderCircle className="pricing-spin" size={16} /> Sending request…</> : `Pay KES ${plans.find(({ key }) => key === selectedPlan)?.price} for one month`}
                    </button>
                  </>
                )}
                <small><ShieldCheck size={13} /> Securely processed by Paystack. No automatic M-Pesa debit.</small>
              </form>
            )}
          </>
        )}

        <p className="pricing-footnote">Your workspace and dashboard stay protected until you select a plan with access.</p>
      </section>
    </main>
  )
}

export default Pricing