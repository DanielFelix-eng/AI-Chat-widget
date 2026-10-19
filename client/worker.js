const isApiRequest = (pathname) => pathname === '/api' || pathname.startsWith('/api/')

const isWidgetRequest = (pathname) =>
  pathname === '/widget.js' ||
  pathname === '/api/widget' ||
  pathname.startsWith('/api/widget/')

function configurationError(message) {
  return Response.json({ message }, { status: 500 })
}

async function proxyApiRequest(request, env) {
  const configuredApiUrl = env.SUGA_API_URL || env.VITE_API_URL
  if (!configuredApiUrl) {
    return configurationError('SUGA_API_URL is not configured for this deployment.')
  }

  let apiOrigin
  try {
    apiOrigin = new URL(configuredApiUrl)
  } catch {
    return configurationError('SUGA_API_URL must be a valid HTTP or HTTPS origin.')
  }

  if (
    !['http:', 'https:'].includes(apiOrigin.protocol) ||
    apiOrigin.pathname !== '/' ||
    apiOrigin.search ||
    apiOrigin.hash
  ) {
    return configurationError('SUGA_API_URL must be a valid HTTP or HTTPS origin.')
  }

  const incomingUrl = new URL(request.url)
  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiOrigin.origin)
  const upstreamRequest = new Request(upstreamUrl, request)

  if (isWidgetRequest(incomingUrl.pathname)) {
    return fetch(upstreamRequest)
  }

  const headers = new Headers(upstreamRequest.headers)
  headers.delete('origin')
  return fetch(new Request(upstreamRequest, { headers }))
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (isApiRequest(pathname) || pathname === '/widget.js') {
      return proxyApiRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
