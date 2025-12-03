import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// --- HELPER: Deteksi Role User (Fix untuk format Object) ---
const getUserRole = () => {
  try {
    const userString = localStorage.getItem("user");
    if (!userString) return null;

    const user = JSON.parse(userString);

    // Cek 1: Jika role adalah Object (Sesuai screenshot Anda)
    // Contoh: user.role = { id: 2, name: "customer_service", ... }
    if (user.role && typeof user.role === "object" && user.role.name) {
      return user.role.name;
    }

    // Cek 2: Jika role adalah String langsung (Legacy/Format lain)
    if (typeof user.role === "string") {
      return user.role;
    }

    return null;
  } catch (error) {
    console.error("Gagal memparsing user dari localStorage", error);
    return null;
  }
};

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

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery: baseQueryWithErrorAdapter,
  tagTypes: ["Counters", "TrashedCounters", "OperatingHours"],

  endpoints: (builder) => ({
    
    // 1. GET ALL COUNTERS
    getCounters: builder.query({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const role = getUserRole(); // <-- Menggunakan Helper

        // Admin & CS menggunakan endpoint authenticated
        if (role === "admin" || role === "customer_service") {
          const res = await fetchWithBQ("counters");
          if (!res.error)
            return {
              data: Array.isArray(res.data?.data)
                ? res.data.data
                : res.data || [],
            };
          return { error: res.error };
        }

        // Guest Fallback
        const resGuest = await fetchWithBQ("guest/counters");
        if (!resGuest.error) {
          const raw = resGuest.data;
          return {
            data: Array.isArray(raw?.data)
              ? raw.data
              : Array.isArray(raw)
              ? raw
              : [],
          };
        }
        return { error: resGuest.error };
      },
      providesTags: ["Counters"],
    }),

    // 2. GET SINGLE COUNTER
    getCounter: builder.query({
      async queryFn({ id }, _api, _extra, fetchWithBQ) {
        const role = getUserRole(); // <-- Menggunakan Helper
        const counterId = parseInt(id);

        // CS → gunakan endpoint authenticated
        if (role === "customer_service") {
          const res = await fetchWithBQ(`counters/${counterId}`);
          if (!res.error) {
            return { data: res.data?.data || res.data };
          }
          return { error: res.error };
        }

        // Admin
        if (role === "admin") {
          const admin = await fetchWithBQ(`counters/${counterId}`);
          if (!admin.error) return { data: admin.data?.data || admin.data };
        }

        // Guest fallback
        const guest = await fetchWithBQ(`guest/counters/${counterId}`);
        if (!guest.error) return { data: guest.data?.data || guest.data };

        return { error: guest.error };
      },
    }),

    // 3. GET STATISTICS
    getCounterStatistics: builder.query({
      async queryFn({ id, date }, _api, _extra, fetchWithBQ) {
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        const role = getUserRole(); // <-- Menggunakan Helper
        const qs = date ? `?date=${date}` : "";

        // Admin & CS → selalu pakai endpoint authenticated (statistik lengkap)
        if (role === "admin" || role === "customer_service") {
          const res = await fetchWithBQ(`counters/${counterId}/statistics${qs}`);
          if (!res.error) {
            return { data: res.data?.data || res.data };
          }
        }

        // Fallback Guest (Hitung manual dari queue list)
        const guest = await fetchWithBQ(`guest/queues${qs}`);
        if (!guest.error) {
          const queues = Array.isArray(guest.data?.data)
            ? guest.data.data
            : Array.isArray(guest.data)
            ? guest.data
            : [];

          const filtered = queues.filter((q) => q.counter_id == counterId);

          return {
            data: {
              counter_id: counterId,
              ...calculateManualStatistics(filtered),
            },
          };
        }

        return { error: guest.error };
      },
    }),

    // 🔹 Hanya untuk admin
    addCounter: builder.mutation({
      query: (body) => ({
        url: "counters",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Counters"],
    }),

    // 🔹 Untuk admin & CS
    updateCounter: builder.mutation({
      query: ({ id, ...data }) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) throw new Error("ID loket tidak valid");

        return {
          url: `counters/${counterId}`,
          method: "PUT",
          body: data,
        };
      },
      invalidatesTags: (result, error, { id }) => [
        "Counters",
        { type: "Counters", id },
      ],
    }),

    // 🔹 Hanya untuk admin
    deleteCounter: builder.mutation({
      query: (id) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) throw new Error("ID loket tidak valid");

        return {
          url: `counters/${counterId}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Counters"],
    }),

    // 🔹 Get Trashed
    getTrashedCounters: builder.query({
      query: () => "counters/trashed",
      transformResponse: (response) => {
        // Handle berbagai format response
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        if (response && response.data && Array.isArray(response.data.data))
          return response.data.data;
        return [];
      },
      providesTags: ["TrashedCounters"],
    }),

    // 🔹 Restore
    restoreCounter: builder.mutation({
      query: (id) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) throw new Error("ID loket tidak valid");
        return {
          url: `counters/restore/${counterId}`,
          method: "POST",
        };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 Force Delete
    forceDeleteCounter: builder.mutation({
      query: (id) => {
        const counterId = parseInt(id);
        if (isNaN(counterId)) throw new Error("ID loket tidak valid");
        return {
          url: `counters/force/${counterId}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 Counter logs
    getCounterLogs: builder.query({
      async queryFn(counterId, _api, _extra, fetchWithBQ) {
        const id = parseInt(counterId);
        if (isNaN(id)) return { error: { message: "ID loket tidak valid" } };

        const role = getUserRole(); // <-- Menggunakan Helper

        // Admin & CS → gunakan endpoint authenticated
        if (role === "admin" || role === "customer_service") {
          const res = await fetchWithBQ(`counters/${id}/logs`);
          if (!res.error) {
            return { data: res.data?.data || res.data || [] };
          }
        }

        // Fallback terakhir
        const guest = await fetchWithBQ("guest/queues");
        if (!guest.error) {
          const queues = Array.isArray(guest.data?.data)
            ? guest.data.data
            : Array.isArray(guest.data)
            ? guest.data
            : [];
          return { data: queues.filter((q) => q.counter_id == id) };
        }
        return { error: guest.error };
      },
      providesTags: ["Counters"],
    }),

    // 🔹 Get Counters with Operating Hours
    getCountersWithOperatingHours: builder.query({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const role = getUserRole(); // <-- Menggunakan Helper

        try {
          // Ambil data counters
          let countersResult;
          if (role === "admin" || role === "customer_service") {
            countersResult = await fetchWithBQ("counters");
          } else {
            countersResult = await fetchWithBQ("guest/counters");
          }

          if (countersResult.error) {
            return { error: countersResult.error };
          }

          let counters =
            countersResult.data?.data || countersResult.data || [];
          counters = Array.isArray(counters) ? counters : [];

          // Untuk setiap counter, ambil jam operasional REAL dari API
          const countersWithHours = await Promise.all(
            counters.map(async (counter) => {
              try {
                const hoursResult = await fetchWithBQ(
                  `counters/${counter.id}/operating-hours`
                );

                if (!hoursResult.error && hoursResult.data) {
                  const operatingHours =
                    hoursResult.data.data || hoursResult.data;

                  return {
                    ...counter,
                    operating_hours: {
                      use_custom_hours:
                        operatingHours.use_custom_hours || false,
                      is_24_hours: operatingHours.is_24_hours || false,
                      days: operatingHours.days || [],
                      start_time: operatingHours.start_time || "08:00",
                      end_time: operatingHours.end_time || "16:00",
                    },
                  };
                }

                return { ...counter, operating_hours: null };
              } catch (error) {
                console.error(
                  `Error getting operating hours for counter ${counter.id}:`,
                  error
                );
                return { ...counter, operating_hours: null };
              }
            })
          );

          return { data: countersWithHours };
        } catch (error) {
          console.error("Error in getCountersWithOperatingHours:", error);
          return {
            error: {
              message: "Failed to fetch counters with operating hours",
            },
          };
        }
      },
      providesTags: ["Counters", "OperatingHours"],
    }),

    // 🔹 Get Operating Hours (Single)
    getCounterOperatingHours: builder.query({
      query: (counterId) => `counters/${counterId}/operating-hours`,
      providesTags: (result, error, counterId) => [
        { type: "OperatingHours", id: counterId },
      ],
    }),

    // 🔹 Update Operating Hours
    updateCounterOperatingHours: builder.mutation({
      query: ({ counterId, ...body }) => ({
        url: `counters/${counterId}/operating-hours`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { counterId }) => [
        { type: "OperatingHours", id: counterId },
        "OperatingHours",
      ],
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

export const {
  useGetCountersQuery,
  useGetCounterQuery,
  useGetCounterStatisticsQuery,
  useGetCounterLogsQuery,
  useGetTrashedCountersQuery,
  useAddCounterMutation,
  useUpdateCounterMutation,
  useDeleteCounterMutation,
  useRestoreCounterMutation,
  useForceDeleteCounterMutation,
  useGetCountersWithOperatingHoursQuery,
  useGetCounterOperatingHoursQuery,
  useUpdateCounterOperatingHoursMutation,
} = counterApi;