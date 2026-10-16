import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  FileText,
  LoaderCircle,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, CartesianGrid, Cell } from 'recharts'
import KnowledgeBase from './knowledgebase.jsx'
import AssistantSettings from './assistantSettings.jsx'
import Chat from './chat.jsx'
import BillingPage from './billing.jsx'
import './dashboard.css'

const navigation = [
  { label: 'Workspace', icon: Building2 },
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Chat', icon: MessagesSquare },
  { label: 'Knowledge base', icon: FileText },
  { label: 'AI assistant', icon: Bot },
  { label: 'Plans & billing', icon: CreditCard },
]

const DEFAULT_WORKSPACE = {
  name: '',
  website: '',
  botName: 'Support assistant',
  greeting: 'Hi! How can I help you today?',
  primaryColor: '#65D0F4',
}

async function readCompanyResponse(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The server returned an unreadable response.')
  }
  if (!response.ok) throw new Error(result.message || 'Could not save your workspace.')
  return result
}

function WorkspacePage({ company, onSaved }) {
  const [values, setValues] = useState(() => ({
    name: company?.name || '',
    website: company?.website || '',
    botName: company?.widgetConfig?.botName || DEFAULT_WORKSPACE.botName,
    greeting: company?.widgetConfig?.greeting || DEFAULT_WORKSPACE.greeting,
    primaryColor: company?.widgetConfig?.primaryColor || DEFAULT_WORKSPACE.primaryColor,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const updateValue = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const response = await fetch('/api/company/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await readCompanyResponse(response)
      onSaved(result.company)
      setNotice('Your workspace has been saved.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save your workspace.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="workspace-page">
      <header className="dashboard-heading-row workspace-heading">
        <div>
          <div className="dashboard-date"><Building2 size={13} /> WORKSPACE SETUP</div>
          <h1>{company ? 'Workspace settings' : 'Set up your workspace'}</h1>
          <p>{company ? 'Manage your company details and assistant introduction.' : 'Add your company details and personalize your assistant to get started.'}</p>
        </div>
      </header>

      <form className="workspace-form dashboard-panel" onSubmit={handleSubmit}>
        <div className="workspace-form-section">
          <div className="workspace-section-heading">
            <span className="workspace-section-icon"><Building2 size={17} /></span>
            <span><strong>Company details</strong><small>Tell us about the business behind this workspace.</small></span>
          </div>
          <label className="workspace-field">
            <span>Company name</span>
            <input name="name" value={values.name} onChange={updateValue} placeholder="e.g. Northstar Studio" minLength="2" maxLength="100" autoComplete="organization" required />
          </label>
          <label className="workspace-field">
            <span>Company website <small>Optional</small></span>
            <input name="website" type="url" value={values.website} onChange={updateValue} placeholder="https://yourcompany.com" maxLength="200" autoComplete="url" />
          </label>
        </div>

        <div className="workspace-form-section">
          <div className="workspace-section-heading">
            <span className="workspace-section-icon assistant"><Bot size={17} /></span>
            <span><strong>Assistant details</strong><small>Choose how your assistant appears to customers.</small></span>
          </div>
          <label className="workspace-field">
            <span>Assistant name</span>
            <input name="botName" value={values.botName} onChange={updateValue} minLength="2" maxLength="50" required />
          </label>
          <label className="workspace-field">
            <span>Welcome message</span>
            <input name="greeting" value={values.greeting} onChange={updateValue} maxLength="180" required />
          </label>
          <label className="workspace-field workspace-color-field">
            <span>Brand color</span>
            <span className="workspace-color-control">
              <input name="primaryColor" type="color" value={values.primaryColor} onChange={updateValue} aria-label="Choose a brand color" />
              <small>{values.primaryColor.toUpperCase()}</small>
            </span>
          </label>
        </div>

        {error && <p className="workspace-form-message error" role="alert"><AlertCircle size={15} /> {error}</p>}
        {notice && <p className="workspace-form-message success" role="status"><Check size={15} /> {notice}</p>}
        <div className="workspace-form-actions">
          <p>Your company details and assistant settings can be updated any time.</p>
          <button className="dashboard-primary-button" type="submit" disabled={busy}>
            {busy ? <><LoaderCircle className="workspace-spin" size={15} /> Saving workspace…</> : <><Check size={15} /> Save workspace</>}
          </button>
        </div>
      </form>
    </section>
  )
}

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span><i /> {payload[0].value} conversations</span>
    </div>
  )
}

function formatResponseTime(milliseconds) {
  if (milliseconds == null) return '—'
  if (milliseconds < 1000) return `${milliseconds} ms`
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} s`
  const minutes = Math.floor(milliseconds / 60_000)
  const seconds = Math.round((milliseconds % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatActivityDate(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatMessageTime(dateValue) {
  const messageDate = new Date(dateValue)
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - messageDate.getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} hr ago`
  return messageDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getTimeGreeting(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard({ navigate }) {
  const user = useSelector((state) => state.auth.user)
  const [collapsed, setCollapsed] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [company, setCompany] = useState(null)
  const [companyLoaded, setCompanyLoaded] = useState(false)
  const [companyError, setCompanyError] = useState('')
  const [activity, setActivity] = useState([])
  const [activityPeriod, setActivityPeriod] = useState(null)
  const [period, setPeriod] = useState('14d')
  const [metrics, setMetrics] = useState(null)
  const [activityError, setActivityError] = useState('')
  const [metricsError, setMetricsError] = useState('')
  const [recentConversations, setRecentConversations] = useState([])
  const [recentError, setRecentError] = useState('')
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentHour(new Date().getHours())
    }, 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const updateCompanyPlan = useCallback((planKey) => {
    setCompany((current) => current ? {
      ...current,
      widgetConfig: { ...current.widgetConfig, plan: planKey },
    } : current)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/company/me', { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an unreadable response.')
        }
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!response.ok) throw new Error(result.message || 'Could not load your workspace.')
        if (controller.signal.aborted) return
        setCompany(result.company || null)
        if (!result.company) setActivePage('Workspace')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          setCompanyError(requestError.message || 'Could not load your workspace.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCompanyLoaded(true)
      })

    return () => controller.abort()
  }, [navigate])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/chat/activity?period=' + period, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an unreadable response.')
        }
        if (!response.ok) throw new Error(result.message || 'Could not load conversation activity.')
        if (controller.signal.aborted) return
        setActivity(result.activity.map(({ date, count }) => ({
          count,
          day: formatActivityDate(date),
        })))
        setActivityPeriod(result.period)
        setActivityError('')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          setActivityError(requestError.message || 'Could not load conversation activity.')
        }
      })
    return () => controller.abort()
  }, [period])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/chat/metrics?period=' + period, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an unreadable response.')
        }
        if (!response.ok) throw new Error(result.message || 'Could not load overview metrics.')
        if (controller.signal.aborted) return
        setMetrics(result)
        setMetricsError('')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          setMetricsError(requestError.message || 'Could not load overview metrics.')
        }
      })
    return () => controller.abort()
  }, [period])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/chat/recent', { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an unreadable response.')
        }
        if (!response.ok) throw new Error(result.message || 'Could not load recent conversations.')
        if (!controller.signal.aborted) {
          setRecentConversations(result.conversations)
          setRecentError('')
        }
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          setRecentError(requestError.message || 'Could not load recent conversations.')
        }
      })
    return () => controller.abort()
  }, [])

  const selectPage = (label) => {
    setActivePage(label)
    setMobileOpen(false)
  }

  const currentMetrics = metrics?.period === period ? metrics : null
  const currentActivity = activityPeriod === period ? activity : []
  const periodDays = period === '7d' ? '7' : period === '30d' ? '30' : '14'
  const firstName = user?.name?.trim().split(/\s+/)[0]

  return (
    <main className={`dashboard-shell${collapsed ? ' sidebar-collapsed' : ''}${sidebarHovered ? ' sidebar-hovered' : ''}${mobileOpen ? ' mobile-nav-open' : ''}`}>
      {mobileOpen && (
        <button
          className="dashboard-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="dashboard-sidebar"
        aria-label="Main navigation"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon"><MessagesSquare size={19} strokeWidth={2.2} /></span>
          <span className="dashboard-brand-name">AI Chat<span>.</span></span>
          <button className="sidebar-mobile-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <button className="workspace-switcher" type="button" title="Open workspace settings" onClick={() => selectPage('Workspace')}>
          <span className="workspace-avatar">{(company?.name || 'W').charAt(0).toUpperCase()}</span>
          <span className="workspace-copy"><strong>{company?.name || 'Set up workspace'}</strong><small>{company ? `${company.widgetConfig?.plan || 'free'} plan` : 'Workspace setup needed'}</small></span>
          <ChevronDown className="workspace-chevron" size={15} />
        </button>

        <span className="sidebar-section-label">WORKSPACE</span>
        <nav className="sidebar-navigation">
          {navigation.map(({ label, icon: Icon, count }) => (
            <button
              className={`sidebar-link${activePage === label ? ' active' : ''}`}
              type="button"
              key={label}
              title={collapsed && !sidebarHovered ? label : undefined}
              aria-current={activePage === label ? 'page' : undefined}
              onClick={() => selectPage(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="sidebar-link-label">{label}</span>
              {count && <span className="sidebar-link-count">{count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-plan-card">
            <span className="plan-sparkle"><Sparkles size={15} /></span>
            <strong className="sidebar-link-label">Make more room to grow</strong>
            <p className="sidebar-link-label">Explore a plan that fits your team.</p>
            <button type="button" className="plan-button" onClick={() => selectPage('Plans & billing')}>Explore plans <ArrowUpRight size={14} /></button>
          </div>
          <button className="sidebar-link" type="button" onClick={() => selectPage('Settings')} title={collapsed && !sidebarHovered ? 'Settings' : undefined}>
            <Settings2 size={18} strokeWidth={1.8} /><span className="sidebar-link-label">Settings</span>
          </button>
          <button className="sidebar-link" type="button" onClick={() => selectPage('Help center')} title={collapsed && !sidebarHovered ? 'Help center' : undefined}>
            <CircleHelp size={18} strokeWidth={1.8} /><span className="sidebar-link-label">Help center</span>
          </button>
          <div className="sidebar-user">
            <span className="user-avatar">F</span>
            <span className="sidebar-user-copy"><strong>Felix Jardini</strong><small>Admin</small></span>
            <ChevronDown className="workspace-chevron" size={15} />
          </div>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="sidebar-toggle desktop-toggle" type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}>
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <button className="sidebar-toggle mobile-toggle" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="topbar-divider" />
            <span className="topbar-breadcrumb">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong className="topbar-current">{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <button className="topbar-user" type="button" aria-label="Open workspace" title="Open workspace" onClick={() => selectPage('Workspace')}><span className="user-avatar">F</span><ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="dashboard-content">
          {companyError && (
            <p className="workspace-load-error" role="alert">
              <AlertCircle size={15} /> {companyError}
              <button type="button" onClick={() => selectPage('Workspace')}>Open workspace settings</button>
            </p>
          )}
          {!companyLoaded ? (
            <div className="workspace-loading" role="status"><LoaderCircle className="workspace-spin" size={20} /> Loading workspace…</div>
          ) : activePage === 'Workspace' ? (
            <WorkspacePage company={company} onSaved={(savedCompany) => { setCompany(savedCompany); setCompanyError('') }} />
          ) : activePage === 'Plans & billing' ? (
            <BillingPage currentPlan={company?.widgetConfig?.plan || 'free'} onPlanActivated={updateCompanyPlan} />
          ) : activePage === 'Knowledge base' ? <KnowledgeBase /> : activePage === 'AI assistant' ? <AssistantSettings /> : activePage === 'Chat' ? <Chat /> : (
            <>
          <div className="dashboard-heading-row">
            <div>
              <div className="dashboard-date"><span className="status-dot" /> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
              <h1>{getTimeGreeting(currentHour)}{firstName ? `, ${firstName}` : ''} <span className="heading-wave">✳</span></h1>
              <p>Live workspace activity for the selected period.</p>
            </div>
            <button className="dashboard-primary-button" type="button" onClick={() => selectPage('Chat')}><Plus size={17} /> Test your assistant</button>
          </div>

          <section className="dashboard-stats" aria-label="Support overview">
            <article className="stat-card">
              <div className="stat-card-top"><span>Total conversations</span><span className="stat-icon cyan"><MessagesSquare size={17} /></span></div>
              <strong className="stat-value">{currentMetrics ? currentMetrics.conversations.toLocaleString() : '—'}</strong>
              <div className="stat-foot"><span>{currentMetrics ? `${currentMetrics.totalMessages.toLocaleString()} assistant replies` : 'Loading workspace data'}</span><span>last {periodDays} days</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>AI resolution rate</span><span className="stat-icon violet"><Sparkles size={17} /></span></div>
              <strong className="stat-value">{currentMetrics ? <>{currentMetrics.resolutionRate}<span className="stat-unit">%</span></> : '—'}</strong>
              <div className="stat-foot"><span>{currentMetrics ? `${currentMetrics.resolvedMessages.toLocaleString()} supported answers` : 'Loading workspace data'}</span><span>last {periodDays} days</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Avg. response time</span><span className="stat-icon peach"><Clock3 size={17} /></span></div>
              <strong className="stat-value">{currentMetrics ? formatResponseTime(currentMetrics.averageResponseTimeMs) : '—'}</strong>
              <div className="stat-foot"><span>{!currentMetrics ? 'Loading workspace data' : currentMetrics.averageResponseTimeMs == null ? 'No response-time data yet' : 'Across assistant replies'}</span><span>last {periodDays} days</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Knowledge documents</span><span className="stat-icon green"><FileText size={17} /></span></div>
              <strong className="stat-value">{currentMetrics ? currentMetrics.knowledgeDocuments.toLocaleString() : '—'}</strong>
              <div className="stat-foot"><span>Ready for AI answers</span><span>all time</span></div>
            </article>
          </section>
          {metricsError && <p className="workspace-load-error" role="alert"><AlertCircle size={15} /> {metricsError}</p>}

          <section className="dashboard-panels">
            <article className="dashboard-panel activity-panel">
              <div className="panel-heading">
                <div><h2>Conversation activity</h2><p>Conversation volume over the last {period === '7d' ? '7' : period === '30d' ? '30' : '14'} days</p></div>
                <button className="period-selector" type="button" onClick={() => setPeriod((p) => p === '14d' ? '7d' : p === '7d' ? '30d' : '14d')}>Last <span>{period === '7d' ? '7' : period === '30d' ? '30' : '14'} days</span> <ChevronDown size={14} /></button>
              </div>
              {activityError ? <p className="overview-empty-state" role="alert">{activityError}</p> :
                currentActivity.some(({ count }) => count > 0) ? (
                  <div className="activity-chart" role="img" aria-label="Bar chart showing conversation volume over time">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentActivity} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid vertical={false} stroke="#edf2f5" strokeDasharray="3 5" />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#85939c', fontSize: 11 }}
                          tickMargin={10}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#9aa5ac', fontSize: 10 }}
                          tickMargin={8}
                          width={42}
                        />
                        <Tooltip content={<ActivityTooltip />} cursor={{ fill: '#eef9fc' }} />
                        <Bar dataKey="count" name="Conversations" radius={[5, 5, 1, 1]} maxBarSize={34} animationDuration={650}>
                          {currentActivity.map((item, index) => (
                            <Cell key={`${item.day}-${index}`} fill={index === currentActivity.length - 1 ? '#259fc1' : '#8ed9ec'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="overview-empty-state">No conversations recorded in this period yet. Activity appears here after a visitor sends a message.</p>}
            </article>

<article className="dashboard-panel assistant-panel">
              <div className="panel-heading">
                <div><h2>Your AI assistant</h2><p>A quick look at how it’s doing</p></div>
              </div>
              {currentMetrics?.totalMessages > 0 ? (
                <div className="assistant-chart-wrap">
                  <div className="assistant-donut-chart" role="img" aria-label={`Resolution rate ${currentMetrics.resolutionRate} percent, fallback rate ${currentMetrics.fallbackRate} percent`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={57}
                          outerRadius={77}
                          paddingAngle={3}
                          stroke="none"
                          isAnimationActive
                          animationDuration={650}
                          data={[
                            { name: 'Resolved', value: currentMetrics.resolutionRate },
                            { name: 'Fallback', value: currentMetrics.fallbackRate },
                          ]}
                        >
                          <Cell fill="#38b7d7" />
                          <Cell fill="#e8a16e" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="assistant-donut-center" aria-hidden="true">
                      <strong>{currentMetrics.resolutionRate}<span>%</span></strong>
                      <small>resolved</small>
                    </div>
                  </div>
                  <div className="assistant-chart-legend">
                    <span><i className="resolved" /> Resolved <strong>{currentMetrics.resolutionRate}%</strong></span>
                    <span><i className="fallback" /> Fallback <strong>{currentMetrics.fallbackRate}%</strong></span>
                  </div>
                </div>
              ) : <p className="overview-empty-state">{metricsError || 'Assistant metrics will appear after the first real or test chat.'}</p>}
              <div className="assistant-panel-footer">
                <span><span className="mini-status-dot" /> Answering customers</span>
                <button type="button">View assistant <ArrowUpRight size={13} /></button>
              </div>
            </article>
          </section>

          <section className="dashboard-panel conversations-panel">
            <div className="panel-heading">
              <div><h2>Recent conversations</h2><p>Latest questions sent to your assistant.</p></div>
              <button className="view-all-button" type="button" onClick={() => selectPage('Chat')}>Try a test chat <ArrowUpRight size={14} /></button>
            </div>
            {recentError ? <p className="overview-empty-state" role="alert">{recentError}</p> : recentConversations.length ? (
              <div className="conversation-list">
                {recentConversations.map((conversation) => (
                  <div className="conversation-row" key={conversation._id}>
                    <span className="conversation-avatar blue"><MessagesSquare size={16} /></span>
                    <span className="conversation-person"><strong>Website visitor</strong><small>{conversation.latestMessage}</small></span>
                    <span className="conversation-status"><i /> Received</span>
                    <span className="conversation-time">{formatMessageTime(conversation.lastMessageAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="overview-empty-state">There are no saved conversations yet. Send a test message or install the widget to start collecting real activity.</p>
            )}
            <button className="mobile-view-all" type="button" onClick={() => selectPage('Chat')}>Try a test chat <ArrowUpRight size={14} /></button>
          </section>

          <footer className="dashboard-footer">
            <span>Made for meaningful conversations <MessageCircle size={13} /></span>
            <span>AI Chat <i /> All systems operational</span>
          </footer>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default Dashboard
