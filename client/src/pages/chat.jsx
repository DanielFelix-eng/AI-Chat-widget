import { useEffect, useRef, useState } from 'react'
import { Bot, BookOpen, LoaderCircle, RotateCcw, Send, Sparkles } from 'lucide-react'
import './chat.css'

const DEFAULT_GREETING = 'Hi! How can I help you today?'

function Chat() {
  const [visitorId] = useState(() => window.crypto.randomUUID())
  const [assistant, setAssistant] = useState({ name: 'Support assistant', greeting: DEFAULT_GREETING })
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

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
        if (!response.ok) throw new Error(result.message || 'Could not load your assistant.')
        if (!result.company) throw new Error('Complete company onboarding before testing your assistant.')

        const config = result.company.widgetConfig || {}
        if (active) {
          setAssistant({
            name: config.botName || 'Support assistant',
            greeting: config.greeting || DEFAULT_GREETING,
          })
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load your assistant.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSubmitting])

  const resetConversation = () => {
    setMessages([])
    setInputValue('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const message = inputValue.trim()
    if (!message || isLoading || isSubmitting) return

    setError('')
    setInputValue('')
    setMessages((current) => [...current, { role: 'user', content: message }])
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/chat/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content })),
          visitorId,
        }),
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('The server returned an unreadable response.')
      }
      if (!response.ok) throw new Error(result.message || 'The assistant could not respond. Please try again.')
      if (typeof result.answer !== 'string') throw new Error('The assistant returned an invalid response.')

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: result.answer, sources: result.sources || [] },
      ])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not respond. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="test-chat">
      <header className="test-chat-heading">
        <div>
          <span className="test-chat-eyebrow"><Sparkles size={13} /> YOUR ASSISTANT, YOUR WAY</span>
          <h1>Test your assistant</h1>
          <p>Try a conversation before your customers do. Answers use your uploaded knowledge base.</p>
        </div>
        <button className="test-chat-reset" type="button" onClick={resetConversation} disabled={!messages.length && !error}>
          <RotateCcw size={14} /> New test
        </button>
      </header>

      <div className="test-chat-card">
        <div className="test-chat-card-header">
          <span className="test-chat-avatar"><Bot size={18} /></span>
          <span className="test-chat-identity">
            <strong>{assistant.name}</strong>
            <small><i /> Ready to chat</small>
          </span>
          <span className="test-chat-preview-label">PREVIEW</span>
        </div>

        <div className="test-chat-transcript" aria-live="polite">
          <div className="test-chat-welcome">
            <span className="test-chat-welcome-icon"><Sparkles size={15} /></span>
            <p>{assistant.greeting}</p>
          </div>

          {messages.map((message, index) => (
            <article className={`test-chat-message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === 'assistant' && <span className="test-chat-message-avatar"><Bot size={15} /></span>}
              <div className="test-chat-message-content">
                <p>{message.content}</p>
                {message.sources?.length > 0 && (
                  <div className="test-chat-sources">
                    <BookOpen size={12} />
                    {message.sources.map((source, sourceIndex) => (
                      <span key={`${source.source}-${sourceIndex}`}>
                        {source.source}{source.page != null ? ` · p. ${source.page}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}

          {isSubmitting && (
            <div className="test-chat-thinking"><LoaderCircle size={15} /> {assistant.name} is thinking…</div>
          )}
          {error && <p className="test-chat-error" role="alert">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        <form className="test-chat-composer" onSubmit={handleSubmit}>
          <input
            aria-label="Message your assistant"
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={isLoading ? 'Loading your assistant…' : 'Ask your assistant a question…'}
            maxLength={2000}
            disabled={isLoading || isSubmitting}
          />
          <button type="submit" aria-label="Send message" disabled={isLoading || isSubmitting || !inputValue.trim()}>
            <Send size={16} />
          </button>
        </form>
        <p className="test-chat-footnote">Your assistant answers based on your uploaded documents.</p>
      </div>
    </section>
  )
}

export default Chat
