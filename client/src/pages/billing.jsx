import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CalendarDays, Check, CheckCircle2, CreditCard, LoaderCircle, Receipt, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import { apiUrl } from '../lib/api.js'
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
  const [usage, setUsage] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [billingInfoLoading, setBillingInfoLoading] = useState(true)
  const [billingInfoError, setBillingInfoError] = useState('')

  useEffect(() => {
    let active = true
    const requests = [
      fetch(apiUrl('/api/company/usage'), { credentials: 'include' }).then(readBillingResponse),
      fetch(apiUrl('/api/billing/subscription'), { credentials: 'include' }).then(readBillingResponse),
      fetch(apiUrl('/api/billing/transactions'), { credentials: 'include' }).then(readBillingResponse),
    ]

    Promise.allSettled(requests).then(([usageResult, subscriptionResult, historyResult]) => {
      if (!active) return
      const failures = []
      if (usageResult.status === 'fulfilled') setUsage(usageResult.value)
      else failures.push(usageResult.reason)
      if (subscriptionResult.status === 'fulfilled') setSubscription(subscriptionResult.value.subscription)
      else failures.push(subscriptionResult.reason)
      if (historyResult.status === 'fulfilled') setTransactions(historyResult.value.transactions)
      else failures.push(historyResult.reason)
      if (failures.length) {
        setBillingInfoError(failures[0] instanceof Error ? failures[0].message : 'Some billing details could not be loaded.')
      }
    }).finally(() => {
      if (active) setBillingInfoLoading(false)
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    if (payment?.status !== 'pending') return undefined

    let active = true
    const checkPayment = async () => {
      try {
        const response = await fetch(apiUrl(`/api/billing/transactions/${encodeURIComponent(payment.reference)}`), {
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

    const cleanedPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
    if (!cleanedPhone) {
      setError('Please enter your M-Pesa phone number.')
      return
    }

    setError('')
    setNotice('')
    setBusy(true)
    try {
      const response = await fetch(apiUrl('/api/billing/mpesa/charge'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: selectedPlan.key, interval: 'monthly', phone: cleanedPhone }),
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
      {billingInfoError && <p className="billing-message error" role="alert"><AlertCircle size={16} /> {billingInfoError}</p>}

      <section className="billing-account-overview" aria-label="Subscription and usage">
        <article className="billing-account-card">
          <div className="billing-account-card-heading"><CalendarDays size={17} /><h2>Subscription</h2></div>
          {billingInfoLoading ? <p role="status">Loading subscription…</p> : (
            <>
              <strong className="billing-subscription-plan">{subscription?.planKey || usage?.plan || currentPlan} plan</strong>
              <span className="billing-subscription-status">{subscription?.status || usage?.planStatus || 'Active'}</span>
              <p>{subscription?.status === 'trialing' && subscription.trialEndsAt
                ? `Your free trial ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}.`
                : subscription?.currentPeriodEnd
                  ? `Current period ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
                  : usage?.resetAt
                    ? `Usage resets ${new Date(usage.resetAt).toLocaleDateString()}.`
                    : 'Your current plan is active.'}</p>
            </>
          )}
        </article>
        <article className="billing-account-card billing-usage-card">
          <div className="billing-account-card-heading"><Sparkles size={17} /><h2>Plan usage</h2></div>
          {billingInfoLoading ? <p role="status">Loading usage…</p> : usage ? (
            <div className="billing-usage-list">
              {Object.entries({ 'AI replies': usage.usage.replies, Documents: usage.usage.documents, Widgets: usage.usage.widgets }).map(([label, item]) => (
                <div className="billing-usage-item" key={label}>
                  <div><span>{label}</span><strong>{item.used.toLocaleString()} / {item.limit.toLocaleString()}</strong></div>
                  <span className="billing-usage-track" role="progressbar" aria-label={`${label} used`} aria-valuemin={0} aria-valuemax={item.limit} aria-valuenow={Math.min(item.limit, Math.max(0, item.used))}>
                    <i style={{ width: `${item.limit ? Math.min(100, (item.used / item.limit) * 100) : 0}%` }} />
                  </span>
                </div>
              ))}
            </div>
          ) : <p>Usage details are unavailable.</p>}
        </article>
      </section>

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

      <section className="billing-history" aria-labelledby="billing-history-title">
        <div className="billing-history-heading">
          <span className="billing-checkout-icon"><Receipt size={17} /></span>
          <div><h2 id="billing-history-title">Payment history</h2><p>Your latest payment activity.</p></div>
        </div>
        {billingInfoLoading ? <p className="billing-history-empty" role="status">Loading payment history…</p> : transactions.length ? (
          <div className="billing-history-list">
            {transactions.map((transaction) => (
              <article className="billing-history-row" key={transaction._id}>
                <span className="billing-history-plan"><strong>{transaction.planKey} plan</strong><small>{new Date(transaction.createdAt).toLocaleDateString()} · {transaction.channel.toUpperCase()}</small></span>
                <strong className="billing-history-amount">{transaction.currency} {transaction.amount.toLocaleString()}</strong>
                <span className={`billing-history-status ${transaction.status}`}>{transaction.status}</span>
              </article>
            ))}
          </div>
        ) : <p className="billing-history-empty">No payments yet. Completed payments will appear here.</p>}
      </section>

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
