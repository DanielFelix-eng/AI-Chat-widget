import { useEffect, useMemo, useState } from 'react'
import { Bot, Check, Copy, ExternalLink, LoaderCircle, MessageCircle, Save, ShieldCheck, Sparkles } from 'lucide-react'
import './assistantSettings.css'

const DEFAULT_SETTINGS = {
  botName: 'Support assistant',
  greeting: 'Hi! How can I help you today?',
  primaryColor: '#65D0F4',
  position: 'bottom-right',
  enabled: true,
  allowedDomains: [],
}

function parseDomains(value) {
  return value.split(/[\n,]+/).map((domain) => domain.trim()).filter(Boolean)
}

function AssistantSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [company, setCompany] = useState(null)
  const [domainsText, setDomainsText] = useState('')
  const defaultApiUrl = import.meta.env.VITE_WIDGET_API_URL ||
    (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin)
  const [apiUrl, setApiUrl] = useState(defaultApiUrl)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/company/me', { credentials: 'include' })
      .then(async (response) => {
        let result
        try {
          result = await response.json()
        } catch {
          throw new Error('The server returned an unreadable response.')
        }
        if (!response.ok) throw new Error(result.message || 'Could not load your company settings.')
        if (!result.company) throw new Error('Complete company onboarding before configuring the assistant.')
        if (active) {
          const config = result.company.widgetConfig || {}
          const allowedDomains = result.company.allowedDomains || []
          setCompany(result.company)
          setSettings({
            botName: config.botName || DEFAULT_SETTINGS.botName,
            greeting: config.greeting || DEFAULT_SETTINGS.greeting,
            primaryColor: config.primaryColor || DEFAULT_SETTINGS.primaryColor,
            position: config.position || DEFAULT_SETTINGS.position,
            enabled: config.enabled !== false,
            allowedDomains,
          })
          setDomainsText(allowedDomains.join('\n'))
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load your company settings.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const installCode = useMemo(() => {
    if (!company?.widgetPublicKey) return ''
    let parsedApiUrl
    try {
      parsedApiUrl = new URL(apiUrl.trim())
    } catch {
      return ''
    }
    if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) return ''
    const base = parsedApiUrl.origin
    return `<script src="${base}/widget.js" data-api-url="${base}" data-public-key="${company.widgetPublicKey}" async></script>`
  }, [apiUrl, company])

  const update = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setNotice('')
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const response = await fetch('/api/company/widget-config', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          allowedDomains: parseDomains(domainsText),
        }),
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an unreadable response.')
      }
      if (!response.ok) throw new Error(result.message || 'Could not save assistant settings.')
      setCompany(result.company)
      setSettings((current) => ({ ...current, allowedDomains: result.company.allowedDomains }))
      setDomainsText(result.company.allowedDomains.join('\n'))
      setNotice('Assistant and widget settings saved.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save assistant settings.')
    } finally {
      setSaving(false)
    }
  }

  const copyInstallCode = async () => {
    try {
      await navigator.clipboard.writeText(installCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Clipboard access is unavailable. Select and copy the install code manually.')
    }
  }

  if (loading) {
    return <div className="assistant-settings-loading"><LoaderCircle className="assistant-spin" size={20} /> Loading assistant settings…</div>
  }

  return (
    <section className="assistant-settings">
      <header className="assistant-settings-heading">
        <div>
          <span className="assistant-settings-eyebrow">PERSONALIZE YOUR SUPPORT</span>
          <h1>AI assistant</h1>
          <p>Shape how your assistant looks, welcomes visitors, and appears on your website.</p>
        </div>
        <span className={`assistant-enabled-pill${settings.enabled ? '' : ' disabled'}`}><i />{settings.enabled ? 'Widget enabled' : 'Widget paused'}</span>
      </header>

      <form className="assistant-settings-grid" onSubmit={saveSettings}>
        <div className="assistant-settings-left">
          <section className="assistant-settings-card">
            <div className="assistant-card-heading"><span className="assistant-card-icon"><Bot size={17} /></span><span><strong>Assistant identity</strong><small>Give your chat a name and a friendly first message.</small></span></div>
            <label className="assistant-field"><span>Assistant name</span><input type="text" value={settings.botName} onChange={(event) => update('botName', event.target.value)} minLength={2} maxLength={50} required /></label>
            <label className="assistant-field"><span>Welcome message</span><textarea value={settings.greeting} onChange={(event) => update('greeting', event.target.value)} rows={3} maxLength={180} required /><small className="assistant-character-count">{settings.greeting.length}/180</small></label>
          </section>

          <section className="assistant-settings-card">
            <div className="assistant-card-heading"><span className="assistant-card-icon"><Sparkles size={17} /></span><span><strong>Widget appearance</strong><small>Match the chat launcher to your website.</small></span></div>
            <label className="assistant-field"><span>Brand color</span><span className="assistant-color-picker"><input type="color" value={settings.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} /><span>{settings.primaryColor.toUpperCase()}</span></span></label>
            <fieldset className="assistant-position-field"><legend>Launcher position</legend><div className="assistant-position-options">
              {['bottom-right', 'bottom-left'].map((position) => <button className={`assistant-position-option${settings.position === position ? ' selected' : ''}`} key={position} type="button" aria-pressed={settings.position === position} onClick={() => update('position', position)}><span className={`position-demo ${position}`}><i /></span><span>{position === 'bottom-right' ? 'Bottom right' : 'Bottom left'}</span>{settings.position === position && <Check size={14} />}</button>)}
            </div></fieldset>
            <label className="assistant-toggle"><span><strong>Enable website widget</strong><small>Visitors can open and chat with your assistant.</small></span><input type="checkbox" checked={settings.enabled} onChange={(event) => update('enabled', event.target.checked)} /><i /></label>
          </section>

          <section className="assistant-settings-card">
            <div className="assistant-card-heading"><span className="assistant-card-icon"><ShieldCheck size={17} /></span><span><strong>Allowed websites</strong><small>Only these website domains can load your widget.</small></span></div>
            <label className="assistant-field"><span>Website domains</span><textarea value={domainsText} onChange={(event) => { setDomainsText(event.target.value); setNotice('') }} rows={3} placeholder={'example.com\nshop.example.com'} required /><small>Enter hostnames only, one per line. Do not include https:// or a path.</small></label>
          </section>

          {error && <p className="assistant-alert error" role="alert">{error}</p>}
          {notice && <p className="assistant-alert success" role="status"><Check size={15} />{notice}</p>}
          <button className="assistant-save-button" type="submit" disabled={saving || loading}>{saving ? <><LoaderCircle className="assistant-spin" size={16} /> Saving…</> : <><Save size={16} /> Save assistant settings</>}</button>
        </div>

        <aside className="assistant-settings-right">
          <section className="assistant-settings-card preview-settings-card">
            <div className="assistant-card-heading"><span className="assistant-card-icon"><MessageCircle size={17} /></span><span><strong>Live preview</strong><small>A preview of how the widget will appear.</small></span></div>
            <div className="site-preview">
              <div className="site-preview-browser"><i /><i /><i /><span>{settings.allowedDomains[0] || 'your-website.com'}</span></div>
              <div className="site-preview-content" style={{ '--preview-color': settings.primaryColor }}><span className="site-preview-logo">{(company?.name || 'Your brand').slice(0, 1).toUpperCase()}</span><strong>{company?.name || 'Your company'}</strong><div /><div /><div className="short" />
                <div className={`widget-preview${settings.position === 'bottom-left' ? ' left' : ''}`}>
                  <div className="widget-preview-window"><div className="widget-preview-header"><span className="widget-preview-avatar"><Sparkles size={14} /></span><span><strong>{settings.botName}</strong><small><i /> Online</small></span></div><p>{settings.greeting}</p><span className="widget-preview-input">Write a message…</span></div>
                  <span className="widget-preview-launcher"><MessageCircle size={19} /></span>
                </div>
              </div>
            </div>
          </section>

          <section className="assistant-settings-card install-card">
            <div className="assistant-card-heading"><span className="assistant-card-icon"><ExternalLink size={17} /></span><span><strong>Install on your website</strong><small>Add this script to your website once.</small></span></div>
            <label className="assistant-field"><span>API server URL</span><input type="url" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} required /><small>The publicly reachable URL of your AI Chat API server.</small></label>
            <div className="install-code-wrap"><pre><code>{installCode || 'Save your company workspace to generate your install code.'}</code></pre><button type="button" onClick={copyInstallCode} disabled={!installCode} aria-label="Copy website install code">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</button></div>
            <ol className="install-instructions"><li>Save your assistant settings and copy the script above.</li><li>Paste it before <code>&lt;/body&gt;</code> on your website.</li><li>Publish your website. The chat button will appear in the chosen corner.</li></ol>
            <p className="install-note"><ShieldCheck size={14} /> Your public key identifies the widget; it does not expose your account password or AI provider key. Protect access by allowing only your own domains above.</p>
          </section>
        </aside>
      </form>
    </section>
  )
}

export default AssistantSettings
