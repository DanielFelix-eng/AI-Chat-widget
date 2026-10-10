export async function authRequest(path, { method = 'POST', ...payload } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }

  if (method !== 'GET') {
    options.body = JSON.stringify(payload)
  }

  const response = await fetch(`/api/auth/${path}`, options)
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
