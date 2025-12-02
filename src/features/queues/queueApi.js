import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Error adapter
const baseQueryWithErrorAdapter = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (!result.error) return result;

  const { status, data } = result.error;

  if (status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return { error: { status, message: "Sesi Anda telah berakhir." } };
  }

  if (status === 422 && data?.errors) {
    return {
      error: {
        status,
        message: data.message || "Validasi gagal.",
        fieldErrors: data.errors,
      },
    };
  }

  return {
    error: {
      status,
      message: data?.message || "Terjadi kesalahan pada server.",
    },
  };
};

export const queueApi = createApi({
  reducerPath: "queueApi",
  baseQuery: baseQueryWithErrorAdapter,
  tagTypes: ["Queues"],
  endpoints: (builder) => ({
    // 🔹 Ambil semua antrean (admin & guest)
    getQueues: builder.query({
      async queryFn({ date, guest = false } = {}, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        
        const params = new URLSearchParams();
        if (date) params.set("date", date);

        // Admin menggunakan endpoint admin
        if (user.role === "admin" && !guest) {
          const res = await fetchWithBQ(`queues?${params.toString()}`);
          if (!res.error) return { data: res.data?.data || res.data || [] };
          return { error: res.error };
        }

        // CS & Guest menggunakan endpoint guest
        const resGuest = await fetchWithBQ(`guest/queues?${params.toString()}`);
        if (!resGuest.error) {
          const data = resGuest.data?.data || resGuest.data || [];
          return { data: Array.isArray(data) ? data : [] };
        }
        return { error: resGuest.error };
      },
      providesTags: ["Queues"],
    }),

    // 🔹 Ambil antrean berdasarkan counter
    getQueuesByCounter: builder.query({
      async queryFn({ counterId, date }, _api, _extra, fetchWithBQ) {
        const params = new URLSearchParams();
        if (date) params.set("date", date);

        const user = JSON.parse(localStorage.getItem("user") || "{}");
        
        // Admin bisa menggunakan endpoint admin
        if (user.role === "admin") {
          const res = await fetchWithBQ(`queues?${params.toString()}`);
          if (!res.error) {
            let data = res.data?.data || res.data || [];
            data = Array.isArray(data) ? data : [];
            
            // Filter by counterId di frontend
            if (counterId) {
              data = data.filter(queue => queue.counter_id == counterId);
            }
            
            return { data };
          }
        }

        // CS & Guest menggunakan endpoint guest
        const resGuest = await fetchWithBQ(`guest/queues?${params.toString()}`);
        if (!resGuest.error) {
          let data = resGuest.data?.data || resGuest.data || [];
          data = Array.isArray(data) ? data : [];
          
          // Filter by counterId di frontend
          if (counterId) {
            data = data.filter(queue => queue.counter_id == counterId);
          }
          
          return { data };
        }
        return { error: resGuest.error };
      },
      providesTags: (result, error, { counterId }) => [
        { type: "Queues", id: `counter-${counterId}` }
      ],
    }),

    // 🔹 Buat antrian baru (admin & guest)
    createQueue: builder.mutation({
      async queryFn(body, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        
        // Admin & CS menggunakan endpoint admin
        if (user.role === "admin" || user.role === "customer_service") {
          const res = await fetchWithBQ({
            url: "queues",
            method: "POST",
            body,
          });
          return res;
        }

        // Guest menggunakan endpoint guest
        const resGuest = await fetchWithBQ({
          url: "guest/queues",
          method: "POST",
          body,
        });
        return resGuest;
      },
      invalidatesTags: ["Queues"],
    }),

    // 🔹 Hapus antrian (hanya admin)
    deleteQueue: builder.mutation({
      query: (id) => ({
        url: `queues/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Queues"],
    }),

    // ========== CS ONLY ENDPOINTS ==========
    
    // 🔹 Panggil antrian (CS only)
    callQueue: builder.mutation({
      query: (id) => ({
        url: `queues/${id}/call`,
        method: "PATCH",
      }),
      invalidatesTags: ["Queues"],
    }),

    // 🔹 Layani antrian (CS only)
    serveQueue: builder.mutation({
      query: (id) => ({
        url: `queues/${id}/serve`,
        method: "PATCH",
      }),
      invalidatesTags: ["Queues"],
    }),

    // 🔹 Selesai antrian (CS only)
    doneQueue: builder.mutation({
      query: (id) => ({
        url: `queues/${id}/done`,
        method: "PATCH",
      }),
      invalidatesTags: ["Queues"],
    }),

    // 🔹 Batalkan antrian (CS only)
    cancelQueue: builder.mutation({
      query: (id) => ({
        url: `queues/${id}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: ["Queues"],
    }),

    // 🔹 Panggil antrian berikutnya (CS only)
    callNextQueue: builder.mutation({
      query: (counterId) => ({
        url: `queues/${counterId}/call-next`,
        method: "POST",
      }),
      invalidatesTags: ["Queues"],
    }),

    // ========== LOGS ENDPOINTS ==========
    
    // 🔹 Ambil log antrean berdasarkan counter (fallback untuk semua role)
    getQueueLogsByCounter: builder.query({
      async queryFn(counterId, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        
        // Coba endpoint admin terlebih dahulu untuk admin
        if (user.role === "admin") {
          const res = await fetchWithBQ(`counters/${counterId}/logs`);
          if (!res.error) {
            return { data: res.data?.data || res.data || [] };
          }
        }
        
        // Fallback untuk semua role: gunakan guest queues
        const resGuest = await fetchWithBQ('guest/queues');
        if (!resGuest.error) {
          let data = resGuest.data?.data || resGuest.data || [];
          data = Array.isArray(data) ? data : [];
          
          // Filter by counter_id
          const filteredData = data.filter(queue => queue.counter_id == counterId);
          return { data: filteredData };
        }
        
        return { error: resGuest.error };
      },
      providesTags: ["Queues"],
    }),
  }),
});

export const {
  useGetQueuesQuery,
  useGetQueuesByCounterQuery,
  useCreateQueueMutation,
  useDeleteQueueMutation,
  useCallQueueMutation,
  useServeQueueMutation,
  useDoneQueueMutation,
  useCancelQueueMutation,
  useCallNextQueueMutation,
  useGetQueueLogsByCounterQuery,
} = queueApi;