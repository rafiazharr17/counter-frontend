import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Helper untuk cek apakah user login
const isUserLoggedIn = () => {
  const token = localStorage.getItem("token");
  return !!token; // true jika ada token, false jika tidak
};

// Base query untuk guest (tanpa Authorization header)
const guestBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  prepareHeaders: (headers) => {
    // Guest tidak perlu Authorization header
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// Base query untuk authenticated user
const authBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// Error adapter untuk guest
const guestBaseQueryWithErrorAdapter = async (args, api, extraOptions) => {
  const result = await guestBaseQuery(args, api, extraOptions);
  if (!result.error) return result;

  const { status, data } = result.error;
  return {
    error: {
      status,
      message: data?.message || "Terjadi kesalahan pada server.",
    },
  };
};

// Error adapter untuk authenticated user
const authBaseQueryWithErrorAdapter = async (args, api, extraOptions) => {
  const result = await authBaseQuery(args, api, extraOptions);
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

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery: guestBaseQueryWithErrorAdapter, // Default gunakan guest
  tagTypes: ["Counters", "TrashedCounters", "OperatingHours"],
  endpoints: (builder) => ({
    // 🔹 GET ALL COUNTERS (UNTUK AMBILANTREAN - GUEST MODE)
    getCounters: builder.query({
      query: () => ({
        url: "guest/counters",
        // Pastikan tidak ada Authorization header
        headers: {
          "Content-Type": "application/json",
          // Tidak ada Authorization header sengaja dikosongkan
        },
      }),
      transformResponse: (response) => {
        console.log("🔍 [Guest Counters] Raw response:", response);

        if (!response) {
          console.warn("No response from guest/counters");
          return [];
        }

        // Format 1: response.data (array langsung)
        if (response.data && Array.isArray(response.data)) {
          console.log(
            `✅ [Guest Counters] Found ${response.data.length} counters`
          );
          return response.data;
        }

        // Format 2: response langsung array
        if (Array.isArray(response)) {
          console.log(`✅ [Guest Counters] Found ${response.length} counters`);
          return response;
        }

        // Format 3: response.data.data (nested)
        if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          console.log(
            `✅ [Guest Counters] Found ${response.data.data.length} counters`
          );
          return response.data.data;
        }

        console.warn("Unexpected guest counters format:", response);
        return [];
      },
      providesTags: ["Counters"],
    }),

    // 🔹 GET AUTHENTICATED COUNTERS (untuk halaman admin/CS)
    getAuthenticatedCounters: builder.query({
      queryFn: async (_arg, _api, _extra, fetchWithBQ) => {
        // Gunakan auth base query
        const result = await authBaseQueryWithErrorAdapter(
          { url: "counters" },
          _api,
          _extra
        );

        if (result.error) {
          return { error: result.error };
        }

        // Transform response
        const response = result.data;
        let data = [];

        if (response.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response)) {
          data = response;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          data = response.data.data;
        }

        return { data };
      },
      providesTags: ["Counters"],
    }),

    // 🔹 GET SINGLE COUNTER
    getCounter: builder.query({
      async queryFn({ id }, _api, _extra, fetchWithBQ) {
        const counterId = parseInt(id);

        if (isNaN(counterId)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        // Coba dulu endpoint guest
        console.log(`Trying guest endpoint for counter ${counterId}`);
        const guestRes = await fetchWithBQ(`guest/counters/${counterId}`);
        if (!guestRes.error) {
          const data = guestRes.data?.data || guestRes.data;
          return { data };
        }

        // Jika gagal, coba endpoint authenticated
        console.log(`Trying authenticated endpoint for counter ${counterId}`);
        const authRes = await authBaseQueryWithErrorAdapter(
          { url: `counters/${counterId}` },
          _api,
          _extra
        );

        if (!authRes.error) {
          const data = authRes.data?.data || authRes.data;
          return { data };
        }

        return { error: guestRes.error || authRes.error };
      },
    }),

    // 🔹 GET COUNTERS FOR CS DASHBOARD (hanya counter yang ditugaskan)
    getCSDashboardCounters: builder.query({
      queryFn: async (_arg, _api, _extra) => {
        // Gunakan auth base query untuk endpoint authenticated
        const result = await authBaseQueryWithErrorAdapter(
          { url: "counters" },
          _api,
          _extra
        );

        if (result.error) {
          return { error: result.error };
        }

        // Transform response
        const response = result.data;
        let data = [];

        if (response.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (Array.isArray(response)) {
          data = response;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          data = response.data.data;
        }

        console.log(`📊 CS Dashboard: ${data.length} counters assigned`);
        return { data };
      },
      providesTags: ["Counters"],
    }),

    // 🔹 GET COUNTER STATISTICS
    getCounterStatistics: builder.query({
      async queryFn({ id, date }, _api, _extra, fetchWithBQ) {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        const qs = date ? `?date=${date}` : "";

        // Coba guest endpoint dulu
        const guestRes = await fetchWithBQ(`guest/queues${qs}`);
        if (!guestRes.error) {
          const queues = Array.isArray(guestRes.data?.data)
            ? guestRes.data.data
            : Array.isArray(guestRes.data)
            ? guestRes.data
            : [];

          const filtered = queues.filter((q) => q.counter_id == counterId);

          return {
            data: {
              counter_id: counterId,
              ...calculateManualStatistics(filtered),
            },
          };
        }

        // Jika user login, coba endpoint authenticated
        if (isUserLoggedIn()) {
          const authRes = await authBaseQueryWithErrorAdapter(
            { url: `counters/${counterId}/statistics${qs}` },
            _api,
            _extra
          );

          if (!authRes.error) {
            return {
              data: authRes.data?.data || authRes.data,
            };
          }
        }

        return { error: guestRes.error };
      },
    }),

    // 🔹 CREATE QUEUE (ambil nomor antrian)
    createQueue: builder.mutation({
      queryFn: async (body, _api, _extra, fetchWithBQ) => {
        console.log("Creating queue with body:", body);

        // Coba endpoint guest dulu
        const guestRes = await fetchWithBQ({
          url: "guest/queues",
          method: "POST",
          body,
        });

        if (!guestRes.error) {
          return { data: guestRes.data };
        }

        console.log("Guest endpoint failed, trying authenticated endpoint");

        // Jika gagal, coba authenticated endpoint
        const authRes = await authBaseQueryWithErrorAdapter(
          {
            url: "queues",
            method: "POST",
            body,
          },
          _api,
          _extra
        );

        if (!authRes.error) {
          return { data: authRes.data };
        }

        return { error: guestRes.error || authRes.error };
      },
    }),

    // 🔹 ADD COUNTER (admin only)
    addCounter: builder.mutation({
      queryFn: async (body, _api, _extra) => {
        const result = await authBaseQueryWithErrorAdapter(
          {
            url: "counters",
            method: "POST",
            body,
          },
          _api,
          _extra
        );

        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      invalidatesTags: ["Counters"],
    }),

    // 🔹 UPDATE COUNTER (admin & CS)
    updateCounter: builder.mutation({
      queryFn: async ({ id, ...data }, _api, _extra) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        const result = await authBaseQueryWithErrorAdapter(
          {
            url: `counters/${counterId}`,
            method: "PUT",
            body: data,
          },
          _api,
          _extra
        );

        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      invalidatesTags: ["Counters"],
    }),

    // 🔹 DELETE COUNTER (admin only)
    deleteCounter: builder.mutation({
      queryFn: async (id, _api, _extra) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        const result = await authBaseQueryWithErrorAdapter(
          {
            url: `counters/${counterId}`,
            method: "DELETE",
          },
          _api,
          _extra
        );

        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      invalidatesTags: ["Counters"],
    }),

    // 🔹 GET TRASHED COUNTERS (admin only)
    getTrashedCounters: builder.query({
      queryFn: async (_arg, _api, _extra) => {
        const result = await authBaseQueryWithErrorAdapter(
          { url: "counters/trashed" },
          _api,
          _extra
        );

        if (result.error) {
          return { error: result.error };
        }

        const response = result.data;
        let data = [];

        if (Array.isArray(response)) data = response;
        else if (response && Array.isArray(response.data)) data = response.data;
        else if (response && response.data && Array.isArray(response.data.data))
          data = response.data.data;

        return { data };
      },
      providesTags: ["TrashedCounters"],
    }),

    // 🔹 RESTORE COUNTER (admin only)
    restoreCounter: builder.mutation({
      queryFn: async (id, _api, _extra) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        const result = await authBaseQueryWithErrorAdapter(
          {
            url: `counters/restore/${counterId}`,
            method: "POST",
          },
          _api,
          _extra
        );

        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 FORCE DELETE COUNTER (admin only)
    forceDeleteCounter: builder.mutation({
      queryFn: async (id, _api, _extra) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        const result = await authBaseQueryWithErrorAdapter(
          {
            url: `counters/force/${counterId}`,
            method: "DELETE",
          },
          _api,
          _extra
        );

        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 GET COUNTER LOGS
    getCounterLogs: builder.query({
      async queryFn(counterId, _api, _extra, fetchWithBQ) {
        const id = parseInt(counterId);
        if (isNaN(id)) return { error: { message: "ID loket tidak valid" } };

        // Coba guest endpoint dulu
        const guestRes = await fetchWithBQ("guest/queues");
        if (!guestRes.error) {
          const queues = Array.isArray(guestRes.data?.data)
            ? guestRes.data.data
            : Array.isArray(guestRes.data)
            ? guestRes.data
            : [];
          return {
            data: queues.filter((q) => q.counter_id == id),
          };
        }

        // Jika user login, coba authenticated endpoint
        if (isUserLoggedIn()) {
          const authRes = await authBaseQueryWithErrorAdapter(
            { url: `counters/${id}/logs` },
            _api,
            _extra
          );

          if (!authRes.error) {
            return {
              data: authRes.data?.data || authRes.data || [],
            };
          }
        }

        return { error: guestRes.error };
      },
      providesTags: ["Counters"],
    }),
  }),
});

// Helper function untuk menghitung statistik manual
function calculateManualStatistics(queues) {
  if (!Array.isArray(queues) || queues.length === 0) {
    return {
      total: 0,
      served: 0,
      called: 0,
      canceled: 0,
      done: 0,
      avg_duration_minutes: 0,
    };
  }

  const total = queues.length;
  const served = queues.filter((q) => q.status === "served").length;
  const called = queues.filter((q) => q.status === "called").length;
  const canceled = queues.filter((q) => q.status === "canceled").length;
  const done = queues.filter((q) => q.status === "done").length;

  let totalDuration = 0;
  let durationCount = 0;

  queues.forEach((queue) => {
    if (queue.created_at && queue.served_at) {
      const created = new Date(queue.created_at);
      const served = new Date(queue.served_at);
      const duration = (served - created) / (1000 * 60); // dalam menit
      totalDuration += duration;
      durationCount++;
    }
  });

  const avg_duration_minutes =
    durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  return {
    total,
    served,
    called,
    canceled,
    done,
    avg_duration_minutes,
  };
}

// Export semua hooks
export const {
  useGetCountersQuery,
  useGetCSDashboardCountersQuery,
  useGetAuthenticatedCountersQuery,
  useGetCounterQuery,
  useGetCounterStatisticsQuery,
  useGetCounterLogsQuery,
  useGetTrashedCountersQuery,
  useCreateQueueMutation,
  useAddCounterMutation,
  useUpdateCounterMutation,
  useDeleteCounterMutation,
  useRestoreCounterMutation,
  useForceDeleteCounterMutation,
} = counterApi;
