import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Custom baseQuery dengan error adapter supaya error dari Laravel
 * langsung mudah dipakai di frontend.
 */
const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/",
  prepareHeaders: (headers) => {
    // Jika nanti butuh token, tinggal tambahkan di sini
    return headers;
  },
});

/**
 * Wrapper untuk memetakan error Laravel menjadi lebih mudah dibaca
 */
const baseQueryWithErrorAdapter = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    const status = result.error.status;
    const data = result.error.data;

    // Laravel Validation Error (422)
    if (status === 422 && data?.errors) {
      return {
        error: {
          status,
          message: data.message || "Validasi gagal.",
          fieldErrors: data.errors, // ← penting!
        },
      };
    }

    // Laravel Not Found (404)
    if (status === 404) {
      return {
        error: {
          status,
          message: data?.message || "Data tidak ditemukan.",
        },
      };
    }

    // Other server error
    return {
      error: {
        status,
        message:
          data?.message || "Terjadi kesalahan pada server. Silakan coba lagi.",
      },
    };
  }

  return result;
};

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery: baseQueryWithErrorAdapter, // pakai adapter
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

    // STATISTICS
    getCounterStatistics: builder.query({
      query: ({ id, date }) => {
        const qs = date ? `?date=${date}` : "";
        return `counters/${id}/statistics${qs}`;
      },
      transformResponse: (response) => response.data,
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

    // DELETE
    deleteCounter: builder.mutation({
      query: (id) => ({
        url: `counters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ["Counters"],
    }),
  }),
});

export const {
  useGetCountersQuery,
  useGetCounterQuery,
  useGetCounterStatisticsQuery,
  useAddCounterMutation,
  useUpdateCounterMutation,
  useDeleteCounterMutation,
} = counterApi;
