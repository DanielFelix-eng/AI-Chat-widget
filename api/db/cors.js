import cors from "cors";

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...configuredOrigins,
    process.env.RENDER_EXTERNAL_URL,
    process.env.CLIENT_URL,
  ].filter(Boolean).map((origin) => origin.replace(/\/$/, ""))),
];

// Strict policy for your own dashboard
export const dashboardCors = cors({
  origin(origin, callback) {
    // No Origin header = curl, Postman, server-to-server: allow
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error("Origin not allowed by CORS");
    err.status = 403;
    return callback(err);
  },
  credentials: true, // needed only if you use cookies for auth
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // browsers cache the preflight for 24h
});

// Open policy for the embeddable widget (no cookies, so any origin is safe at the CORS layer)
export const widgetCors = cors({
  origin: true,          // reflect the caller's origin
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Widget-Key"],
  maxAge: 86400,
});

export { allowedOrigins };