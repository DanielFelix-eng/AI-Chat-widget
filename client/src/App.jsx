import { useCallback, useEffect, useState } from 'react'
import Dashboard from './pages/dashboard.jsx'
import ForgotPassword from './pages/forgotPassword.jsx'
import Login from './pages/login.jsx'
import Onboarding from './pages/onboarding.jsx'
import ResetPassword from './pages/resetPassword.jsx'
import SignUp from './pages/signUp.jsx'
import VerifyEmail from './pages/verifyEmail.jsx'
import './App.css'

const routeNames = new Set([
  '/signup',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/onboarding',
])

function currentRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return routeNames.has(path) ? path : '/signup'
}

function BrandMark() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M7 8.5A4.5 4.5 0 0 1 11.5 4h9A4.5 4.5 0 0 1 25 8.5v8a4.5 4.5 0 0 1-4.5 4.5H15l-6.5 5v-5.7A4.5 4.5 0 0 1 7 16.5v-8Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M12 12h8M12 16h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span>AI Chat<span className="brand-period">.</span></span>
    </div>
  )
}

function StoryPanel() {
  return (
    <section className="story-panel" aria-label="Welcome">
      <div className="story-top">
        <BrandMark />
        <span className="story-label">AI support, made personal</span>
      </div>

      <div className="story-content">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR ALWAYS-ON SUPPORT TEAM</div>
        <h1>Good conversations<br />start <span>right here.</span></h1>
        <p>Build a helpful AI chat experience that knows your business and feels like part of your team.</p>

        <div className="preview-card" aria-label="Example customer chat">
          <div className="preview-heading">
            <span className="preview-avatar">n</span>
            <span><strong>Your AI assistant</strong><small><i /> Online and ready to help</small></span>
            <span className="preview-menu" aria-hidden="true">•••</span>
          </div>
          <div className="preview-message">Hey there! 👋 What can I help you find today?</div>
          <div className="preview-reply">I have a question about your plans</div>
          <div className="preview-compose">Write a message... <span>↑</span></div>
        </div>
      </div>

      <div className="story-footer">
        <div className="avatar-stack" aria-hidden="true"><span>J</span><span>M</span><span>A</span><span>+</span></div>
        <span>Made for teams who care about every conversation</span>
      </div>
      <span className="decor decor-one" aria-hidden="true" />
      <span className="decor decor-two" aria-hidden="true" />
    </section>
  )
}

function App() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const navigate = useCallback((path, { replace = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(currentRoute())
  }, [])

  const rememberEmail = (email) => {
    window.sessionStorage.setItem('auth-email', email)
  }

  let page
  if (route === '/login') {
    page = <Login navigate={navigate} rememberEmail={rememberEmail} />
  } else if (route === '/verify-email') {
    page = <VerifyEmail navigate={navigate} email={window.sessionStorage.getItem('auth-email') || ''} />
  } else if (route === '/forgot-password') {
    page = <ForgotPassword navigate={navigate} />
  } else if (route === '/reset-password') {
    page = <ResetPassword navigate={navigate} />
  } else if (route === '/dashboard') {
    page = <Dashboard navigate={navigate} />
  } else if (route === '/onboarding') {
    page = <Onboarding navigate={navigate} />
  } else {
    page = <SignUp navigate={navigate} rememberEmail={rememberEmail} />
  }

  return (
    <main className="auth-page">
      <StoryPanel />
      <section className="form-panel">
        <div className="form-top-mobile"><BrandMark /></div>
        <div className="form-wrap">{page}</div>
        <div className="form-footer"><span>© 2026 AI Chat</span><span>AI support, made personal</span></div>
      </section>
    </main>
  )
}

export default App
