import React from "react";
import { Headphones, Users, CalendarDays } from "lucide-react";

const DashboardAdmin = () => {
  return (
    <div className="min-h-screen bg-gray-200 p-6">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* COUNTER */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-4xl font-semibold text-teal-700">5</p>
            <p className="text-gray-700 mt-1">Counter</p>
          </div>
          <Headphones size={48} className="text-teal-600" />
        </div>

        {/* USER */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-4xl font-semibold text-yellow-600">10</p>
            <p className="text-gray-700 mt-1">User</p>
          </div>
          <Users size={48} className="text-yellow-500" />
        </div>

        {/* ADMIN INFO */}
        <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-700 text-lg">Super Admin</p>
            <p className="text-gray-500 text-sm">12 November 2025</p>
          </div>
          <CalendarDays size={40} className="text-teal-600" />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JUMLAH ANTREAN */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="font-semibold text-gray-700 text-lg mb-4 flex gap-2 items-center">
            👥 Jumlah Antrean Pengunjung Hari Ini
          </p>

          <div className="space-y-3">
            {[
              { name: "Counter 1", num: 1, color: "bg-teal-500" },
              { name: "Counter 2", num: 1, color: "bg-yellow-500" },
              { name: "Counter 3", num: 5, color: "bg-teal-800" },
              { name: "Counter 4", num: 1, color: "bg-purple-500" },
              { name: "Counter 5", num: 2, color: "bg-amber-600" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <p className="text-gray-700">{item.name}</p>
                <span
                  className={`text-white text-sm w-6 h-6 flex items-center justify-center rounded-full ${item.color}`}
                >
                  {item.num}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TABEL ANTREAN SAAT INI */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="font-semibold text-gray-700 text-lg mb-4 flex gap-2 items-center">
            🧍‍♂️ Antrean Saat Ini
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
                <th className="p-2 border border-gray-300 text-center">
                  Nomor
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Counter 1", "KTP", "A-001"],
                ["Counter 2", "Kartu Keluarga (KK)", "B-005"],
                ["Counter 3", "BPJS", "C-003"],
                ["Counter 4", "Samsat", "D-009"],
                ["Counter 5", "ESDM", "E-010"],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((col, j) => (
                    <td
                      key={j}
                      className={`p-2 border border-gray-300 text-center ${
                        j === 2 ? "font-bold text-gray-900" : ""
                      }`}
                    >
                      {col}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
