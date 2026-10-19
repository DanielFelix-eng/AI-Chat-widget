import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { signal }) => {
    try {
      const response = await fetch('/api/auth/verifyToken', {
        credentials: 'include',
        signal,
      })

      if (response.status === 401) return null

      let result
      try {
        result = await response.json()
      } catch {
        return null
      }

      if (!response.ok || !result?.user) {
        return null
      }

      return result.user
    } catch {
      return null
    }
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
