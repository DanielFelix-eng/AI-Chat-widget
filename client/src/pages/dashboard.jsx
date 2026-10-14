import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
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
  UsersRound,
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

const conversations = [
  { initials: 'JM', name: 'Jordan Miller', subject: 'Question about your return policy', time: '2 min ago', status: 'Needs reply', color: 'blue' },
  { initials: 'SC', name: 'Sofia Chen', subject: 'Where can I track my order?', time: '18 min ago', status: 'AI resolved', color: 'peach' },
  { initials: 'AR', name: 'Alex Rivera', subject: 'Looking for a product recommendation', time: '46 min ago', status: 'AI resolved', color: 'green' },
  { initials: 'TK', name: 'Taylor Kim', subject: 'Can I change my subscription?', time: '1 hr ago', status: 'Needs reply', color: 'lavender' },
]

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span><i /> {payload[0].value} conversations</span>
    </div>
  )
}

function Dashboard({ navigate }) {
  const [collapsed, setCollapsed] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [company, setCompany] = useState(null)
  const [companyLoaded, setCompanyLoaded] = useState(false)
  const [companyError, setCompanyError] = useState('')
  const [activity, setActivity] = useState([])
  const [period, setPeriod] = useState('14d')
  const [metrics, setMetrics] = useState(null)

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
        if (controller.signal.aborted) return
        const today = new Date()
        const lastDayOffset = result.activity.length - 1
        setActivity(result.activity.map((count, index) => {
          const date = new Date(today)
          date.setDate(today.getDate() - (lastDayOffset - index))
          return {
            count,
            day: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          }
        }))
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          console.error('Failed to fetch activity:', requestError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) controller.abort()
      })
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
        if (controller.signal.aborted) return
        setMetrics(result)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && !controller.signal.aborted) {
          console.error('Failed to fetch metrics:', requestError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) controller.abort()
      })
  }, [period])

  const selectPage = (label) => {
    setActivePage(label)
    setMobileOpen(false)
  }

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
              <div className="dashboard-date"><span className="status-dot" /> MONDAY, OCTOBER 12</div>
              <h1>Good morning, Felix <span className="heading-wave">✳</span></h1>
              <p>Here’s what’s happening with your support today.</p>
            </div>
            <button className="dashboard-primary-button" type="button" onClick={() => selectPage('Chat')}><Plus size={17} /> Test your assistant</button>
          </div>

          <section className="dashboard-stats" aria-label="Support overview">
            <article className="stat-card">
              <div className="stat-card-top"><span>Total conversations</span><span className="stat-icon cyan"><MessagesSquare size={17} /></span></div>
              <strong className="stat-value">1,284</strong>
              <div className="stat-foot"><span className="stat-change positive"><ArrowUpRight size={13} /> 12.8%</span><span>vs. last month</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>AI resolution rate</span><span className="stat-icon violet"><Sparkles size={17} /></span></div>
              <strong className="stat-value">82.4<span className="stat-unit">%</span></strong>
              <div className="stat-foot"><span className="stat-change positive"><ArrowUpRight size={13} /> 4.6%</span><span>vs. last month</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Avg. response time</span><span className="stat-icon peach"><Clock3 size={17} /></span></div>
              <strong className="stat-value">1m 24s</strong>
              <div className="stat-foot"><span className="stat-change positive"><ArrowDownRight size={13} /> 8.2%</span><span>vs. last month</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-card-top"><span>Customer satisfaction</span><span className="stat-icon green"><UsersRound size={17} /></span></div>
              <strong className="stat-value">96.8<span className="stat-unit">%</span></strong>
              <div className="stat-foot"><span className="stat-change positive"><ArrowUpRight size={13} /> 2.1%</span><span>vs. last month</span></div>
            </article>
          </section>

          <section className="dashboard-panels">
            <article className="dashboard-panel activity-panel">
              <div className="panel-heading">
                <div><h2>Conversation activity</h2><p>Conversation volume over the last {period === '7d' ? '7' : period === '30d' ? '30' : '14'} days</p></div>
                <button className="period-selector" type="button" onClick={() => setPeriod((p) => p === '14d' ? '7d' : p === '7d' ? '30d' : '14d')}>Last <span>{period === '7d' ? '7' : period === '30d' ? '30' : '14'} days</span> <ChevronDown size={14} /></button>
              </div>
              <div className="activity-chart" role="img" aria-label="Bar chart showing conversation volume over time">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
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
                      {activity.map((item, index) => (
                        <Cell key={`${item.day}-${index}`} fill={index === activity.length - 1 ? '#259fc1' : '#8ed9ec'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

<article className="dashboard-panel assistant-panel">
              <div className="panel-heading">
                <div><h2>Your AI assistant</h2><p>A quick look at how it’s doing</p></div>
              </div>
              {metrics ? (
                <div className="assistant-chart-wrap">
                  <div className="assistant-donut-chart" role="img" aria-label={`Resolution rate ${metrics.resolutionRate} percent, fallback rate ${metrics.fallbackRate} percent`}>
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
                            { name: 'Resolved', value: metrics.resolutionRate },
                            { name: 'Fallback', value: metrics.fallbackRate },
                          ]}
                        >
                          <Cell fill="#38b7d7" />
                          <Cell fill="#e8a16e" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="assistant-donut-center" aria-hidden="true">
                      <strong>{metrics.resolutionRate}<span>%</span></strong>
                      <small>resolved</small>
                    </div>
                  </div>
                  <div className="assistant-chart-legend">
                    <span><i className="resolved" /> Resolved <strong>{metrics.resolutionRate}%</strong></span>
                    <span><i className="fallback" /> Fallback <strong>{metrics.fallbackRate}%</strong></span>
                  </div>
                </div>
              ) : (
                <div className="assistant-score">
                  <div className="score-ring"><span><strong>82<span>%</span></strong><small>resolved</small></span></div>
                  <div className="score-copy">
                    <strong>Doing great!</strong>
                    <p>Your assistant handled 82% of conversations without needing a human.</p>
                    <span><ArrowUpRight size={13} /> 4.6% this month</span>
                  </div>
                </div>
              )}
              <div className="assistant-panel-footer">
                <span><span className="mini-status-dot" /> Answering customers</span>
                <button type="button">View assistant <ArrowUpRight size={13} /></button>
              </div>
            </article>
          </section>

          <section className="dashboard-panel conversations-panel">
            <div className="panel-heading">
              <div><h2>Recent conversations</h2><p>Stay on top of what your customers are asking.</p></div>
              <button className="view-all-button" type="button" onClick={() => selectPage('Chat')}>Try a test chat <ArrowUpRight size={14} /></button>
            </div>
            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button className="conversation-row" type="button" key={conversation.name}>
                  <span className={`conversation-avatar ${conversation.color}`}>{conversation.initials}</span>
                  <span className="conversation-person"><strong>{conversation.name}</strong><small>{conversation.subject}</small></span>
                  <span className={`conversation-status ${conversation.status === 'Needs reply' ? 'needs-reply' : ''}`}><i />{conversation.status}</span>
                  <span className="conversation-time">{conversation.time}</span>
                  <ArrowUpRight className="conversation-open" size={15} />
                </button>
              ))}
            </div>
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
