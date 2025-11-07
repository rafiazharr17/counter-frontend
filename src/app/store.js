import { configureStore } from '@reduxjs/toolkit'
import { counterApi } from '../features/counters/counterApi'
import { queueApi } from '../features/queues/queueApi'

export const store = configureStore({
  reducer: {
    [counterApi.reducerPath]: counterApi.reducer,
    [queueApi.reducerPath]: queueApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      counterApi.middleware,
      queueApi.middleware
    ),
})
