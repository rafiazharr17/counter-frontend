import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const counterApi = createApi({
  reducerPath: 'counterApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/',
  }),
  tagTypes: ['Counters'],
  endpoints: (builder) => ({
    // GET ALL
    getCounters: builder.query({
      query: () => 'counters',
      transformResponse: (response) => response.data, // ⬅️ Ambil array data dari backend
      providesTags: ['Counters'],
    }),

    // GET BY ID
    getCounter: builder.query({
      query: (id) => `counters/${id}`,
      transformResponse: (response) => response.data, // ⬅️ Ambil object data dari backend
      providesTags: (result, error, id) => [{ type: 'Counters', id }],
    }),

    // CREATE
    addCounter: builder.mutation({
      query: (body) => ({
        url: 'counters',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Counters'],
    }),

    // UPDATE
    updateCounter: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `counters/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        'Counters',
        { type: 'Counters', id },
      ],
    }),
  }),
})

export const {
  useGetCountersQuery,
  useGetCounterQuery,
  useAddCounterMutation,
  useUpdateCounterMutation,
} = counterApi
