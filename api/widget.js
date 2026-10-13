(() => {
  const script = document.currentScript
  const publicKey = script?.getAttribute('data-public-key')
  const apiUrl = (script?.getAttribute('data-api-url') || new URL(script.src).origin).replace(/\/+$/, '')

  if (!publicKey) {
    console.error('[AI Chat] Missing data-public-key on the widget script.')
    return
  }

  let apiOrigin
  try {
    apiOrigin = new URL(apiUrl).origin
  } catch {
    console.error('[AI Chat] data-api-url must be an absolute HTTP(S) URL.')
    return
  }
  if (!['http:', 'https:'].includes(new URL(apiOrigin).protocol)) {
    console.error('[AI Chat] data-api-url must use HTTP or HTTPS.')
    return
  }

  const host = document.createElement('div')
  host.setAttribute('data-ai-chat-widget', '')
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  const state = { history: [], config: null, open: false, sending: false }

  shadow.innerHTML = `
    <style>
      :host { all: initial; --chat-color: #65d0f4; --chat-ink: #18313b; --chat-muted: #75858d; --chat-border: #e7edef; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--chat-ink); }
      *, *::before, *::after { box-sizing: border-box; }
      .launcher { position: fixed; z-index: 2147483000; bottom: 22px; right: 22px; width: 58px; height: 58px; display: grid; place-items: center; border: 0; border-radius: 20px; color: var(--chat-ink); background: var(--chat-color); box-shadow: 0 9px 28px #18313b30; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
      .launcher:hover { transform: translateY(-2px); box-shadow: 0 13px 32px #18313b38; }
      .launcher svg { width: 25px; height: 25px; }
      .panel { position: fixed; z-index: 2147483000; right: 22px; bottom: 92px; width: min(365px, calc(100vw - 28px)); height: min(530px, calc(100dvh - 120px)); display: none; flex-direction: column; overflow: hidden; border: 1px solid var(--chat-border); border-radius: 18px; background: #fff; box-shadow: 0 18px 60px #172d3a24; }
      .panel.open { display: flex; animation: rise .2s ease both; }
      .panel.left, .launcher.left { right: auto; left: 22px; }
      @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .header { min-height: 72px; display: flex; align-items: center; gap: 11px; padding: 13px 16px; color: var(--chat-ink); background: var(--chat-color); }
      .avatar { width: 39px; height: 39px; display: grid; place-items: center; flex: 0 0 39px; border: 1px solid #ffffff70; border-radius: 13px; background: #ffffff70; }
      .avatar svg { width: 20px; height: 20px; }
      .heading { min-width: 0; display: flex; flex: 1; flex-direction: column; gap: 4px; }
      .heading strong { overflow: hidden; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .heading small { display: flex; align-items: center; gap: 5px; opacity: .72; font-size: 10px; }
      .online { width: 6px; height: 6px; border-radius: 50%; background: #15885d; }
      .close { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 9px; color: inherit; background: #ffffff66; cursor: pointer; }
      .close svg { width: 17px; height: 17px; }
      .messages { flex: 1; display: flex; flex-direction: column; gap: 11px; overflow: auto; padding: 16px 13px; background: #fbfcfd; }
      .bubble { max-width: 85%; width: fit-content; padding: 10px 12px; border-radius: 4px 13px 13px; color: #334650; background: #eef3f5; font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
      .bubble.user { align-self: flex-end; border-radius: 13px 4px 13px 13px; color: #17333e; background: color-mix(in srgb, var(--chat-color) 55%, white); }
      .bubble.error { color: #9f3737; background: #fff0ef; }
      .typing { color: var(--chat-muted); font-size: 10px; }
      .form { display: flex; align-items: center; gap: 8px; padding: 11px; border-top: 1px solid var(--chat-border); background: #fff; }
      .input { min-width: 0; height: 41px; flex: 1; padding: 0 12px; border: 1px solid var(--chat-border); border-radius: 10px; outline: none; color: var(--chat-ink); background: #fff; font: inherit; font-size: 12px; }
      .input:focus { border-color: var(--chat-color); box-shadow: 0 0 0 3px color-mix(in srgb, var(--chat-color) 30%, transparent); }
      .send { width: 40px; height: 40px; display: grid; flex: 0 0 40px; place-items: center; border: 0; border-radius: 11px; color: var(--chat-ink); background: var(--chat-color); cursor: pointer; }
      .send:disabled { opacity: .5; cursor: wait; }
      .send svg { width: 18px; height: 18px; }
      .credit { padding: 0 0 9px; color: #a0abb1; background: #fff; font-size: 9px; text-align: center; }
      .credit a { color: inherit; text-decoration: none; }
      @media (max-width: 480px) { .panel { right: 12px; bottom: 82px; width: calc(100vw - 24px); height: min(600px, calc(100dvh - 100px)); } .launcher { right: 14px; bottom: 14px; width: 54px; height: 54px; border-radius: 18px; } .panel.left { left: 12px; right: auto; } .launcher.left { left: 14px; right: auto; } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
    </style>
    <button class="launcher" type="button" aria-label="Open support chat" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
    </button>
    <section class="panel" aria-label="Customer support chat" aria-hidden="true">
      <header class="header">
        <span class="avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg></span>
        <span class="heading"><strong>Support assistant</strong><small><i class="online"></i> Online and ready to help</small></span>
        <button class="close" type="button" aria-label="Close chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg></button>
      </header>
      <div class="messages" role="log" aria-live="polite"></div>
      <form class="form"><input class="input" name="message" placeholder="Write a message…" maxlength="2000" autocomplete="off" aria-label="Your message" required><button class="send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
      <div class="credit"><a href="https://aichat.example" target="_blank" rel="noreferrer">Powered by AI Chat</a></div>
    </section>
  `

  const launcher = shadow.querySelector('.launcher')
  const panel = shadow.querySelector('.panel')
  const messages = shadow.querySelector('.messages')
  const form = shadow.querySelector('.form')
  const input = shadow.querySelector('.input')
  const sendButton = shadow.querySelector('.send')

  function addMessage(text, role, isError = false) {
    const bubble = document.createElement('div')
    bubble.className = `bubble${role === 'user' ? ' user' : ''}${isError ? ' error' : ''}`
    bubble.textContent = text
    messages.appendChild(bubble)
    messages.scrollTop = messages.scrollHeight
    return bubble
  }

  function setOpen(open) {
    state.open = open
    panel.classList.toggle('open', open)
    panel.setAttribute('aria-hidden', String(!open))
    launcher.setAttribute('aria-expanded', String(open))
    launcher.setAttribute('aria-label', open ? 'Close support chat' : 'Open support chat')
    if (open) input.focus()
  }

  async function sendMessage(event) {
    event.preventDefault()
    const message = input.value.trim()
    if (!message || state.sending) return

    input.value = ''
    state.sending = true
    sendButton.disabled = true
    addMessage(message, 'user')
    const typing = document.createElement('span')
    typing.className = 'typing'
    typing.textContent = `${state.config.botName} is typing…`
    messages.appendChild(typing)

    try {
      const response = await fetch(`${apiUrl}/api/widget/${encodeURIComponent(publicKey)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: state.history }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'The assistant could not reply.')

      state.history.push({ role: 'user', content: message }, { role: 'assistant', content: result.answer })
      addMessage(result.answer, 'assistant')
    } catch (error) {
      addMessage(error.message || 'Could not send your message. Please try again.', 'assistant', true)
    } finally {
      typing.remove()
      state.sending = false
      sendButton.disabled = false
      input.focus()
    }
  }

  launcher.addEventListener('click', () => setOpen(!state.open))
  shadow.querySelector('.close').addEventListener('click', () => setOpen(false))
  form.addEventListener('submit', sendMessage)

  fetch(`${apiUrl}/api/widget/${encodeURIComponent(publicKey)}/config`)
    .then(async (response) => {
      const config = await response.json()
      if (!response.ok) throw new Error(config.message || 'Widget configuration could not be loaded.')
      return config
    })
    .then((config) => {
      state.config = config
      const color = /^#[0-9a-f]{6}$/i.test(config.primaryColor) ? config.primaryColor : '#65d0f4'
      shadow.host.style.setProperty('--chat-color', color)
      shadow.querySelector('.heading strong').textContent = config.botName
      shadow.querySelector('.heading small').lastChild.textContent = ' Online and ready to help'
      const isLeft = config.position === 'bottom-left'
      launcher.classList.toggle('left', isLeft)
      panel.classList.toggle('left', isLeft)
      addMessage(config.greeting, 'assistant')
    })
    .catch((error) => {
      console.error('[AI Chat] Widget could not be initialized:', error)
      host.remove()
    })
})()
