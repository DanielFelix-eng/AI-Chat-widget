# AI-Chat-widget
# AI Chat Widget
link : www.jardini.xyz

An embeddable, RAG-powered AI chat widget for customer support. Upload your documents, copy one script tag, and your website gets an assistant that answers questions from **your** knowledge base, not generic LLM guesses.


---

## Features

- **Drop-in embed**: one `<script>` tag, works on any website
- **Answers from your content**: PDF ingestion, chunking, embeddings, vector search, grounded LLM answers
- **Per-widget knowledge isolation**: every widget only searches its own documents
- **Real-time chat** over Socket.IO with streaming responses
- **Multi-tenant**: organizations, owner/admin/member roles, invite flow
- **Customizable**: brand color, title, greeting message, position
- **Subscriptions & billing** via Paystack
- **Conversation history** and customer records in the dashboard

---

## How it works

```
PDF upload ──► text extraction ──► chunking ──► embeddings (Voyage AI)
                                                      │
                                                      ▼
                                       MongoDB Atlas Vector Search
                                                      ▲
Visitor question ─► embed query ─► top-k chunks (filtered by widgetId)
                                                      │
                                                      ▼
                                   LLM prompt (context + question)
                                                      │
                                                      ▼
                                        Streamed answer to widget
```

1. An admin uploads documents in the dashboard.
2. The backend extracts text, splits it into chunks, and generates embeddings.
3. Chunks are stored in MongoDB Atlas with `organizationId` and `widgetId`.
4. When a visitor asks a question, the query is embedded and matched **only** against that widget's chunks.
5. The top matches are passed to the LLM as context, and the answer streams back over WebSocket.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend (dashboard) | React, Vite, Tailwind CSS, Redux |
| Widget | Vanilla JS / React bundle served as a single script |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas (data + Vector Search) |
| Embeddings | Voyage AI |
| LLM | OpenAI-compatible API |
| Payments | Paystack |
| Email | Brevo |
| Hosting | Cloudflare Pages (frontend), `<backend-host>` (API) |

---

## Quick start: embed the widget

Add this before the closing `</body>` tag of your site:

```html
<script
  src="https://<your-cdn-or-api>/widget.js"
  data-widget-id="YOUR_WIDGET_ID"
  async
></script>
```

### Configuration options

| Attribute | Description | Default |
|---|---|---|
| `data-widget-id` | **Required.** Your widget's ID from the dashboard | n/a |
| `data-color` | Primary brand color | `#4f46e5` |
| `data-position` | `bottom-right` or `bottom-left` | `bottom-right` |
| `data-title` | Header title | `Chat with us` |
| `data-greeting` | First message shown to visitors | `Hi! How can I help?` |

---

## Local development

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster with a Vector Search index
- Voyage AI API key
- OpenAI-compatible LLM API key

### Setup

```bash
git clone https://github.com/DanielFelix-eng/<repo-name>.git
cd <repo-name>

# backend
cd server
npm install
cp .env.example .env
npm run dev

# frontend (new terminal)
cd client
npm install
cp .env.example .env
npm run dev
```

### Environment variables

**Server (`server/.env`)**

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173

# AI
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
VOYAGE_API_KEY=

# Billing
PAYSTACK_SECRET_KEY=

# Email
BREVO_API_KEY=
```

**Client (`client/.env`)**

```env
VITE_API_URL=http://localhost:5000
```

### Atlas Vector Search index

Create an index (e.g. `chunk_vector_index`) on the chunks collection:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
    { "type": "filter", "path": "widgetId" },
    { "type": "filter", "path": "organizationId" }
  ]
}
```

> Set `numDimensions` to match your Voyage model's output size.

---

## Project structure

```
.
├── client/            # Dashboard (Vite + React + Tailwind)
├── server/
│   ├── models/        # Mongoose schemas
│   ├── routes/
│   ├── controllers/
│   ├── services/      # ingestion, embeddings, retrieval, LLM
│   ├── sockets/       # Socket.IO handlers
│   └── middleware/    # auth, tenancy, error handling
└── widget/            # Embeddable widget source
```

---

## API overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/widgets` | Create a widget |
| `POST` | `/api/widgets/:id/documents` | Upload a document for ingestion |
| `GET` | `/api/widgets/:id/documents` | List documents and ingestion status |
| `DELETE` | `/api/widgets/:id/documents/:docId` | Remove a document and its chunks |
| `GET` | `/api/conversations` | List conversations (cursor-paginated) |

Realtime events: `message:send`, `message:stream`, `message:done`.

---

## Design principles

- **Multi-tenancy everywhere**: `organizationId` on every document; cross-tenant access returns `404`
- **Cursor-based pagination** on all list endpoints
- **Soft delete** for recoverable records
- **Atomic transactions** for multi-document writes
- **Scoped retrieval**: vector queries are always filtered by `widgetId`

---

## Deployment

1. **Database:** MongoDB Atlas, with the vector index created
2. **Backend:** deploy `server/` and set the environment variables above
3. **Frontend:** deploy `client/` to Cloudflare Pages (`npm run build`, output `dist`)
4. **Widget:** host the built `widget.js` on your CDN or serve it from the API
5. **Paystack:** set the webhook URL to `https://<api>/api/billing/webhook`

---

## Roadmap

- [ ] Background job queue for ingestion
- [ ] Support for URLs, DOCX, and plain-text sources
- [ ] Human handoff to live agents
- [ ] Analytics (top questions, unanswered queries)
- [ ] Multi-language support

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

## License

MIT © Daniel Felix
