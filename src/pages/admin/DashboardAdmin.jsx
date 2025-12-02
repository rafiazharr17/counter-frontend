import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useGetCountersQuery } from "../../features/counters/counterApi";
// Pastikan path import ini sesuai dengan struktur folder Anda
import { useWebSocket } from "../../hooks/useWebSocket";

const DashboardAdmin = () => {
  const [counters, setCounters] = useState([]);
  const [queueStats, setQueueStats] = useState([]);
  const [activeQueues, setActiveQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);

  // Ambil data counters
  const { data: counterData, isLoading: loadingCounters } =
    useGetCountersQuery();

  // Update state counters saat data tersedia
  useEffect(() => {
    if (!counterData) return;
    setCounters(counterData);
  }, [counterData]);

  // --- HELPER FUNCTIONS ---

  // Fungsi untuk mengekstrak nomor antrian (angka terakhir)
  const getQueueNumber = (queue) => {
    if (!queue?.queue_number) return 0;
    const parts = queue.queue_number.split("-");
    if (parts.length >= 4) {
      const lastPart = parts[parts.length - 1];
      return parseInt(lastPart, 10) || 0;
    }
    return 0;
  };

  // Fungsi sorting (Status -> Nomor -> Waktu)
  const sortQueues = (queues) => {
    if (!queues || queues.length === 0) return [];

    const statusOrder = {
      waiting: 1,
      called: 2,
      served: 3,
      done: 4,
      canceled: 5,
    };

    return [...queues].sort((a, b) => {
      // 1. Prioritas Status
      const statusDiff =
        (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;

      // 2. Prioritas Nomor Antrian
      const queueNumA = getQueueNumber(a);
      const queueNumB = getQueueNumber(b);
      
      if (queueNumA !== queueNumB) {
         return queueNumA - queueNumB;
      }

      // 3. Fallback ke Waktu Created
      return new Date(a.created_at) - new Date(b.created_at);
    });
  };

  // Memoize sorted queues untuk performa render
  const sortedAllQueues = useMemo(() => {
    return sortQueues(allQueues);
  }, [allQueues]);

  // --- WEBSOCKET HANDLER ---

  const handleQueueUpdate = useCallback(
    (event) => {
      console.log("🔔 WebSocket event received:", event);

      if (!event) return;

      // FIX: Handle struktur data dari Laravel Reverb/Echo
      // Data biasanya dibungkus, misal: { queue: { id: 1, ... } }
      const queueData = event.queue || event;

      // Validasi data minimal
      if (!queueData || !queueData.counter_id) {
        console.warn("⚠️ Invalid queue data received:", queueData);
        return;
      }

      const counterId = parseInt(queueData.counter_id);
      
      console.log(
        `♻️ Processing update for Counter ${counterId}, Queue: ${queueData.queue_number}, Status: ${queueData.status}`
      );

      // Cari info loket berdasarkan ID untuk melengkapi data tampilan
      const counterInfo = counters.find((c) => c.id === counterId);

      // 1. Update List Antrian (All Queues)
      setAllQueues((prev) => {
        const newQueues = [...prev];

        const existingIndex = newQueues.findIndex(
          (q) => q.id === queueData.id
        );

        const updatedQueueObj = {
          id: queueData.id,
          counter_id: counterId,
          name: counterInfo?.name || `Loket ${counterId}`,
          counter_code:
            counterInfo?.counter_code ||
            getCounterCodeFromQueue(queueData.queue_number),
          queue_number: queueData.queue_number,
          status: queueData.status,
          created_at: queueData.created_at,
          called_at: queueData.called_at,
          served_at: queueData.served_at,
          done_at: queueData.done_at,
          canceled_at: queueData.canceled_at, // Pastikan field ini ada
        };

        if (existingIndex >= 0) {
          newQueues[existingIndex] = updatedQueueObj;
        } else {
          newQueues.push(updatedQueueObj);
        }

        return newQueues;
      });

      // 2. Update Statistik Sederhana (Opsional, agar angka real-time)
      // Kita update activeQueues juga agar sinkron
      setActiveQueues((prev) => {
         // Logika sama dengan allQueues, tapi filter status aktif saja jika perlu
         // Untuk penyederhanaan, kita bisa derive dari allQueues di render, 
         // tapi jika activeQueues state terpisah, kita update juga.
         return prev; 
      });

      // Update Queue Stats (Angka di kartu atas)
      setQueueStats((prevStats) => {
        return prevStats.map(stat => {
          if (stat.id === counterId) {
             // Jika ada antrian baru (status waiting dan baru dibuat), tambah total
             // Logika ini kompleks jika hanya mengandalkan event, 
             // paling aman adalah refetch stats, tapi untuk UI optimis:
             if (queueData.status === 'waiting' && !queueData.called_at) {
                 // Asumsi ini antrian baru
                 // return { ...stat, total: stat.total + 1 };
             }
          }
          return stat;
        });
      });
      
      // TRIGGER RELOAD DATA (Opsional tapi direkomendasikan untuk konsistensi data)
      // Jika ingin memastikan data 100% akurat dengan DB, uncomment baris bawah:
      // loadInitialData(); 
    },
    [counters] // Dependency counters diperlukan untuk lookup nama loket
  );

  // Integrasi WebSocket Hook
  // Karena hook kita sudah pakai useRef, perubahan pada handleQueueUpdate
  // TIDAK akan memutus koneksi WebSocket. Aman!
  useWebSocket(handleQueueUpdate);


  // --- INITIAL DATA LOADING ---
  
  const loadInitialData = async () => {
    if (!counterData || counterData.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().slice(0, 10);

      // 1. Load Stats
      const statsPromises = counterData.map(async (counter) => {
        try {
          const res = await fetch(
            `http://127.0.0.1:8000/api/counters/${counter.id}/statistics?date=${today}`,
            {
              headers: token
                ? {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  }
                : { "Content-Type": "application/json" },
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
          console.error(`Stats error for ${counter.id}:`, error);
          return {
            id: counter.id,
            name: counter.name,
            counter_code: counter.counter_code,
            total: 0,
            last_queue: null,
          };
        }
      });

      // 2. Load All Queues
      let allQueuesData = [];
      try {
        const guestRes = await fetch(
          "http://127.0.0.1:8000/api/guest/queues"
        );
        if (guestRes.ok) {
          const guestData = await guestRes.json();
          allQueuesData = guestData?.data || [];
        }
      } catch (error) {
        console.error("Error loading guest queues:", error);
      }

      const stats = await Promise.all(statsPromises);

      // Sort Stats
      const sortedStats = stats.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        return nameCompare !== 0
          ? nameCompare
          : a.counter_code.localeCompare(b.counter_code);
      });
      setQueueStats(sortedStats);

      // Process Queues Display
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
          canceled_at: guestQueue.canceled_at,
        };
      });

      setAllQueues(processedQueues);

      const activeStatuses = ["waiting", "called", "served"];
      setActiveQueues(
        processedQueues.filter((q) => activeStatuses.includes(q.status))
      );
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [counterData]); // Reload saat data loket tersedia


  // --- UI HELPERS ---

  const getCounterCodeFromQueue = (queueNumber) => {
    if (!queueNumber) return "-";
    const parts = queueNumber.split("-");
    return parts[0] || "-";
  };

  const formatQueueNumber = (queueNumber) => {
    if (!queueNumber) return "-";
    const parts = queueNumber.split("-");
    if (parts.length < 4) return queueNumber;
    return `${parts[0]}-${parts[1]}-${parts[3]}`;
  };

  const getLoketNumber = (counterCode) => {
    if (!counterCode) return "";
    const parts = counterCode.split("-");
    return parts.length > 1 ? parts[1] : counterCode;
  };

  const getStatusLabel = (status) => {
    const map = {
      waiting: "Menunggu",
      called: "Dipanggil",
      served: "Dilayani",
      done: "Selesai",
      canceled: "Batal",
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      waiting: "bg-blue-100 text-blue-800",
      called: "bg-yellow-100 text-yellow-800",
      served: "bg-orange-100 text-orange-800",
      done: "bg-green-100 text-green-800",
      canceled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  if (loadingCounters) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <i className="pi pi-spin pi-spinner mr-2"></i> Memuat data dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Total Loket */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-teal-700">
              {counters.length}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">Loket Aktif</p>
          </div>
          <i className="pi pi-desktop text-teal-600 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        {/* Card 2: Total Antrian Hari Ini (dari sortedAllQueues) */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-blue-600">
              {sortedAllQueues.length}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">Total Antrian</p>
          </div>
          <i className="pi pi-users text-blue-500 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        {/* Card 3: Tanggal */}
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-700 text-base sm:text-lg md:text-lg">
              Dashboard
            </p>
            <p className="text-gray-500 text-xs sm:text-sm md:text-sm">
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <i className="pi pi-calendar text-teal-600 text-2xl sm:text-3xl md:text-4xl opacity-80"></i>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        
        {/* KIRI: Statistik Per Loket */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="font-semibold text-slate-800 text-lg mb-4 flex gap-2 items-center">
            <i className="pi pi-chart-bar text-teal-600"></i>
            Antrian Per Loket
          </p>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {queueStats.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full ${index % 2 === 0 ? 'bg-teal-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-slate-700 font-medium text-sm sm:text-base">
                      {item.name}
                    </p>
                    <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Kode: {getLoketNumber(item.counter_code)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-bold text-slate-800">
                    {item.total}
                  </span>
                  <span className="text-xs text-slate-500">Antrian</span>
                </div>
              </div>
            ))}
            {queueStats.length === 0 && (
              <p className="text-center text-gray-400 py-4">Tidak ada data statistik</p>
            )}
          </div>
        </div>

        {/* KANAN: Tabel Semua Antrian (Live Update) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="font-semibold text-slate-800 text-lg mb-4 flex gap-2 items-center justify-between">
            <span className="flex items-center gap-2">
              <i className="pi pi-list text-blue-600"></i>
              Log Antrian Realtime
            </span>
            <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </p>

          <div className="overflow-x-auto max-h-[500px] rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center">No. Antrian</th>
                  <th className="px-4 py-3">Loket</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAllQueues.length > 0 ? (
                  sortedAllQueues.slice(0, 50).map((queue) => {
                    // Logic waktu display
                    let displayTime = queue.created_at;
                    if (queue.status === 'done' && queue.done_at) displayTime = queue.done_at;
                    else if (queue.status === 'served' && queue.served_at) displayTime = queue.served_at;
                    else if (queue.status === 'called' && queue.called_at) displayTime = queue.called_at;

                    const timeStr = displayTime 
                      ? new Date(displayTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) 
                      : "-";

                    return (
                      <tr key={queue.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-center text-slate-800">
                          {formatQueueNumber(queue.queue_number)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{queue.name}</div>
                          <div className="text-xs text-slate-400">{getLoketNumber(queue.counter_code)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(queue.status)}`}>
                            {getStatusLabel(queue.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-500">
                          {timeStr}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">
                      Belum ada aktivitas antrian hari ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default DashboardAdmin;