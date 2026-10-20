import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Clock3, FileText, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react'
import { apiUrl } from '../lib/api.js'
import './knowledgebase.css'

const ACCEPTED_TYPES = '.pdf,.txt,.md'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const REFRESH_INTERVAL = 3000

async function readResponse(response) {
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(response.ok ? 'The server returned an unreadable response.' : `Request failed (${response.status}).`)
  }

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status}).`)
  }

  return result
}

function formatFileSize(size) {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function KnowledgeBase() {
  const inputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const loadDocuments = useCallback(async (signal) => {
      const response = await fetch(apiUrl('/api/documents'), {
      credentials: 'include',
      signal,
    })
    const result = await readResponse(response)
    setDocuments(result.documents)
    setError('')
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl('/api/documents'), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(readResponse)
      .then((result) => setDocuments(result.documents))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load your documents.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [loadDocuments])

  useEffect(() => {
    const hasActiveDocuments = documents.some((document) => ['pending', 'processing'].includes(document.status))
    if (!hasActiveDocuments) return undefined

    const interval = window.setInterval(() => {
      loadDocuments().catch((requestError) => {
        setError(requestError.message || 'Could not refresh document status.')
      })
    }, REFRESH_INTERVAL)

    return () => window.clearInterval(interval)
  }, [documents, loadDocuments])

  const handleFileChange = (event) => {
    setError('')
    setNotice('')
    const file = event.target.files?.[0] || null
    if (file && file.size > MAX_FILE_SIZE) {
      setError('File is too large. The maximum file size is 10 MB.')
      event.target.value = ''
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    setNotice('')
    if (!selectedFile) {
      setError('Choose a PDF, TXT, or MD file to upload.')
      return
    }

    setError('')
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
    const response = await fetch(apiUrl('/api/documents'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      await readResponse(response)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
      setNotice(`${selectedFile.name} uploaded. It will appear as ready when processing finishes.`)
      try {
        await loadDocuments()
      } catch (refreshError) {
        setError(`Upload succeeded, but the document list could not refresh: ${refreshError.message}`)
      }
    } catch (requestError) {
      setError(requestError.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="knowledge-base">
      <header className="knowledge-header">
        <div>
          <span className="knowledge-eyebrow">YOUR AI ASSISTANT</span>
          <h1>Knowledge base</h1>
          <p>Give your assistant the information it needs to help your customers.</p>
        </div>
        <span className="knowledge-count"><FileText size={15} /> {documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
      </header>

      <section className="knowledge-upload-card">
        <div className="knowledge-upload-icon"><Upload size={20} /></div>
        <h2>Add to your knowledge base</h2>
        <p>Upload a document and we’ll prepare it for your AI assistant.</p>

        <form className="knowledge-upload-form" onSubmit={handleUpload}>
          <input
            ref={inputRef}
            className="knowledge-file-input"
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            aria-label="Choose a document to upload"
            disabled={uploading}
          />
          <div className={`knowledge-dropzone${selectedFile ? ' has-file' : ''}`}>
            <button className="knowledge-dropzone-select" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <span className="knowledge-dropzone-icon"><Upload size={18} /></span>
              <span><strong>{selectedFile ? selectedFile.name : 'Click to choose a file'}</strong><small>{selectedFile ? formatFileSize(selectedFile.size) : 'PDF, TXT, or MD · up to 10 MB'}</small></span>
            </button>
            {selectedFile && <button className="knowledge-clear-file" type="button" aria-label="Remove selected file" onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}><X size={16} /></button>}
          </div>
          <button className="knowledge-upload-button" type="submit" disabled={uploading || !selectedFile}>
            {uploading ? <><LoaderCircle className="knowledge-spin" size={16} /> Uploading…</> : <><Upload size={16} /> Upload document</>}
          </button>
        </form>
        {error && <p className="knowledge-message error" role="alert"><AlertCircle size={15} /> {error}</p>}
        {notice && <p className="knowledge-message success" role="status"><Check size={15} /> {notice}</p>}
      </section>

      <section className="knowledge-documents">
        <div className="knowledge-documents-heading">
          <div><h2>Your documents</h2><p>Files your assistant can use to answer questions.</p></div>
          <button className="knowledge-refresh" type="button" aria-label="Refresh documents" onClick={() => { setLoading(true); loadDocuments().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'knowledge-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="knowledge-empty"><LoaderCircle className="knowledge-spin" size={21} /><span>Loading documents…</span></div>
        ) : documents.length === 0 ? (
          <div className="knowledge-empty">
            <span className="knowledge-empty-icon"><FileText size={20} /></span>
            <strong>No documents yet</strong>
            <span>Upload a document above to start teaching your assistant.</span>
          </div>
        ) : (
          <div className="knowledge-document-list">
            {documents.map((document) => (
              <article className="knowledge-document-row" key={document._id}>
                <span className="knowledge-document-icon"><FileText size={18} /></span>
                <span className="knowledge-document-info"><strong title={document.originalName}>{document.originalName}</strong><small>{formatFileSize(document.size)} <i /> {new Date(document.createdAt).toLocaleDateString()}</small></span>
                <span className={`knowledge-status status-${document.status}`}>
                  {document.status === 'ready' ? <Check size={13} /> : document.status === 'failed' ? <AlertCircle size={13} /> : document.status === 'processing' ? <LoaderCircle className="knowledge-spin" size={13} /> : <Clock3 size={13} />}
                  {document.status === 'ready' ? 'Ready' : document.status === 'failed' ? 'Failed' : document.status === 'processing' ? 'Processing' : 'Queued'}
                </span>
                {document.status === 'ready' && <span className="knowledge-chunk-count">{document.chunkCount} chunks</span>}
                {document.status === 'failed' && document.errorMessage && <span className="knowledge-error-detail" title={document.errorMessage}>{document.errorMessage}</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default KnowledgeBase
