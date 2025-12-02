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

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery: baseQueryWithErrorAdapter,
  tagTypes: ["Counters", "TrashedCounters", "OperatingHours"],

  endpoints: (builder) => ({
    getCounters: builder.query({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        // Admin & CS menggunakan endpoint yang sama
        if (user.role === "admin" || user.role === "customer_service") {
          const res = await fetchWithBQ("counters");
          if (!res.error)
            return {
              data: Array.isArray(res.data?.data)
                ? res.data.data
                : res.data || [],
            };
          return { error: res.error };
        }

        // Guest
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

    getCounter: builder.query({
      async queryFn({ id }, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        // Untuk CS, gunakan guest endpoint karena mungkin tidak ada akses ke endpoint admin
        if (user.role === "customer_service") {
          const guest = await fetchWithBQ(`guest/counters/${counterId}`);
          if (!guest.error) return { data: guest.data?.data || guest.data };

          // Jika guest endpoint error, coba endpoint biasa
          const fallback = await fetchWithBQ(`counters/${counterId}`);
          if (!fallback.error)
            return { data: fallback.data?.data || fallback.data };

          return { error: guest.error };
        }

        // Admin menggunakan endpoint admin
        if (user.role === "admin") {
          const admin = await fetchWithBQ(`counters/${counterId}`);
          if (!admin.error) return { data: admin.data?.data || admin.data };
        }

        // Guest menggunakan endpoint guest
        const guest = await fetchWithBQ(`guest/counters/${counterId}`);
        if (!guest.error) return { data: guest.data?.data || guest.data };

        return { error: guest.error };
      },
      providesTags: (result, error, { id }) => [{ type: "Counters", id }],
    }),

    getCounterStatistics: builder.query({
      async queryFn({ id, date }, _api, _extra, fetchWithBQ) {
        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const qs = date ? `?date=${date}` : "";

        // Coba endpoint admin terlebih dahulu untuk admin
        if (user.role === "admin") {
          const res = await fetchWithBQ(
            `counters/${counterId}/statistics${qs}`
          );
          if (!res.error) {
            return { data: res.data.data };
          }
        }

        // Untuk CS atau jika admin endpoint gagal, gunakan guest endpoint
        // Kita akan hitung statistik secara manual dari data queues
        const guestQueues = await fetchWithBQ(`guest/queues${qs}`);
        if (!guestQueues.error) {
          const queues = Array.isArray(guestQueues.data?.data)
            ? guestQueues.data.data
            : Array.isArray(guestQueues.data)
            ? guestQueues.data
            : [];

          // Filter queues by counter_id dan hitung statistik
          const filteredQueues = queues.filter(
            (queue) => queue.counter_id == counterId
          );
          const stats = calculateManualStatistics(filteredQueues);

          return {
            data: {
              counter_id: counterId,
              counter_name: "Counter", // Akan di-override nanti
              ...stats,
            },
          };
        }

        return { error: guestQueues.error };
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
        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

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
        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        return {
          url: `counters/${counterId}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Counters"],
    }),

    // Di endpoints getTrashedCounters, perbaiki menjadi:
    getTrashedCounters: builder.query({
      query: () => "counters/trashed",
      transformResponse: (response) => {
        console.log("Raw trashed response:", response); // Debug

        // Handle berbagai format response
        if (Array.isArray(response)) {
          return response;
        } else if (response && Array.isArray(response.data)) {
          return response.data;
        } else if (
          response &&
          response.data &&
          Array.isArray(response.data.data)
        ) {
          return response.data.data;
        }

        return [];
      },
      providesTags: ["TrashedCounters"],
    }),

    // 🔹 Hanya untuk admin
    restoreCounter: builder.mutation({
      query: (id) => {
        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        return {
          url: `counters/restore/${counterId}`,
          method: "POST",
        };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 Hanya untuk admin
    forceDeleteCounter: builder.mutation({
      query: (id) => {
        // Pastikan ID adalah number
        const counterId = parseInt(id);
        if (isNaN(counterId)) {
          throw new Error("ID loket tidak valid");
        }

        return {
          url: `counters/force/${counterId}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Counters", "TrashedCounters"],
    }),

    // 🔹 Hanya untuk admin - Counter logs
    getCounterLogs: builder.query({
      async queryFn(counterId, _api, _extra, fetchWithBQ) {
        // Pastikan ID adalah number
        const id = parseInt(counterId);
        if (isNaN(id)) {
          return { error: { message: "ID loket tidak valid" } };
        }

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        // Untuk admin, gunakan endpoint logs
        if (user.role === "admin") {
          const res = await fetchWithBQ(`counters/${id}/logs`);
          if (!res.error) {
            return { data: res.data?.data || res.data || [] };
          }
        }

        // Untuk CS atau jika admin endpoint gagal, gunakan guest queues
        const guestQueues = await fetchWithBQ("guest/queues");
        if (!guestQueues.error) {
          const queues = Array.isArray(guestQueues.data?.data)
            ? guestQueues.data.data
            : Array.isArray(guestQueues.data)
            ? guestQueues.data
            : [];

          // Filter queues by counter_id
          const filteredQueues = queues.filter(
            (queue) => queue.counter_id == id
          );
          return { data: filteredQueues };
        }

        return { error: guestQueues.error };
      },
      providesTags: ["Counters"],
    }),

    // 🔹 Ambil semua counter dengan jam operasional mereka (REAL DATA)
    getCountersWithOperatingHours: builder.query({
      async queryFn(_arg, _api, _extra, fetchWithBQ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        try {
          // Ambil data counters
          let countersResult;
          if (user.role === "admin" || user.role === "customer_service") {
            countersResult = await fetchWithBQ("counters");
          } else {
            countersResult = await fetchWithBQ("guest/counters");
          }

          if (countersResult.error) {
            return { error: countersResult.error };
          }

          let counters = countersResult.data?.data || countersResult.data || [];
          counters = Array.isArray(counters) ? counters : [];

          // Untuk setiap counter, ambil jam operasional REAL dari API
          const countersWithHours = await Promise.all(
            counters.map(async (counter) => {
              try {
                // Ambil jam operasional khusus counter dari API
                const hoursResult = await fetchWithBQ(
                  `counters/${counter.id}/operating-hours`
                );

                if (!hoursResult.error && hoursResult.data) {
                  const operatingHours =
                    hoursResult.data.data || hoursResult.data;

                  // Pastikan structure data konsisten
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

                // Jika tidak ada data jam operasional, counter TIDAK AKTIF
                console.warn(
                  `Counter ${counter.name} tidak memiliki pengaturan jam operasional`
                );
                return {
                  ...counter,
                  operating_hours: null, // Tandai sebagai tidak ada data
                };
              } catch (error) {
                console.error(
                  `Error getting operating hours for counter ${counter.id}:`,
                  error
                );
                return {
                  ...counter,
                  operating_hours: null, // Tandai sebagai error
                };
              }
            })
          );

          return { data: countersWithHours };
        } catch (error) {
          console.error("Error in getCountersWithOperatingHours:", error);
          return {
            error: { message: "Failed to fetch counters with operating hours" },
          };
        }
      },
      providesTags: ["Counters", "OperatingHours"],
    }),

    // 🔹 Ambil jam operasional untuk counter tertentu
    getCounterOperatingHours: builder.query({
      query: (counterId) => `counters/${counterId}/operating-hours`,
      providesTags: (result, error, counterId) => [
        { type: "OperatingHours", id: counterId },
      ],
    }),

    // 🔹 Update jam operasional counter
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

  // Hitung rata-rata durasi (sederhana)
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
