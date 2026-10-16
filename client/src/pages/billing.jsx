import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, CreditCard, LoaderCircle, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import './billing.css'

const plans = [
  {
    key: 'starter',
    name: 'Starter',
    price: 300,
    description: 'For growing teams getting started with AI.',
    features: ['1,500 AI replies / month', '1 assistant widget', '25 knowledge documents', '2 team seats'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 600,
    description: 'More capacity and tools for your team.',
    features: ['6,000 AI replies / month', '3 assistant widgets', '100 knowledge documents', '5 team seats', 'Analytics and live handoff'],
    popular: true,
  },
]

async function readBillingResponse(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The server returned an unreadable response.')
  }
  if (!response.ok) throw new Error(result.message || 'Could not complete this billing request.')
  return result
}

function BillingPage({ currentPlan = 'free', onPlanActivated }) {
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    if (payment?.status !== 'pending') return undefined

    let active = true
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/billing/transactions/${encodeURIComponent(payment.reference)}`, {
          credentials: 'include',
        })
        const result = await readBillingResponse(response)
        if (!active) return
        setPayment((current) => current?.reference === payment.reference ? { ...current, ...result } : current)
        if (result.status === 'success') onPlanActivated?.(payment.planKey)
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not verify your payment.')
      }
    }

    const intervalId = window.setInterval(checkPayment, 4000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [payment, onPlanActivated])

  const choosePlan = async (plan) => {
    setError('')
    setNotice('')
    setPayment(null)
    setSelectedPlan(plan)
  }

  const startPayment = async (event) => {
    event.preventDefault()
    if (!selectedPlan) return

    setError('')
    setNotice('')
    setBusy(true)
    try {
      const response = await fetch('/api/billing/mpesa/charge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: selectedPlan.key, interval: 'monthly', phone }),
      })
      const result = await readBillingResponse(response)
      setPayment({ ...result, status: 'pending', planKey: selectedPlan.key })
      setNotice(result.message || 'Approve the payment request on your phone.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start your M-Pesa payment.')
    } finally {
      setBusy(false)
    }
  }

  const cancelCheckout = () => {
    setSelectedPlan(null)
    setPayment(null)
    setError('')
    setNotice('')
  }

  return (
    <section className="billing-page">
      <div className="billing-heading">
        <div>
          <span className="billing-eyebrow"><Sparkles size={14} /> PLANS THAT GROW WITH YOU</span>
          <h1>Choose your plan</h1>
          <p>Choose a monthly plan for your team. All prices are in Kenyan shillings.</p>
        </div>
        <div className="billing-current-plan"><span>Current plan</span><strong>{currentPlan}</strong></div>
      </div>

      {error && <p className="billing-message error" role="alert"><AlertCircle size={16} /> {error}</p>}
      {notice && !payment && <p className="billing-message success" role="status"><CheckCircle2 size={16} /> {notice}</p>}

      <div className="billing-plan-grid">
        {plans.map((plan) => (
          <article className={`billing-plan-card${plan.popular ? ' popular' : ''}${selectedPlan?.key === plan.key ? ' selected' : ''}`} key={plan.key}>
            {plan.popular && <span className="billing-popular-tag">MOST POPULAR</span>}
            <div className="billing-plan-title">
              <span className={`billing-plan-icon ${plan.key}`}><CreditCard size={18} /></span>
              <h2>{plan.name}</h2>
            </div>
            <p className="billing-plan-description">{plan.description}</p>
            <div className="billing-price">
              <strong>{plan.price === 0 ? 'Free' : `KES ${plan.price.toLocaleString()}`}</strong>
              {plan.price > 0 && <span>/ month</span>}
            </div>
            <ul>
              {plan.features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}
            </ul>
            <button
              className={`billing-select-button${plan.popular ? ' primary' : ''}`}
              type="button"
              onClick={() => choosePlan(plan)}
              disabled={busy || payment?.status === 'pending' || (currentPlan.toLowerCase() === plan.key && !payment)}
            >
              {busy && selectedPlan?.key === plan.key ? <><LoaderCircle className="billing-spin" size={15} /> Please wait…</> :
                currentPlan.toLowerCase() === plan.key && !payment ? 'Current plan' :
                  selectedPlan?.key === plan.key ? 'Selected' : `Choose ${plan.name}`}
            </button>
          </article>
        ))}
      </div>

      {selectedPlan && (
        <section className="billing-checkout" aria-labelledby="billing-checkout-title">
          <div className="billing-checkout-heading">
            <span className="billing-checkout-icon"><Smartphone size={19} /></span>
            <div><h2 id="billing-checkout-title">Pay with M-Pesa</h2><p>One secure payment request will be sent to your phone.</p></div>
            <button type="button" className="billing-back-button" onClick={cancelCheckout} disabled={payment?.status === 'pending'}><ArrowLeft size={15} /> Change plan</button>
          </div>

          <div className="billing-checkout-summary">
            <span>{selectedPlan.name} · Monthly</span>
            <strong>KES {selectedPlan.price.toLocaleString()}<small> / month</small></strong>
          </div>

          <form className="billing-checkout-form" onSubmit={startPayment}>
            <label htmlFor="billing-phone">M-Pesa phone number</label>
            <div className="billing-phone-input"><span>KE</span><input id="billing-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
            <button className="billing-pay-button" type="submit" disabled={busy || Boolean(payment)}>
              {busy ? <><LoaderCircle className="billing-spin" size={16} /> Sending request…</> : payment ? 'Request sent to your phone' : `Continue to pay KES ${selectedPlan.price.toLocaleString()}`}
            </button>
          </form>
          <p className="billing-secure-note"><ShieldCheck size={14} /> Your payment is securely processed by Paystack. We never store your M-Pesa PIN.</p>

          {payment && (
            <div className={`billing-payment-status ${payment.status}`} role={payment.status === 'failed' ? 'alert' : 'status'}>
              {payment.status === 'success' ? <CheckCircle2 size={17} /> : payment.status === 'failed' ? <AlertCircle size={17} /> : <LoaderCircle className="billing-spin" size={17} />}
              <span>{payment.status === 'success' ? `${selectedPlan.name} is now active.` : payment.status === 'failed' ? 'Payment did not complete.' : notice || 'Waiting for payment confirmation…'}</span>
              {payment.status === 'failed' && <button type="button" onClick={() => { setPayment(null); setError(''); setNotice('') }}>Try again</button>}
            </div>
          )}
        </section>
      )}
    </section>
  )
}

export default BillingPage
