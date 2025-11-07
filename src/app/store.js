import { configureStore } from '@reduxjs/toolkit'
import { counterApi } from '../features/counters/counterApi'

export const store = configureStore({
  reducer: {
    [counterApi.reducerPath]: counterApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(counterApi.middleware),
})
