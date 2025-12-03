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
  const [recentlyCalled, setRecentlyCalled] = useState({});
  const [highlightedCounters, setHighlightedCounters] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update waktu realtime setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
  const {
    data: queuesData = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
    error: queuesError,
    refetch: refetchQueues,
  } = useGetQueuesQuery({ guest: true });

  // INTEGRASI WEBSOCKET - DIPERBAIKI
  useWebSocket((eventData) => {
    console.log("WebSocket Event di DisplayScreen:", eventData);

    // Debug: Tampilkan semua data yang diterima
    console.log("Event details:", {
      event: eventData.event,
      hasData: !!eventData.data,
      dataKeys: eventData.data ? Object.keys(eventData.data) : [],
      raw: eventData.raw,
    });

    // Refresh data untuk semua event antrian
    refetchQueues();

    // Cek berbagai format event yang mungkin
    const queueData = eventData.data || eventData.raw?.queue || eventData.raw;

    if (
      queueData &&
      (queueData.status === "called" ||
        eventData.event === "queue_called" ||
        eventData.event?.includes("called") ||
        eventData.raw?.queue?.status === "called")
    ) {
      const counterId = queueData.counter_id || queueData.counter?.id;

      if (counterId) {
        console.log(
          `Antrian dipanggil untuk counter ${counterId}:`,
          queueData.queue_number
        );

        // Simpan info antrian yang baru dipanggil
        setRecentlyCalled((prev) => ({
          ...prev,
          [counterId]: {
            queueNumber: queueData.queue_number,
            calledAt: new Date().getTime(),
            isHighlighted: true,
            rawData: queueData,
          },
        }));

        // Tambahkan ke daftar highlight
        setHighlightedCounters((prev) => new Set([...prev, counterId]));

        // Tampilkan toast notification
        if (toast.current) {
          toast.current.show({
            severity: "info",
            summary: "Antrian Dipanggil",
            detail: `Antrian ${formatQueueNumber(
              queueData.queue_number
            )} menuju Loket`,
            life: 5000,
          });
        }

        // PERBAIKAN: Hanya hapus highlight, JANGAN hapus queueNumber
        setTimeout(() => {
          setHighlightedCounters((prev) => {
            const newSet = new Set(prev);
            newSet.delete(counterId);
            return newSet;
          });

          // Tetap simpan queueNumber tapi hilangkan flag isHighlighted
          setRecentlyCalled((prev) => {
            const newObj = { ...prev };
            if (newObj[counterId]) {
              newObj[counterId].isHighlighted = false;
              // TETAP pertahankan queueNumber!
            }
            return newObj;
          });
        }, 15000); // 15 detik
      }
    }
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

  // Helper function untuk mendapatkan nama counter berdasarkan ID
  const getCounterName = (counterId) => {
    if (!countersData || !counterId) return "Loket";

    const counter = Array.isArray(countersData)
      ? countersData.find((c) => c.id === counterId)
      : countersData.data && Array.isArray(countersData.data)
      ? countersData.data.find((c) => c.id === counterId)
      : null;

    return counter?.name || "Loket";
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
    if (!queues) return [];

    return queues.filter((queue) => {
      if (!queue?.created_at) return false;
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

    // Prioritaskan antrian yang statusnya 'called' atau 'served'
    const activeQueue = counterQueues.find((queue) =>
      ["called", "served"].includes(queue.status)
    );

    // Jika tidak ada yang aktif, ambil yang terbaru dari semua status
    return activeQueue || counterQueues[0] || null;
  };

  // Get service code dari counter code atau nama
  const getServiceCode = (counter) => {
    if (counter?.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 0 ? parts[0] : counter.name?.charAt(0) || "A";
    }
    return counter?.name?.charAt(0) || "A";
  };

  // Get loket number dari counter code
  const getLoketNumber = (counter) => {
    if (counter?.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 1
        ? `Loket ${parts[1]}`
        : `Loket ${getServiceCode(counter)}`;
    }
    return `Loket ${getServiceCode(counter)}`;
  };

  // Get nomor loket untuk sorting
  const getLoketNumberForSorting = (counter) => {
    if (counter?.counter_code) {
      const parts = counter.counter_code.split("-");
      return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    }
    return 0;
  };

  // Get service name untuk sorting
  const getServiceNameForSorting = (counter) => {
    return counter?.name?.toLowerCase() || "";
  };

  // Data untuk display - diurutkan berdasarkan abjad dan nomor loket
  const displayData = useMemo(() => {
    if (!counters || counters.length === 0) return [];

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

      // Cek apakah antrian ini baru saja dipanggil
      const recentlyCalledInfo = recentlyCalled[counter.id];
      const isNewlyCalled =
        highlightedCounters.has(counter.id) &&
        recentlyCalledInfo &&
        recentlyCalledInfo.isHighlighted;

      // PERBAIKAN: Selalu prioritaskan antrian yang baru dipanggil
      let queueNumber;
      if (recentlyCalledInfo?.queueNumber) {
        // Jika ada antrian yang pernah dipanggil (baru saja atau sebelumnya), gunakan itu
        queueNumber = recentlyCalledInfo.queueNumber;
      } else if (recentQueue) {
        // Jika tidak ada yang pernah dipanggil, gunakan antrian terbaru
        queueNumber = formatQueueNumber(recentQueue.queue_number);
      } else {
        queueNumber = "000-000";
      }

      // Tentukan variasi style berdasarkan index
      const styleVariation = index % 6; // 6 variasi berbeda

      return {
        id: counter.id,
        number: formatQueueNumber(queueNumber),
        service: counter.name,
        loket: getLoketNumber(counter),
        hasQueue: !!recentQueue || !!recentlyCalledInfo?.queueNumber,
        isNewlyCalled: isNewlyCalled,
        currentQueue: recentQueue,
        recentlyCalledInfo: recentlyCalledInfo,
        styleVariation: styleVariation,
      };
    });
  }, [counters, todayQueues, currentDate, recentlyCalled, highlightedCounters]);

  // Debug: Log informasi untuk troubleshooting
  useEffect(() => {
    console.log("DisplayScreen State Update:", {
      totalCounters: displayData.length,
      newlyCalledCount: Object.keys(recentlyCalled).filter(
        (id) => recentlyCalled[id]?.isHighlighted
      ).length,
      highlightedCounters: Array.from(highlightedCounters),
      queuesToday: todayQueues.length,
      recentEvents: Object.keys(recentlyCalled).slice(0, 3),
    });
  }, [displayData, recentlyCalled, highlightedCounters, todayQueues]);

  // Fungsi untuk menentukan ukuran card berdasarkan jumlah loket
  const getCardSizeConfig = () => {
    const totalCounters = displayData.length;

    if (totalCounters <= 4) {
      // Sedikit loket - ukuran normal
      return {
        gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        gap: "gap-4 sm:gap-6",
        padding: "p-4 sm:p-5",
        serviceFont: "text-lg sm:text-xl",
        numberFont: "text-4xl sm:text-5xl",
        loketFont: "text-sm sm:text-lg",
        iconSize: "text-lg sm:text-2xl",
        headerGap: "gap-2 mb-4",
        cardPadding: "py-4",
        iconContainer: "w-8 h-8 sm:w-10 sm:h-10",
      };
    } else if (totalCounters <= 8) {
      // Sedang - sedikit lebih kecil
      return {
        gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        gap: "gap-3 sm:gap-4",
        padding: "p-3 sm:p-4",
        serviceFont: "text-base sm:text-lg",
        numberFont: "text-3xl sm:text-4xl",
        loketFont: "text-xs sm:text-base",
        iconSize: "text-base sm:text-xl",
        headerGap: "gap-1.5 mb-3",
        cardPadding: "py-3",
        iconContainer: "w-7 h-7 sm:w-8 sm:h-8",
      };
    } else if (totalCounters <= 12) {
      // Banyak - lebih kecil lagi
      return {
        gridCols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        gap: "gap-2.5 sm:gap-3",
        padding: "p-2.5 sm:p-3",
        serviceFont: "text-sm sm:text-base",
        numberFont: "text-2xl sm:text-3xl",
        loketFont: "text-xs sm:text-sm",
        iconSize: "text-sm sm:text-lg",
        headerGap: "gap-1 mb-2",
        cardPadding: "py-2",
        iconContainer: "w-6 h-6 sm:w-7 sm:h-7",
      };
    } else {
      // Sangat banyak - ukuran minimum
      return {
        gridCols:
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        gap: "gap-2 sm:gap-2.5",
        padding: "p-2 sm:p-2.5",
        serviceFont: "text-xs sm:text-sm",
        numberFont: "text-xl sm:text-2xl",
        loketFont: "text-xs",
        iconSize: "text-xs sm:text-base",
        headerGap: "gap-0.5 mb-1.5",
        cardPadding: "py-1.5",
        iconContainer: "w-5 h-5 sm:w-6 sm:h-6",
      };
    }
  };

  // Ambil konfigurasi ukuran berdasarkan jumlah loket
  const cardSizeConfig = getCardSizeConfig();

  // Fungsi untuk mendapatkan warna berdasarkan variasi DAN status baru dipanggil
  const getCardStyle = (variation, hasQueue, isNewlyCalled) => {
    const baseStyles = {
      0: {
        gradient: isNewlyCalled
          ? "from-blue-100 to-blue-200"
          : hasQueue
          ? "from-blue-50 to-blue-100"
          : "from-blue-50/60 to-blue-100/40",
        border: isNewlyCalled
          ? "border-4 border-blue-400"
          : "border-2 border-blue-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-blue-400/50"
          : "shadow-lg shadow-blue-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-blue-600 to-blue-700"
          : "bg-gradient-to-r from-blue-500 to-blue-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-blue-800" : "text-blue-700",
        serviceColor: isNewlyCalled ? "text-blue-900" : "text-blue-800",
        loketColor: isNewlyCalled ? "text-blue-700" : "text-blue-600",
      },
      1: {
        gradient: isNewlyCalled
          ? "from-green-100 to-green-200"
          : hasQueue
          ? "from-green-50 to-green-100"
          : "from-green-50/60 to-green-100/40",
        border: isNewlyCalled
          ? "border-4 border-green-400"
          : "border-2 border-green-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-green-400/50"
          : "shadow-lg shadow-green-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-green-600 to-green-700"
          : "bg-gradient-to-r from-green-500 to-green-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-green-800" : "text-green-700",
        serviceColor: isNewlyCalled ? "text-green-900" : "text-green-800",
        loketColor: isNewlyCalled ? "text-green-700" : "text-green-600",
      },
      2: {
        gradient: isNewlyCalled
          ? "from-purple-100 to-purple-200"
          : hasQueue
          ? "from-purple-50 to-purple-100"
          : "from-purple-50/60 to-purple-100/40",
        border: isNewlyCalled
          ? "border-4 border-purple-400"
          : "border-2 border-purple-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-purple-400/50"
          : "shadow-lg shadow-purple-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-purple-600 to-purple-700"
          : "bg-gradient-to-r from-purple-500 to-purple-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-purple-800" : "text-purple-700",
        serviceColor: isNewlyCalled ? "text-purple-900" : "text-purple-800",
        loketColor: isNewlyCalled ? "text-purple-700" : "text-purple-600",
      },
      3: {
        gradient: isNewlyCalled
          ? "from-orange-100 to-orange-200"
          : hasQueue
          ? "from-orange-50 to-orange-100"
          : "from-orange-50/60 to-orange-100/40",
        border: isNewlyCalled
          ? "border-4 border-orange-400"
          : "border-2 border-orange-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-orange-400/50"
          : "shadow-lg shadow-orange-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-orange-600 to-orange-700"
          : "bg-gradient-to-r from-orange-500 to-orange-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-orange-800" : "text-orange-700",
        serviceColor: isNewlyCalled ? "text-orange-900" : "text-orange-800",
        loketColor: isNewlyCalled ? "text-orange-700" : "text-orange-600",
      },
      4: {
        gradient: isNewlyCalled
          ? "from-teal-100 to-teal-200"
          : hasQueue
          ? "from-teal-50 to-teal-100"
          : "from-teal-50/60 to-teal-100/40",
        border: isNewlyCalled
          ? "border-4 border-teal-400"
          : "border-2 border-teal-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-teal-400/50"
          : "shadow-lg shadow-teal-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-teal-600 to-teal-700"
          : "bg-gradient-to-r from-teal-500 to-teal-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-teal-800" : "text-teal-700",
        serviceColor: isNewlyCalled ? "text-teal-900" : "text-teal-800",
        loketColor: isNewlyCalled ? "text-teal-700" : "text-teal-600",
      },
      5: {
        gradient: isNewlyCalled
          ? "from-pink-100 to-pink-200"
          : hasQueue
          ? "from-pink-50 to-pink-100"
          : "from-pink-50/60 to-pink-100/40",
        border: isNewlyCalled
          ? "border-4 border-pink-400"
          : "border-2 border-pink-200/80",
        shadow: isNewlyCalled
          ? "shadow-lg shadow-pink-400/50"
          : "shadow-lg shadow-pink-200/30",
        iconBg: isNewlyCalled
          ? "bg-gradient-to-r from-pink-600 to-pink-700"
          : "bg-gradient-to-r from-pink-500 to-pink-600",
        icon: "pi pi-desktop",
        numberColor: isNewlyCalled ? "text-pink-800" : "text-pink-700",
        serviceColor: isNewlyCalled ? "text-pink-900" : "text-pink-800",
        loketColor: isNewlyCalled ? "text-pink-700" : "text-pink-600",
      },
    };

    return baseStyles[variation] || baseStyles[0];
  };

  // Loading skeleton dengan variasi
  const SkeletonCard = ({ variation = 0 }) => {
    const style = getCardStyle(variation, true, false);

    return (
      <div
        className={`bg-gradient-to-br ${style.gradient} border-2 ${style.border} rounded-2xl ${cardSizeConfig.padding} shadow-lg ${style.shadow} flex flex-col h-full animate-pulse`}>
        <div
          className={`flex items-start justify-between ${cardSizeConfig.headerGap}`}>
          <div className="flex-1 min-w-0">
            <div
              className={`h-5 bg-gradient-to-r ${style.gradient
                .replace("from-", "from-")
                .replace("to-", "to-")} rounded-lg w-2/3 mb-2`}></div>
          </div>
          <div
            className={`rounded-full ${style.iconBg} ${cardSizeConfig.iconContainer}`}></div>
        </div>
        <div className={`text-center ${cardSizeConfig.cardPadding}`}>
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
    const style = getCardStyle(q.styleVariation, q.hasQueue, q.isNewlyCalled);

    return (
      <div
        className={`flex items-start justify-between ${cardSizeConfig.headerGap}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-bold ${style.serviceColor} truncate ${cardSizeConfig.serviceFont}`}>
              {q.service}
            </h3>
            {q.isNewlyCalled && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">
                Baru
              </span>
            )}
          </div>
        </div>
        <div
          className={`rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0 shadow-md ${cardSizeConfig.iconContainer}`}>
          <i className={`${style.icon} text-white text-xs sm:text-sm`}></i>
        </div>
      </div>
    );
  };

  // Card content dengan variasi
  const cardContent = (q) => {
    const style = getCardStyle(q.styleVariation, q.hasQueue, q.isNewlyCalled);

    return (
      <div className={`text-center ${cardSizeConfig.cardPadding}`}>
        {q.hasQueue ? (
          <div className="space-y-2 sm:space-y-3">
            <span
              className={`font-black ${
                style.numberColor
              } tracking-widest block ${cardSizeConfig.numberFont} ${
                q.isNewlyCalled ? "animate-pulse" : ""
              }`}>
              {q.number}
            </span>
            <div className="flex items-center justify-center gap-2">
              <i
                className={`pi pi-headphones ${cardSizeConfig.iconSize} ${style.loketColor}`}></i>
              <span
                className={`font-medium ${style.loketColor} ${cardSizeConfig.loketFont}`}>
                {q.loket}
              </span>
            </div>
            {q.isNewlyCalled && (
              <div className="text-xs text-blue-600 font-semibold animate-pulse">
                Silakan menuju loket
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <span
              className={`font-black text-slate-400 tracking-widest block ${cardSizeConfig.numberFont}`}>
              000-000
            </span>
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <i className={`pi pi-headphones ${cardSizeConfig.iconSize}`}></i>
              <span className={`font-medium ${cardSizeConfig.loketFont}`}>
                {q.loket}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main card component dengan variasi
  const ServiceCard = ({ data }) => {
    const style = getCardStyle(
      data.styleVariation,
      data.hasQueue,
      data.isNewlyCalled
    );

    return (
      <div
        className={`bg-gradient-to-br ${style.gradient} ${
          style.border
        } rounded-2xl ${cardSizeConfig.padding} ${
          style.shadow
        } flex flex-col h-full transition-all duration-300 ${
          data.isNewlyCalled ? "animate-pulse" : ""
        }`}>
        {headerTemplate(data)}
        {cardContent(data)}
      </div>
    );
  };

  // Hitung jumlah antrian yang baru dipanggil
  const newlyCalledCount = Object.keys(recentlyCalled).filter(
    (id) => recentlyCalled[id]?.isHighlighted
  ).length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-white p-4 sm:p-6">
      {/* Header */}
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
          <p className="text-blue-200 text-sm mt-1 font-mono">
            {currentTime.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Loading State dengan variasi skeleton */}
      {(isCountersLoading || isQueuesLoading) && (
        <div
          className={`grid ${cardSizeConfig.gridCols} ${cardSizeConfig.gap}`}>
          {Array.from({
            length: Math.min(12, Math.max(6, displayData.length || 6)),
          }).map((_, index) => (
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
        <div
          className={`grid ${cardSizeConfig.gridCols} ${cardSizeConfig.gap}`}>
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

      {/* Custom CSS untuk animasi */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.8);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
      `}</style>
    </div>
  );
}
