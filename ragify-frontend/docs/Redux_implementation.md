# Redux Implementation for User Data

This directory contains the Redux Toolkit implementation for managing user authentication state in the RAGify frontend application.

## Structure

```
src/store/
├── store.ts          # Redux store configuration
├── hooks.ts          # Typed Redux hooks
├── slices/
│   └── userSlice.ts  # User authentication slice
└── README.md         # This file
```

## Files Overview

### `store.ts`
- Configures the Redux store using `configureStore` from Redux Toolkit
- Exports TypeScript types for `RootState` and `AppDispatch`
- Currently includes the user slice

### `hooks.ts`
- Provides typed versions of `useDispatch` and `useSelector` hooks
- Use `useAppDispatch()` and `useAppSelector()` throughout the app instead of the plain hooks

### `slices/userSlice.ts`
- Manages user authentication state using `createSlice`
- Includes actions for setting/clearing user data, loading states, and errors
- Provides selectors for accessing user state

## Usage Examples

### Using Redux selectors in components:
```tsx
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser, selectIsAuthenticated } from '../store/slices/userSlice';

const MyComponent = () => {
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {currentUser?.displayName}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
};
```

### Using Redux actions:
```tsx
import { useAppDispatch } from '../store/hooks';
import { setUser, clearUser } from '../store/slices/userSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  
  const handleLogin = (user) => {
    dispatch(setUser(user));
  };
  
  const handleLogout = () => {
    dispatch(clearUser());
  };
  
  // ... rest of component
};
```

## Integration with Firebase Auth

The Redux store is integrated with the existing Firebase Authentication through the `AuthContext`. The context automatically updates the Redux store when authentication state changes:

- User login/logout events update the Redux store
- Profile updates are synchronized between Firebase and Redux
- Loading and error states are managed in Redux

## Available Actions

- `setLoading(boolean)` - Set loading state
- `setUser(User | null)` - Set current user data
- `clearUser()` - Clear user data on logout
- `setError(string)` - Set error message
- `clearError()` - Clear error message
- `updateUserProfile(Partial<User>)` - Update user profile data

## Available Selectors

- `selectCurrentUser` - Get current user object
- `selectIsAuthenticated` - Get authentication status
- `selectUserLoading` - Get loading state
- `selectUserError` - Get error message

## Benefits

1. **Centralized State**: All user data is managed in a single, predictable location
2. **Type Safety**: Full TypeScript support with typed hooks and selectors
3. **DevTools**: Redux DevTools integration for debugging
4. **Performance**: Optimized re-renders with Redux's selector system
5. **Scalability**: Easy to add more slices for other app state (projects, API keys, etc.)
