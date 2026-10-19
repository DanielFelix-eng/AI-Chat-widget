import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { signal, rejectWithValue }) => {
    const response = await fetch('/api/auth/verifyToken', {
      credentials: 'include',
      signal,
    })

    if (response.status === 401) return null

    let result
    try {
      result = await response.json()
    } catch {
      if (response.status >= 500) {
        return rejectWithValue(
          `The authentication service is unavailable (HTTP ${response.status}). Check the Suga deployment and confirm its public endpoint targets port 8000.`,
        )
      }
      return rejectWithValue(`The authentication server returned an unreadable response (HTTP ${response.status}).`)
    }

    if (!response.ok) {
      return rejectWithValue(result.message || 'Could not verify your session. Please try again.')
    }

    if (!result.user) {
      return rejectWithValue('The server did not return the authenticated user.')
    }

    return result.user
  },
  {
    condition: (_, { getState }) => {
      const status = getState().auth.status
      return status !== 'checking'
    },
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    status: 'idle',
    user: null,
    error: null,
  },
  reducers: {
    setCredentials(state, action) {
      state.status = 'authenticated'
      state.user = action.payload
      state.error = null
    },
    clearCredentials(state) {
      state.status = 'unauthenticated'
      state.user = null
      state.error = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = 'checking'
        state.error = null
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.status = action.payload ? 'authenticated' : 'unauthenticated'
        state.user = action.payload
        state.error = null
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) {
          state.status = 'idle'
          return
        }
        state.status = 'error'
        state.user = null
        state.error = action.payload || action.error.message || 'Could not verify your session.'
      })
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
