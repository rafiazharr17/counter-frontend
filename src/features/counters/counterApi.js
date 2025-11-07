import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/",
  }),
  tagTypes: ["Counters"],
  endpoints: (builder) => ({
    // LIST
    getCounters: builder.query({
      query: () => "counters",
      transformResponse: (response) => response.data,
      providesTags: ["Counters"],
    }),

    // DETAIL
    getCounter: builder.query({
      query: (id) => `counters/${id}`,
      transformResponse: (response) => response.data,
      providesTags: (result, error, id) => [{ type: "Counters", id }],
    }),

    // STATISTICS (hasil langsung objek statistik)
    getCounterStatistics: builder.query({
      // args: { id, date }
      query: ({ id, date }) => {
        const qs = date ? `?date=${date}` : "";
        return `counters/${id}/statistics${qs}`;
      },
      transformResponse: (response) => response.data, // ⬅ perbaikan di sini
      providesTags: (result, error, { id, date }) => [
        { type: "Counters", id: `stats:${id}:${date || "today"}` },
      ],
    }),

    // CREATE
    addCounter: builder.mutation({
      query: (body) => ({
        url: "counters",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Counters"],
    }),

    // UPDATE
    updateCounter: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `counters/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Counters",
        { type: "Counters", id },
      ],
    }),
  }),
});

export const {
  useGetCountersQuery,
  useGetCounterQuery,
  useGetCounterStatisticsQuery,
  useAddCounterMutation,
  useUpdateCounterMutation,
} = counterApi;
