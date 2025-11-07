import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const queueApi = createApi({
  reducerPath: 'queueApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/',
  }),
  tagTypes: ['Queues'],
  endpoints: (builder) => ({
    getQueuesByCounter: builder.query({
      // params: { counterId, date: 'YYYY-MM-DD' }
      query: ({ counterId, date }) => {
        const q = new URLSearchParams();
        if (counterId) q.set('counter_id', counterId);
        if (date) q.set('date', date);
        return `queues?${q.toString()}`;
      },
      transformResponse: (response) => response.data, // backend wraps in {data: [...]}
      providesTags: (result, err, args) => [{ type: 'Queues', id: `${args.counterId}:${args.date || 'today'}` }],
    }),
  }),
});

export const { useGetQueuesByCounterQuery } = queueApi;
