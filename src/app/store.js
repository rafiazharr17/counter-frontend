import { configureStore } from '@reduxjs/toolkit'
import { counterApi } from '../features/counters/counterApi'
import { queueApi } from '../features/queues/queueApi'
import { authApi } from '../features/auth/authApi'

export const store = configureStore({
  reducer: {
    [counterApi.reducerPath]: counterApi.reducer,
    [queueApi.reducerPath]: queueApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      counterApi.middleware,
      queueApi.middleware,
      authApi.middleware
    ),
})
