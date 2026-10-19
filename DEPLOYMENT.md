# Deployment

## Cloudflare frontend

Deploy the React frontend as a Cloudflare Worker with static assets, keeping the API on Suga:

1. Deploy from the `client` directory using the settings in `wrangler.jsonc`. Build the frontend with `npm run build`, then deploy the Worker with `wrangler deploy`.
2. Add `VITE_API_URL` as a Worker runtime variable for production (and preview/staging environments if used), with the base HTTPS origin of the deployed Suga service (for example, `https://your-api-host`). Do not add a path such as `/api` or a trailing route.
3. Set the Suga backend's `CLIENT_URL` to the frontend's deployed HTTPS origin (for example, `https://your-project.workers.dev`). If using a custom frontend domain, use that canonical origin instead.

`client/worker.js` proxies `/api/*` and `/widget.js` to Suga before static asset handling. The browser therefore uses the Worker origin for API requests and auth cookies; the dashboard does not need browser CORS access to the Suga hostname. Widget API requests retain their origin so the backend's widget CORS policy can respond to embeds on other sites. Static assets use the SPA fallback for frontend routes.

Set `VITE_API_URL` as a Cloudflare Worker runtime variable. Do not set it as a Vite build variable. The Worker reads it at request time, so a Suga URL change does not require rebuilding the frontend.

## Suga backend deployment

1. Connect this GitHub repository to Suga and create a project with a Node service using the repository root as its build directory. Suga detects Node from the root `package.json`; its build runs `npm run build` and its start command is `npm start`.
2. Set the service's `PORT` to `5000`, declare port `5000` for private networking, and expose that port through a public HTTPS endpoint. The server binds to `0.0.0.0` and serves the API, built Vite client, and `/widget.js` from the same service.
3. Set the runtime environment variables listed below in Suga. Mark credentials and keys as sensitive. Set `CLIENT_URL` to the Cloudflare frontend's canonical HTTPS origin; this is used for account email links and is included in the backend's allowed CORS origins.
4. If the service needs to retain uploaded documents across redeploys, attach a persistent volume mounted at `/data` and set `UPLOAD_DIR=/data`.
5. After the first deploy, configure the Paystack webhook URL as `https://<your-suga-host>/api/webhooks/paystack`.

The service health endpoint is `/healthz`.

`VITE_API_URL` defaults to `http://127.0.0.1:5000` for the Vite development proxy. In the deployed Cloudflare Worker, set it as a runtime variable to the Suga API origin. `VITE_WIDGET_API_URL` is an optional **build-time** override for the URL included in the embeddable widget. Leave it unset to use the Cloudflare Worker origin and its `/widget.js` and `/api/widget/*` proxy routes.

## Runtime environment variables

Set these on the Suga service:

- `NODE_ENV=production`, `PORT=5000`, and `CLIENT_URL=https://<your-cloudflare-host>`.
- `MONGO_URI`: connection string for a MongoDB deployment accessible to Suga. Ensure network access permits connections from Suga.
- `JWT_SECRET`: use a long, randomly generated value.
- `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`: credentials and settings for the OpenAI-compatible chat provider.
- `VOYAGE_API_KEY`, `VOYAGE_MODEL`, and `EMBEDDING_DIMENSIONS`: embedding provider configuration matching the vector index.
- `PAYSTACK_SECRET_KEY`: key for the selected Paystack test/live environment.
- `BREVO_API_KEY` and `EMAIL_FROM_ADDRESS`: transactional email credentials and verified sender address.
- `EMAIL_FROM_NAME`: optional sender display name; defaults to `My App`.

`MONGO_DB_NAME` defaults to `ai-chat-widget`; `VECTOR_INDEX_NAME` defaults to `chunks`. The Cloudflare proxy removes the browser `Origin` header from dashboard API requests, so `CORS_ORIGINS` is not needed for the proxied dashboard. Keep `CLIENT_URL` set to the canonical frontend origin for account email links.

## Uploaded files

Uploaded knowledge-base files are stored under `uploads/` by default. Container filesystems are not a durable storage location, so mount persistent storage and set `UPLOAD_DIR` to its mount path before relying on production uploads, or migrate uploads to durable object storage.

## Render deployment

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select the repository. Render reads the root `render.yaml`.
3. Provide the requested environment values in Render. Do not commit `.env` or paste secrets into source files.
4. Deploy. Render builds the Vite client and serves it, the API, and `/widget.js` from the same web service.
5. After the first deploy, configure the Paystack webhook URL as `https://<your-render-service>.onrender.com/api/webhooks/paystack`.

Render's `RENDER_EXTERNAL_URL` is used as a fallback for account email links. `CORS_ORIGINS` is optional for the single-origin deployment; add comma-separated full origins only if a separate dashboard domain should be allowed.
