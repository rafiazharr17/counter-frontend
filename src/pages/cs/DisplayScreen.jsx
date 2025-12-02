import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";

// API Hooks
import { useGetCountersQuery } from "../../features/counters/counterApi";
import { useGetQueuesQuery } from "../../features/queues/queueApi";
// Import WebSocket Hook
import { useWebSocket } from "../../hooks/useWebSocket";

export default function DisplayScreen() {
  const toast = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update date setiap menit untuk pengecekan perubahan hari
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Ambil data counters
  const {
    data: countersData = [],
    isLoading: isCountersLoading,
    isError: isCountersError,
    error: countersError,
  } = useGetCountersQuery({ guest: true });

  // Ambil data queues - semua antrian termasuk yang sudah selesai/dibatalkan
  // PERUBAHAN: Ambil 'refetch' untuk update manual saat event WebSocket masuk
  const {
    data: queuesData = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
    error: queuesError,
    refetch: refetchQueues, 
  } = useGetQueuesQuery({ guest: true });

  // INTEGRASI WEBSOCKET
  // Saat ada event antrean (panggil, ambil nomor, selesai, dll), refresh data
  useWebSocket((data) => {
    console.log("WebSocket Event received in DisplayScreen:", data);
    refetchQueues();
  });

  // Handle errors
  useEffect(() => {
    if (isCountersError) {
      console.error("Error loading counters:", countersError);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Gagal memuat data loket",
        life: 3000,
      });
    }

    if (isQueuesError) {
      console.error("Error loading queues:", queuesError);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Gagal memuat data antrian",
        life: 3000,
      });
    }
  }, [isCountersError, isQueuesError, countersError, queuesError]);

  // Process counters data
  const counters = useMemo(() => {
    if (!countersData) return [];

    if (Array.isArray(countersData)) {
      return countersData;
    } else if (countersData.data && Array.isArray(countersData.data)) {
      return countersData.data;
    } else if (countersData.data) {
      return [countersData.data];
    }

    return [];
  }, [countersData]);

  // Process queues data
  const queues = useMemo(() => {
    if (!queuesData) return [];

    if (Array.isArray(queuesData)) {
      return queuesData;
    } else if (queuesData.data && Array.isArray(queuesData.data)) {
      return queuesData.data;
    } else if (queuesData.data) {
      return [queuesData.data];
    }

    return [];
  }, [queuesData]);

  // Fungsi untuk memeriksa apakah tanggal sama (hanya tahun, bulan, hari)
  const isSameDate = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Filter queues hanya untuk hari ini
  const todayQueues = useMemo(() => {
    return queues.filter(queue => {
      if (!queue.created_at) return false;
      const queueDate = new Date(queue.created_at);
      return isSameDate(queueDate, currentDate);
    });
  }, [queues, currentDate]);

  // Get the most recent queue for each counter HARI INI SAJA
  const getRecentQueueForCounter = (counterId) => {
    if (!todayQueues.length) return null;

    // Ambil semua antrian untuk counter ini HARI INI, urutkan berdasarkan created_at terbaru
    const counterQueues = todayQueues
      .filter(
        (queue) =>
          queue.counter_id === counterId || queue.counter?.id === counterId
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Kembalikan antrian terbaru yang memiliki status 'called', 'served', 'done', atau 'canceled'
    const recentQueue = counterQueues.find((queue) =>
      ["called", "served", "done", "canceled"].includes(queue.status)
    );

    return recentQueue || null;
  };

  // Format queue number: tampilkan lengkap dengan dash
  const formatQueueNumber = (queueNumber) => {
    if (!queueNumber) return "000-000";

    // Kembalikan nomor antrian asli dengan format dash
    const parts = queueNumber.split("-");
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[1]}-${parts[3]}`;
    }

    return queueNumber;
  };

  // Get service code dari counter code atau nama
  const getServiceCode = (counter) => {
    if (counter.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 0 ? parts[0] : counter.name?.charAt(0) || "A";
    }
    return counter.name?.charAt(0) || "A";
  };

  // Get loket number dari counter code
  const getLoketNumber = (counter) => {
    if (counter.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 1
        ? `Loket ${parts[1]}`
        : `Loket ${getServiceCode(counter)}`;
    }
    return `Loket ${getServiceCode(counter)}`;
  };

  // Get nomor loket untuk sorting
  const getLoketNumberForSorting = (counter) => {
    if (counter.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    }
    return 0;
  };

  // Get service name untuk sorting
  const getServiceNameForSorting = (counter) => {
    return counter.name?.toLowerCase() || "";
  };

  // Data untuk display - diurutkan berdasarkan abjad dan nomor loket
  const displayData = useMemo(() => {
    const sortedCounters = [...counters].sort((a, b) => {
      // Urutkan berdasarkan nama layanan (abjad)
      const nameCompare = getServiceNameForSorting(a).localeCompare(
        getServiceNameForSorting(b)
      );
      if (nameCompare !== 0) return nameCompare;

      // Jika nama sama, urutkan berdasarkan nomor loket
      return getLoketNumberForSorting(a) - getLoketNumberForSorting(b);
    });

    return sortedCounters.map((counter, index) => {
      const recentQueue = getRecentQueueForCounter(counter.id);
      const queueNumber = recentQueue
        ? formatQueueNumber(recentQueue.queue_number)
        : "000-000"; // Default value ketika tidak ada antrian hari ini

      // Tentukan variasi style berdasarkan index
      const styleVariation = index % 6; // 6 variasi berbeda

      return {
        id: counter.id,
        number: queueNumber,
        service: counter.name,
        loket: getLoketNumber(counter),
        hasQueue: !!recentQueue,
        currentQueue: recentQueue,
        styleVariation: styleVariation,
      };
    });
  }, [counters, todayQueues, currentDate]);

  // Fungsi untuk mendapatkan warna berdasarkan variasi
  const getCardStyle = (variation, hasQueue) => {
    const baseStyles = {
      0: {
        gradient: hasQueue
          ? "from-blue-50 to-blue-100"
          : "from-blue-50/60 to-blue-100/40",
        border: "border-blue-200/80",
        shadow: "shadow-blue-200/30",
        iconBg: "bg-gradient-to-r from-blue-500 to-blue-600",
        icon: "pi pi-desktop",
        numberColor: "text-blue-700",
        serviceColor: "text-blue-800",
        loketColor: "text-blue-600",
      },
      1: {
        gradient: hasQueue
          ? "from-green-50 to-green-100"
          : "from-green-50/60 to-green-100/40",
        border: "border-green-200/80",
        shadow: "shadow-green-200/30",
        iconBg: "bg-gradient-to-r from-green-500 to-green-600",
        icon: "pi pi-desktop",
        numberColor: "text-green-700",
        serviceColor: "text-green-800",
        loketColor: "text-green-600",
      },
      2: {
        gradient: hasQueue
          ? "from-purple-50 to-purple-100"
          : "from-purple-50/60 to-purple-100/40",
        border: "border-purple-200/80",
        shadow: "shadow-purple-200/30",
        iconBg: "bg-gradient-to-r from-purple-500 to-purple-600",
        icon: "pi pi-desktop",
        numberColor: "text-purple-700",
        serviceColor: "text-purple-800",
        loketColor: "text-purple-600",
      },
      3: {
        gradient: hasQueue
          ? "from-orange-50 to-orange-100"
          : "from-orange-50/60 to-orange-100/40",
        border: "border-orange-200/80",
        shadow: "shadow-orange-200/30",
        iconBg: "bg-gradient-to-r from-orange-500 to-orange-600",
        icon: "pi pi-desktop",
        numberColor: "text-orange-700",
        serviceColor: "text-orange-800",
        loketColor: "text-orange-600",
      },
      4: {
        gradient: hasQueue
          ? "from-teal-50 to-teal-100"
          : "from-teal-50/60 to-teal-100/40",
        border: "border-teal-200/80",
        shadow: "shadow-teal-200/30",
        iconBg: "bg-gradient-to-r from-teal-500 to-teal-600",
        icon: "pi pi-desktop",
        numberColor: "text-teal-700",
        serviceColor: "text-teal-800",
        loketColor: "text-teal-600",
      },
      5: {
        gradient: hasQueue
          ? "from-pink-50 to-pink-100"
          : "from-pink-50/60 to-pink-100/40",
        border: "border-pink-200/80",
        shadow: "shadow-pink-200/30",
        iconBg: "bg-gradient-to-r from-pink-500 to-pink-600",
        icon: "pi pi-desktop",
        numberColor: "text-pink-700",
        serviceColor: "text-pink-800",
        loketColor: "text-pink-600",
      },
    };

    return baseStyles[variation] || baseStyles[0];
  };

  // Loading skeleton dengan variasi
  const SkeletonCard = ({ variation = 0 }) => {
    const style = getCardStyle(variation, true);

    return (
      <div
        className={`bg-gradient-to-br ${style.gradient} border-2 ${style.border} rounded-2xl p-4 sm:p-5 shadow-lg ${style.shadow} flex flex-col h-full animate-pulse`}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <div
              className={`h-5 bg-gradient-to-r ${style.gradient
                .replace("from-", "from-")
                .replace("to-", "to-")} rounded-lg w-2/3 mb-2`}></div>
          </div>
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${style.iconBg}`}></div>
        </div>
        <div className="text-center py-4">
          <div
            className={`h-12 sm:h-16 bg-gradient-to-r ${style.gradient
              .replace("from-", "from-")
              .replace("to-", "to-")} rounded-xl w-full mb-2`}></div>
          <div
            className={`h-4 bg-gradient-to-r ${style.gradient
              .replace("from-", "from-")
              .replace("to-", "to-")} rounded w-1/2 mx-auto`}></div>
        </div>
      </div>
    );
  };

  // Header template dengan variasi
  const headerTemplate = (q) => {
    const style = getCardStyle(q.styleVariation, q.hasQueue);

    return (
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg sm:text-xl font-bold ${style.serviceColor} truncate`}>
            {q.service}
          </h3>
        </div>
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
          <i className={`${style.icon} text-white text-xs sm:text-sm`}></i>
        </div>
      </div>
    );
  };

  // Card content dengan variasi
  const cardContent = (q) => {
    const style = getCardStyle(q.styleVariation, q.hasQueue);

    return (
      <div className="text-center py-4">
        {q.hasQueue ? (
          <div className="space-y-2 sm:space-y-3">
            <span
              className={`text-4xl sm:text-5xl font-black ${style.numberColor} tracking-widest block`}>
              {q.number}
            </span>
            <div className="flex items-center justify-center gap-2">
              <i
                className={`pi pi-headphones text-lg sm:text-2xl ${style.loketColor}`}></i>
              <span
                className={`text-sm sm:text-lg font-medium ${style.loketColor}`}>
                {q.loket}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <span className="text-4xl sm:text-5xl font-black text-slate-400 tracking-widest block">
              000-000
            </span>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <i className="pi pi-headphones text-lg sm:text-2xl"></i>
              <span className="text-sm sm:text-lg font-medium">{q.loket}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main card component dengan variasi
  const ServiceCard = ({ data }) => {
    const style = getCardStyle(data.styleVariation, data.hasQueue);

    return (
      <div
        className={`bg-gradient-to-br ${style.gradient} border-2 ${style.border} rounded-2xl p-4 sm:p-5 shadow-lg ${style.shadow} flex flex-col h-full transition-all `}>
        {headerTemplate(data)}
        {cardContent(data)}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-white p-4 sm:p-6">
      <Toast ref={toast} />

      {/* Header dengan background yang lebih menarik */}
      <div className="text-center mb-6 sm:mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-8 shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
          ANTREAN MAL PELAYANAN PUBLIK
        </h1>
        <p className="text-blue-100 text-sm sm:text-base font-medium">
          KABUPATEN BANTUL
        </p>
        <div className="mt-4">
          <p className="text-blue-100 text-base sm:text-lg">
            {currentDate.toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Loading State dengan variasi skeleton */}
      {(isCountersLoading || isQueuesLoading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} variation={index % 6} />
          ))}
        </div>
      )}

      {/* Error State */}
      {(isCountersError || isQueuesError) && (
        <div className="text-center py-6 sm:py-8 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
          <i className="pi pi-exclamation-triangle text-3xl sm:text-4xl text-red-500 mb-3 sm:mb-4"></i>
          <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
            Gagal Memuat Data
          </h3>
          <p className="text-red-600 text-sm sm:text-base">
            Silakan refresh halaman atau coba beberapa saat lagi
          </p>
        </div>
      )}

      {/* Data Grid dengan variasi card */}
      {!isCountersLoading && !isQueuesLoading && displayData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayData.map((q) => (
            <ServiceCard key={q.id} data={q} />
          ))}
        </div>
      )}

      {/* Empty State dengan design yang lebih menarik */}
      {!isCountersLoading && !isQueuesLoading && displayData.length === 0 && (
        <div className="text-center py-12 sm:py-16 bg-gradient-to-r from-slate-50 to-gray-100 border-2 border-slate-200 rounded-2xl">
          <i className="pi pi-inbox text-5xl sm:text-6xl text-slate-300 mb-3 sm:mb-4"></i>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">
            Tidak Ada Loket Tersedia
          </h3>
          <p className="text-slate-600 text-sm sm:text-base">
            Belum ada loket yang terdaftar dalam sistem
          </p>
        </div>
      )}
    </div>
  );
}