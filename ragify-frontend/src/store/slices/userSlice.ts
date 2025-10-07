import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from 'firebase/auth'

// Define the user state interface
export interface UserState {
  currentUser: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Define the initial state
const initialState: UserState = {
  currentUser: null,
  loading: true,
  error: null,
  isAuthenticated: false,
}

// Create the user slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    // Set user when authentication succeeds
    setUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload
      state.isAuthenticated = !!action.payload
      state.loading = false
      state.error = null
    },
    
    // Clear user when logging out
    clearUser: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.loading = false
      state.error = null
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null
    },
    
    // Update user profile
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload }
      }
    },
  },
})

// Export actions
export const {
  setLoading,
  setUser,
  clearUser,
  setError,
  clearError,
  updateUserProfile,
} = userSlice.actions

// Export selectors
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser
export const selectIsAuthenticated = (state: { user: UserState }) => state.user.isAuthenticated
export const selectUserLoading = (state: { user: UserState }) => state.user.loading
export const selectUserError = (state: { user: UserState }) => state.user.error

// Export reducer
export default userSlice.reducer
