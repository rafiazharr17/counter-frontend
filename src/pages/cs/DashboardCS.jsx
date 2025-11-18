import React, { useState, useMemo } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { useNavigate } from "react-router-dom";

export default function DashboardCS() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const counters = [
    {
      id: 1,
      name: "BPJS",
      counter_code: "BP-001",
      quota: "100 / hari",
      schedule_start: "08:00:00",
      schedule_end: "15:00:00",
    },
    {
      id: 2,
      name: "Samsat",
      counter_code: "SM-002",
      quota: "80 / hari",
      schedule_start: "09:00:00",
      schedule_end: "14:00:00",
    },
    {
      id: 3,
      name: "Pelayanan Pajak Bumi dan Bangunan",
      counter_code: "PBB-003",
      quota: "120 / hari",
      schedule_start: "08:30:00",
      schedule_end: "15:30:00",
    },
  ];

  const getCounterNumber = (code) => {
    const parts = code.split("-");
    return parts.length > 1 ? parts[1] : "000";
  };

  const filteredCounters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return counters;
    return counters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.counter_code.toLowerCase().includes(q)
    );
  }, [search, counters]);

  return (
    <div className="space-y-6 p-6 bg-gray-100 min-h-screen">
      {/* 🟦 Toolbar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl bg-white/80 border border-slate-200/80 p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
            Dashboard CS
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Pantau seluruh counter layanan publik
          </p>
        </div>

        {/* 🔍 Search Bar */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="p-input-icon-left">
            <i className="pi pi-search px-3 text-slate-400" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari counter..."
              className="rounded-xl border border-slate-300 pl-10 
               focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/30 
               shadow-sm py-3 w-64"
            />
          </span>
        </div>
      </div>

      {/* 🟩 Counter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCounters.map((counter) => (
          <div
            key={counter.id}
            onClick={() => navigate(`/cs/${counter.id}`)}
            className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-6 shadow-lg shadow-slate-200/20 flex flex-col h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:scale-[1.02] group"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                  {counter.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Kode:{" "}
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded-lg">
                    {counter.counter_code}
                  </span>
                </p>
              </div>
              <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200">
                Counter {getCounterNumber(counter.counter_code)}
              </span>
            </div>

            {/* Kuota */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-users text-blue-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {counter.quota}
                </p>
                <p className="text-xs text-slate-500">Kuota layanan</p>
              </div>
            </div>

            {/* Jadwal */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-clock text-green-600 text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {counter.schedule_start} - {counter.schedule_end}
                </p>
                <p className="text-xs text-slate-500">Jam operasional</p>
              </div>
            </div>

            {/* Tombol Edit */}
            <div className="text-center mt-auto">
              <Button
                label="Edit"
                icon="pi pi-pencil"
                className="w-full bg-amber-50 border border-amber-300 text-amber-700 font-semibold rounded-xl px-5 py-3 hover:bg-amber-100 focus:outline-none focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/cs/${counter.id}/edit`);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 🌫 Empty State */}
      {filteredCounters.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-12 text-center text-slate-500 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <i className="pi pi-inbox text-slate-400 text-3xl" />
          </div>
          <p className="text-xl font-semibold text-slate-600 mb-2">
            Tidak ada counter ditemukan
          </p>
          <p className="text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau muat ulang halaman.
          </p>
        </div>
      )}
    </div>
  );
}
