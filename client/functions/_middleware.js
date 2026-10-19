const isApiRequest = (pathname) => pathname === '/api' || pathname.startsWith('/api/')

const isWidgetRequest = (pathname) =>
  pathname === '/widget.js' ||
  pathname === '/api/widget' ||
  pathname.startsWith('/api/widget/')

export async function onRequest({ request, env, next }) {
  const incomingUrl = new URL(request.url)
  if (!isApiRequest(incomingUrl.pathname) && incomingUrl.pathname !== '/widget.js') {
    return next()
  }

  if (!env.VITE_API_URL) {
    return Response.json({ message: 'VITE_API_URL is not configured for this deployment.' }, { status: 500 })
  }

  let apiOrigin
  try {
    apiOrigin = new URL(env.VITE_API_URL)
  } catch {
    return Response.json({ message: 'VITE_API_URL must be a valid HTTP or HTTPS URL.' }, { status: 500 })
  }

  if (!['http:', 'https:'].includes(apiOrigin.protocol)) {
    return Response.json({ message: 'VITE_API_URL must be a valid HTTP or HTTPS URL.' }, { status: 500 })
  }

  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiOrigin.origin)
  const proxyRequest = new Request(upstreamUrl, request)

  if (!isWidgetRequest(incomingUrl.pathname)) {
    const headers = new Headers(proxyRequest.headers)
    headers.delete('origin')
    return fetch(new Request(proxyRequest, { headers }))
  }

  return fetch(proxyRequest)
}
