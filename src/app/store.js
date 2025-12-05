import { configureStore } from '@reduxjs/toolkit'
import { counterApi } from '../features/counters/counterApi'
import { queueApi } from '../features/queues/queueApi'
import { authApi } from '../features/auth/authApi'
import { userManagementApi } from '../features/users_managements/userManagementApi'

export const store = configureStore({
  reducer: {
    [counterApi.reducerPath]: counterApi.reducer,
    [queueApi.reducerPath]: queueApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [userManagementApi.reducerPath]: userManagementApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      counterApi.middleware,
      queueApi.middleware,
      authApi.middleware,
      userManagementApi.middleware
    ),
})