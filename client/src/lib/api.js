export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

export function apiUrl(path) {
  // Always return relative paths: proxied by Vite dev server or Netlify edge to the backend.
  // This avoids CORS issues when frontend and backend are on different domains.
  return path
}
