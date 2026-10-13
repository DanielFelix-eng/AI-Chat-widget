export async function authRequest(path, { method = 'POST', ...payload } = {}) {
  // Detect if payload is a FormData instance (for file uploads)
  const isFormData = payload instanceof FormData

  const options = {
    method,
    credentials: 'include',
    // For FormData, don't set Content-Type so the browser sets the proper boundary
    // For JSON payloads, set application/json
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
  }

  let body
  if (isFormData) {
    body = payload // Use FormData directly
  } else if (method !== 'GET') {
    body = JSON.stringify(payload)
  }

  const response = await fetch(`/api/auth/${path}`, {
    ...options,
    body,
  })
  let result = {}

  try {
    result = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('Something went wrong. Please try again.')
    }
  }

  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong. Please try again.')
  }

  return result
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}