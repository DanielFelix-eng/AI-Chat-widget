import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { initializeAuth } from './store/authSlice.js'
import Dashboard from './pages/dashboard.jsx'
import ForgotPassword from './pages/forgotPassword.jsx'
import Login from './pages/login.jsx'
import Onboarding from './pages/onboarding.jsx'
import ResetPassword from './pages/resetPassword.jsx'
import SignUp from './pages/signUp.jsx'
import VerifyEmail from './pages/verifyEmail.jsx'
import './App.css'

function AuthCheckFallback({ error }) {
  const dispatch = useDispatch()

  if (error) {
    return (
      <main className="route-guard">
        <section className="route-guard-card" role="alert">
          <h1>Could not verify your session</h1>
          <p>{error}</p>
          <div className="route-guard-actions">
            <button type="button" onClick={() => dispatch(initializeAuth())}>Try again</button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="route-guard" role="status" aria-live="polite">
      <span className="route-guard-spinner" aria-hidden="true" />
      <span>Verifying your session…</span>
    </main>
  )
}

function ProtectRoute({ children, requireVerified = true }) {
  const { status, user, error } = useSelector((state) => state.auth)

  if (status === 'idle' || status === 'checking') return <AuthCheckFallback />
  if (status === 'error') return <AuthCheckFallback error={error} />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  if (requireVerified && !user?.isVerified) return <Navigate to="/verify-email" replace />
  if (!requireVerified && user?.isVerified) return <Navigate to="/dashboard" replace />

  return children
}

function RedirectAuthenticatedUser({ children }) {
  const { status, user, error } = useSelector((state) => state.auth)

  if (status === 'idle' || status === 'checking') return <AuthCheckFallback />
  if (status === 'error') return <AuthCheckFallback error={error} />
  if (status === 'authenticated') {
    return <Navigate to={user?.isVerified ? '/dashboard' : '/verify-email'} replace />
  }

  return children
}

function PageRoute({ component: Page, ...props }) {
  const navigate = useNavigate()
  return <Page {...props} navigate={navigate} />
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

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <StoryPanel />
      <section className="form-panel">
        <div className="form-top-mobile"><BrandMark /></div>
        <div className="form-wrap">{children}</div>
        <div className="form-footer"><span>© 2026 AI Chat</span><span>AI support, made personal</span></div>
      </section>
    </main>
  )
}

function rememberEmail(email) {
  window.sessionStorage.setItem('auth-email', email)
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/signup"
        element={<RedirectAuthenticatedUser><AuthLayout><PageRoute component={SignUp} rememberEmail={rememberEmail} /></AuthLayout></RedirectAuthenticatedUser>}
      />
      <Route
        path="/login"
        element={<RedirectAuthenticatedUser><AuthLayout><PageRoute component={Login} rememberEmail={rememberEmail} /></AuthLayout></RedirectAuthenticatedUser>}
      />
      <Route
        path="/verify-email"
        element={<ProtectRoute requireVerified={false}><AuthLayout><PageRoute component={VerifyEmail} email={window.sessionStorage.getItem('auth-email') || ''} /></AuthLayout></ProtectRoute>}
      />
      <Route path="/forgot-password" element={<AuthLayout><PageRoute component={ForgotPassword} /></AuthLayout>} />
      <Route path="/reset-password" element={<AuthLayout><PageRoute component={ResetPassword} /></AuthLayout>} />
      <Route path="/onboarding" element={<ProtectRoute><AuthLayout><PageRoute component={Onboarding} /></AuthLayout></ProtectRoute>} />
      <Route path="/dashboard" element={<ProtectRoute><PageRoute component={Dashboard} /></ProtectRoute>} />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}

export default App
