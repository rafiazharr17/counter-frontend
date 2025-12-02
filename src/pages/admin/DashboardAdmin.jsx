import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useGetCountersQuery } from "../../features/counters/counterApi";
import { useWebSocket } from "../../hooks/useWebSocket";

const DashboardAdmin = () => {
  const [counters, setCounters] = useState([]);
  const [queueStats, setQueueStats] = useState([]);
  const [activeQueues, setActiveQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  const { data: counterData, isLoading: loadingCounters } =
    useGetCountersQuery();

  // Load counters data
  useEffect(() => {
    if (!counterData) return;
    setCounters(counterData);
  }, [counterData]);

  // Fungsi untuk mengurutkan antrean sesuai aturan
  const sortQueues = (queues) => {
    if (!queues || queues.length === 0) return [];
    
    // Urutan prioritas status
    const statusOrder = {
      'waiting': 1,
      'called': 2,
      'served': 3,
      'done': 4,
      'canceled': 5
    };
    
    // Fungsi untuk mengekstrak nomor antrian (angka terakhir dari queue_number)
    const getQueueNumber = (queue) => {
      if (!queue.queue_number) return 0;
      const parts = queue.queue_number.split('-');
      if (parts.length >= 4) {
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10) || 0;
      }
      return 0;
    };
    
    // Salin array untuk diurutkan
    const sortedQueues = [...queues].sort((a, b) => {
      // Urutkan berdasarkan status terlebih dahulu
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      
      // Jika status sama, urutkan berdasarkan nomor antrian
      const queueNumA = getQueueNumber(a);
      const queueNumB = getQueueNumber(b);
      
      // Jika nomor antrian sama, urutkan berdasarkan waktu pembuatan
      if (queueNumA === queueNumB) {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      
      return queueNumA - queueNumB;
    });
    
    return sortedQueues;
  };

  // Gunakan useMemo untuk mengurutkan allQueues
  const sortedAllQueues = useMemo(() => {
    return sortQueues(allQueues);
  }, [allQueues]);

  // WebSocket handler
  const handleQueueUpdate = useCallback(
    (payload) => {
      console.log("WebSocket event received:", payload);

      if (!payload) {
        console.error("Payload is null or undefined");
        return;
      }

      try {
        const queueData = payload;
        const counterId = queueData.counter_id;

        if (!counterId) {
          console.error("Invalid queue data - missing counter_id:", queueData);
          return;
        }

        console.log(
          "Processing queue update for counter:",
          counterId,
          "queue:",
          queueData.queue_number
        );

        // Cari counter info
        const counterInfo = counters.find((c) => c.id === counterId);

        // Update allQueues
        setAllQueues((prev) => {
          const newQueues = [...prev];

          // Cek apakah queue sudah ada
          const existingIndex = newQueues.findIndex(
            (q) => q.id === queueData.id && q.counter_id === counterId
          );

          const updatedQueue = {
            id: queueData.id,
            counter_id: counterId,
            name: counterInfo?.name || `Counter ${counterId}`,
            counter_code:
              counterInfo?.counter_code ||
              getCounterCodeFromQueue(queueData.queue_number),
            queue_number: queueData.queue_number,
            status: queueData.status,
            created_at: queueData.created_at,
            called_at: queueData.called_at,
            served_at: queueData.served_at,
            done_at: queueData.done_at,
          };

          if (existingIndex >= 0) {
            // Update queue yang sudah ada
            newQueues[existingIndex] = updatedQueue;
            console.log("Updated existing queue:", queueData.queue_number);
          } else {
            // Tambah queue baru
            newQueues.push(updatedQueue);
            console.log("Added new queue:", queueData.queue_number);
          }

          return newQueues;
        });
      } catch (error) {
        console.error("Error processing queue update:", error);
      }
    },
    [counters]
  );

  // Gunakan WebSocket hook
  useWebSocket(handleQueueUpdate);

  // Load initial data
  useEffect(() => {
    if (!counterData || counterData.length === 0) return;

    const loadInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        const today = new Date().toISOString().slice(0, 10);

        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        // Load statistics for each counter
        const statsPromises = counterData.map(async (counter) => {
          try {
            const res = await fetch(
              `http://127.0.0.1:8000/api/counters/${counter.id}/statistics?date=${today}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            return {
              id: counter.id,
              name: counter.name,
              counter_code: counter.counter_code,
              total: data.data?.total || 0,
              last_queue: data.data?.last_queue || null,
            };
          } catch (error) {
            console.error(
              `Error loading stats for counter ${counter.id}:`,
              error
            );
            return {
              id: counter.id,
              name: counter.name,
              counter_code: counter.counter_code,
              total: 0,
              last_queue: null,
            };
          }
        });

        // Load semua guest queues
        let allQueuesData = [];
        try {
          const guestRes = await fetch(
            "http://127.0.0.1:8000/api/guest/queues"
          );
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            allQueuesData = guestData?.data || [];
            console.log(
              "Loaded ALL queues (no time filter):",
              allQueuesData.length
            );
          }
        } catch (error) {
          console.error("Error loading guest queues:", error);
        }

        const stats = await Promise.all(statsPromises);

        // Urutkan stats berdasarkan nama loket (abjad) dan counter_code
        const sortedStats = stats.sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name);
          if (nameCompare !== 0) return nameCompare;
          return a.counter_code.localeCompare(b.counter_code);
        });

        setQueueStats(sortedStats);

        // Process semua antrean untuk ditampilkan
        const processedQueues = allQueuesData.map((guestQueue) => {
          const counterInfo = counterData.find(
            (c) => c.id === guestQueue.counter_id
          );
          return {
            id: guestQueue.id,
            counter_id: guestQueue.counter_id,
            name: counterInfo?.name || `Counter ${guestQueue.counter_id}`,
            counter_code:
              counterInfo?.counter_code ||
              getCounterCodeFromQueue(guestQueue.queue_number),
            queue_number: guestQueue.queue_number,
            status: guestQueue.status,
            created_at: guestQueue.created_at,
            called_at: guestQueue.called_at,
            served_at: guestQueue.served_at,
            done_at: guestQueue.done_at,
          };
        });

        console.log("All processed queues for display:", processedQueues);
        
        // Set allQueues dengan data yang sudah diproses
        // Sorting akan dilakukan oleh useMemo
        setAllQueues(processedQueues);

        // Filter untuk antrian aktif (waiting, called, served) untuk tampilan khusus
        const activeStatuses = ["waiting", "called", "served"];
        const activeQueuesOnly = processedQueues.filter((q) =>
          activeStatuses.includes(q.status)
        );
        setActiveQueues(activeQueuesOnly);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [counterData]);

  // Helper function
  const getCounterCodeFromQueue = (queueNumber) => {
    if (!queueNumber) return "-";
    const parts = queueNumber.split("-");
    return parts[0] || "-";
  };

  // Format queue number helper
  const formatQueueNumber = (queueNumber) => {
    if (!queueNumber) return "-";

    const parts = queueNumber.split("-");
    if (parts.length < 4) return queueNumber;

    const first6 = `${parts[0]}-${parts[1]}`;
    const last3 = parts[3];

    return `${first6}-${last3}`;
  };

  // Helper untuk mengekstrak nomor loket dari counter_code
  const getLoketNumber = (counterCode) => {
    if (!counterCode) return "";
    const parts = counterCode.split("-");
    return parts.length > 1 ? parts[1] : counterCode;
  };

  // Helper untuk mendapatkan label status
  const getStatusLabel = (status) => {
    const statusLabels = {
      waiting: "Menunggu",
      called: "Dipanggil",
      served: "Dilayani",
      done: "Selesai",
      canceled: "Batal",
    };
    return statusLabels[status] || status;
  };

  // Helper untuk mendapatkan warna status
  const getStatusColor = (status) => {
    const statusColors = {
      waiting: "bg-blue-100 text-blue-800",
      called: "bg-yellow-100 text-yellow-800",
      served: "bg-orange-100 text-orange-800",
      done: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (loadingCounters) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Memuat data dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-teal-700">
              {counters.length}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">Loket</p>
          </div>
          <i className="pi pi-headphones text-teal-600 text-3xl sm:text-4xl md:text-5xl"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-yellow-600">
              10
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">User</p>
          </div>
          <i className="pi pi-users text-yellow-500 text-3xl sm:text-4xl md:text-5xl"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-700 text-base sm:text-lg md:text-lg">
              Super Admin
            </p>
            <p className="text-gray-500 text-xs sm:text-sm md:text-sm">
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <i className="pi pi-calendar text-teal-600 text-2xl sm:text-3xl md:text-4xl"></i>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Statistik Section */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20">
          <p className="font-semibold text-gray-700 text-base sm:text-lg md:text-lg mb-3 sm:mb-4 flex gap-2 items-center">
            <i className="pi pi-users text-sm sm:text-base"></i>
            <span className="text-sm sm:text-base md:text-lg">
              Jumlah Antrean Hari Ini
            </span>
          </p>

          <div className="space-y-2 sm:space-y-3">
            {queueStats.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-gray-100 pb-1 sm:pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-gray-700 text-sm sm:text-base">
                    {item.name}
                  </p>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Loket {getLoketNumber(item.counter_code)}
                  </span>
                </div>
                <span
                  className={`text-white text-xs sm:text-sm w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    index % 2 === 0
                      ? "bg-teal-500"
                      : index % 3 === 0
                      ? "bg-purple-500"
                      : "bg-amber-600"
                  }`}>
                  {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Semua Antrean Section - MENGGUNAKAN sortedAllQueues */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20">
          <p className="font-semibold text-gray-700 text-base sm:text-lg md:text-lg mb-3 sm:mb-4 flex gap-2 items-center">
            <i className="pi pi-list text-sm sm:text-base"></i>
            <span className="text-sm sm:text-base md:text-lg">
              Antrean Saat Ini ({sortedAllQueues.length})
            </span>
          </p>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full border border-gray-300 text-gray-700 min-w-[300px]">
              <thead className="bg-teal-700 text-white">
                <tr>
                  <th className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                    Loket
                  </th>
                  <th className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                    Jenis Pelayanan
                  </th>
                  <th className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                    Nomor
                  </th>
                  <th className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                    Status
                  </th>
                  <th className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                    Waktu
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedAllQueues.length > 0 ? (
                  sortedAllQueues
                    .slice(0, 100) // Batasi hanya 100 data untuk performa
                    .map((queue) => {
                      // Tentukan waktu yang akan ditampilkan berdasarkan status
                      let displayTime = "-";
                      if (queue.status === "done" && queue.done_at) {
                        displayTime = new Date(
                          queue.done_at
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      } else if (queue.status === "served" && queue.served_at) {
                        displayTime = new Date(
                          queue.served_at
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      } else if (queue.status === "called" && queue.called_at) {
                        displayTime = new Date(
                          queue.called_at
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      } else if (queue.created_at) {
                        displayTime = new Date(
                          queue.created_at
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }

                      return (
                        <tr key={queue.id}>
                          <td className="p-2 border border-gray-300 text-center font-semibold text-xs sm:text-sm">
                            Loket{" "}
                            {getLoketNumber(queue.counter_code) ||
                              queue.queue_number?.split("-")[1] ||
                              "000"}
                          </td>
                          <td className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                            {queue.name}
                          </td>
                          <td className="p-2 border border-gray-300 text-center font-bold text-xs sm:text-sm">
                            {formatQueueNumber(queue.queue_number)}
                          </td>
                          <td className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                queue.status
                              )}`}>
                              {getStatusLabel(queue.status)}
                            </span>
                          </td>
                          <td className="p-2 border border-gray-300 text-center text-xs sm:text-sm">
                            {displayTime}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center text-gray-500 py-3 sm:py-4 italic text-xs sm:text-sm">
                      Tidak ada antrean hari ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;