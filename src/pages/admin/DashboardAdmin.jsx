import React, { useEffect, useState } from "react";
import axios from "axios";

const DashboardAdmin = () => {
  const [counters, setCounters] = useState([]); // untuk daftar counter
  const [queueStats, setQueueStats] = useState([]); // untuk jumlah antrean per counter
  const [currentQueues, setCurrentQueues] = useState([]); // antrean saat ini
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Ambil semua counter
        const countersRes = await axios.get(
          "http://127.0.0.1:8000/api/v1/counters"
        );
        const countersData = countersRes.data.data || countersRes.data;
        setCounters(countersData);

        // Ambil data statistik tiap counter (per tanggal hari ini)
        const today = new Date().toISOString().slice(0, 10);
        const statsPromises = countersData.map((counter) =>
          axios
            .get(
              `http://127.0.0.1:8000/api/v1/counters/${counter.id}/statistics?date=${today}`
            )
            .then((res) => ({
              id: counter.id,
              name: counter.name,
              total: res.data.data.total || 0,
            }))
            .catch(() => ({
              id: counter.id,
              name: counter.name,
              total: 0,
            }))
        );

        const stats = await Promise.all(statsPromises);
        setQueueStats(stats);

        // Ambil antrian aktif (status waiting / called / served)
        const queuesRes = await axios.get(
          `http://127.0.0.1:8000/api/v1/queues?date=${today}`
        );
        const queues = queuesRes.data.data || [];
        setCurrentQueues(
          queues.filter((q) =>
            ["waiting", "called", "served"].includes(q.status)
          )
        );

        setLoading(false);
      } catch (error) {
        console.error("Gagal memuat data dashboard:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Memuat data dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 p-6">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* COUNTER */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-4xl font-semibold text-teal-700">
              {counters.length}
            </p>
            <p className="text-gray-700 mt-1">Counter</p>
          </div>
          <i className="pi pi-headphones text-teal-600 text-5xl"></i>
        </div>

        {/* USER (belum ada endpoint) */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-4xl font-semibold text-yellow-600">10</p>
            <p className="text-gray-700 mt-1">User</p>
          </div>
          <i className="pi pi-users text-yellow-500 text-5xl"></i>
        </div>

        {/* ADMIN INFO */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-700 text-lg">Super Admin</p>
            <p className="text-gray-500 text-sm">
              {new Date().toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <i className="pi pi-calendar text-teal-600 text-4xl"></i>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JUMLAH ANTREAN */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="font-semibold text-gray-700 text-lg mb-4 flex gap-2 items-center">
            <i className="pi pi-users"></i> Jumlah Antrean Pengunjung Hari Ini
          </p>

          <div className="space-y-3">
            {queueStats.length > 0 ? (
              queueStats.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-gray-100 pb-1"
                >
                  <p className="text-gray-700">{item.name}</p>
                  <span
                    className={`text-white text-sm w-6 h-6 flex items-center justify-center rounded-full ${
                      index % 2 === 0
                        ? "bg-teal-500"
                        : index % 3 === 0
                        ? "bg-purple-500"
                        : "bg-amber-600"
                    }`}
                  >
                    {item.total}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Tidak ada data</p>
            )}
          </div>
        </div>

        {/* TABEL ANTREAN SAAT INI */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="font-semibold text-gray-700 text-lg mb-4 flex gap-2 items-center">
            <i className="pi pi-list"></i> Antrean Saat Ini
          </p>

          <table className="w-full border border-gray-300 text-gray-700">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="p-2 border border-gray-300 text-center">
                  Counter
                </th>
                <th className="p-2 border border-gray-300 text-center">
                  Jenis Pelayanan
                </th>
                <th className="p-2 border border-gray-300 text-center">Nomor</th>
              </tr>
            </thead>
            <tbody>
              {currentQueues.length > 0 ? (
                currentQueues.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-gray-300 text-center">
                      {row.counter?.name || "-"}
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {row.counter?.counter_code || "-"}
                    </td>
                    <td className="p-2 border border-gray-300 text-center font-bold text-gray-900">
                      {row.queue_number}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="text-center text-gray-500 py-4 italic"
                  >
                    Tidak ada antrean aktif
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
