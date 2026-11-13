import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle, MessageCircle, MessagesSquare, Search } from 'lucide-react'
import { apiUrl } from '../lib/api.js'
import './conversations.css'

const EMPTY_MESSAGES = []

async function readResponse(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The server returned an unreadable response.')
  }
  if (!response.ok) throw new Error(result.message || 'Could not load conversations.')
  return result
}

function formatConversationTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Conversations({ selectedConversationId, onSelectConversation }) {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(selectedConversationId || '')
  const [messageState, setMessageState] = useState({ conversationId: '', status: 'idle', messages: [], error: '' })
  const [query, setQuery] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const threadEndRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/chat/conversations'), { credentials: 'include', signal: controller.signal })
      .then(readResponse)
      .then((result) => {
        if (controller.signal.aborted) return
        setConversations(result.conversations)
        setListError('')
        setActiveId((current) => current && result.conversations.some(({ _id }) => _id === current)
          ? current
          : result.conversations[0]?._id || '')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setListError(error.message || 'Could not load conversations.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!activeId) return undefined

    const controller = new AbortController()
    fetch(apiUrl(`/api/chat/conversations/${encodeURIComponent(activeId)}`), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(readResponse)
      .then((result) => {
        if (!controller.signal.aborted) {
          setMessageState({
            conversationId: activeId,
            status: 'loaded',
            messages: result.conversation.messages,
            error: '',
          })
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setMessageState({
            conversationId: activeId,
            status: 'error',
            messages: [],
            error: error.message || 'Could not load this conversation.',
          })
        }
      })

    return () => controller.abort()
  }, [activeId])

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return conversations
    return conversations.filter((conversation) =>
      `${conversation.latestMessage} ${conversation.visitorEmail || ''}`.toLowerCase().includes(normalizedQuery),
    )
  }, [conversations, query])
  const activeConversation = conversations.find(({ _id }) => _id === activeId)
  const currentMessageState = messageState.conversationId === activeId ? messageState : null
  const loadingMessages = Boolean(activeId && (!currentMessageState || currentMessageState.status === 'loading'))
  const messagesError = currentMessageState?.error || ''
  const messages = currentMessageState?.messages ?? EMPTY_MESSAGES

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeId, messages])

  const selectConversation = (id) => {
    setActiveId(id)
    onSelectConversation?.(id)
  }

  return (
    <section className="conversation-inbox">
      <header className="inbox-heading">
        <div>
          <span className="inbox-eyebrow"><MessagesSquare size={13} /> CUSTOMER SUPPORT</span>
          <h1>Conversations</h1>
          <p>Review and search the latest 100 customer chats with your assistant.</p>
        </div>
        <span className="inbox-count">{conversations.length} latest</span>
      </header>

      <div className="inbox-layout">
        <section className="inbox-list-panel" aria-label="Conversation list">
          <label className="inbox-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages or email" aria-label="Search conversations" />
          </label>

          {loadingList ? (
            <div className="inbox-state" role="status"><LoaderCircle className="inbox-spin" size={19} /> Loading conversations…</div>
          ) : listError ? (
            <div className="inbox-state error" role="alert"><AlertCircle size={17} /> {listError}</div>
          ) : visibleConversations.length ? (
            <div className="inbox-list">
              {visibleConversations.map((conversation) => (
                <button
                  type="button"
                  className={`inbox-row${activeId === conversation._id ? ' active' : ''}`}
                  key={conversation._id}
                  onClick={() => selectConversation(conversation._id)}
                  aria-pressed={activeId === conversation._id}
                >
                  <span className="inbox-avatar"><MessageCircle size={17} /></span>
                  <span className="inbox-row-copy">
                    <strong>{conversation.visitorEmail || 'Website visitor'}</strong>
                    <span>{conversation.latestMessage}</span>
                    <small>{formatConversationTime(conversation.lastMessageAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="inbox-state">
              <MessagesSquare size={20} />
              <strong>{query ? 'No matching conversations' : 'No conversations yet'}</strong>
              <span>{query ? 'Try another search.' : 'Conversations appear here when visitors message your website assistant.'}</span>
            </div>
          )}
        </section>

        <section className="inbox-thread-panel" aria-label="Conversation transcript">
          {activeConversation ? (
            <>
              <header className="inbox-thread-header">
                <span className="inbox-avatar"><MessageCircle size={17} /></span>
                <span><strong>{activeConversation.visitorEmail || 'Website visitor'}</strong><small>Started {formatConversationTime(activeConversation.lastMessageAt)}</small></span>
                <span className={`inbox-status ${activeConversation.status === 'closed' ? 'closed' : ''}`}>{activeConversation.status || 'open'}</span>
              </header>
              {loadingMessages ? (
                <div className="inbox-state" role="status"><LoaderCircle className="inbox-spin" size={19} /> Loading messages…</div>
              ) : messagesError ? (
                <div className="inbox-state error" role="alert"><AlertCircle size={17} /> {messagesError}</div>
              ) : (
                <div className="inbox-thread" aria-live="polite">
                  {messages.map((message, index) => (
                    <article className={`inbox-message ${message.role}`} key={`${message._id || message.createdAt}-${index}`}>
                      <p>{message.content}</p>
                      <time dateTime={message.createdAt}>{formatConversationTime(message.createdAt)}</time>
                    </article>
                  ))}
                  <div ref={threadEndRef} />
                </div>
              )}
              <p className="inbox-readonly-note">Conversation history is read-only. Replying or assigning chats isn’t available yet.</p>
            </>
          ) : (
            <div className="inbox-state">
              <MessageCircle size={22} />
              <strong>Select a conversation</strong>
              <span>Choose a customer chat to view its full transcript.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default Conversations
