import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
// GUNAKAN HOOK BARU untuk CS Dashboard
import { useGetCSDashboardCountersQuery } from "../../features/counters/counterApi";

export default function DashboardCS() {
  const navigate = useNavigate();
  const toast = useRef(null);

  // Ambil user dari localStorage untuk mengetahui role
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const userRole = storedUser?.role?.name || storedUser?.role || "";
  const isCS = userRole === "customer_service";
  const isAdmin = userRole === "admin";

  // Panggil getCSDashboardCounters untuk dashboard CS
  const {
    data: counters = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetCSDashboardCountersQuery();

  const [search, setSearch] = useState("");

  // Fungsi untuk mendapatkan nomor loket dari counter_code
  const getCounterNumber = (counterCode) => {
    if (!counterCode) return "000";
    const parts = counterCode.split("-");
    return parts.length > 1 ? parts[1] : "000";
  };

  // Fungsi untuk mendapatkan nama layanan dari counter name
  const getServiceName = (counterName) => {
    if (!counterName) return "Layanan";
    const words = counterName.split(" ");
    return words.length > 0 ? words[0] : counterName;
  };

  // Debug: Lihat data yang diterima
  console.log("CS Dashboard - Counters data:", counters);
  console.log("CS Dashboard - Counter count:", counters.length);
  console.log("CS Dashboard - User role:", userRole);

  // Jika CS dan tidak ada counter, tampilkan pesan
  if (isCS && !isLoading && counters.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
                Dashboard Customer Service
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {storedUser?.name || "User"} - Loket Anda
              </p>
            </div>

            <div className="flex flex-row gap-2">
              <Button
                icon="pi pi-eye"
                label="Display Antrean"
                className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                           text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                           duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                           flex items-center justify-center"
                onClick={() => navigate("/cs/display")}
              />

              <Button
                icon="pi pi-ticket"
                label="Ambil Antrean"
                className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                           text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                           duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                           flex items-center justify-center"
                onClick={() => navigate("/cs/ambil-antrean-cs")}
              />

              <Button
                icon="pi pi-sign-out"
                label="Logout"
                className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                           text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                           duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                           flex items-center justify-center"
                onClick={() => {
                  localStorage.clear();
                  navigate("/login");
                }}
              />
            </div>
          </div>
        </div>

        {/* No Counter Assigned Message */}
        <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-6 sm:p-8 md:p-12 text-center text-slate-500 backdrop-blur-sm">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <i className="pi pi-desktop text-slate-400 text-2xl sm:text-3xl" />
          </div>
          <p className="text-lg sm:text-xl font-semibold text-slate-600 mb-2">
            Belum ada loket yang ditugaskan
          </p>
          <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base mb-6">
            Hubungi administrator untuk menugaskan loket kepada akun Anda
          </p>

          {/* User Info */}
          <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Informasi Akun:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-left">
                <span className="text-slate-500">Nama:</span>
                <p className="font-medium">{storedUser?.name || "-"}</p>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Email:</span>
                <p className="font-medium">{storedUser?.email || "-"}</p>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Role:</span>
                <p className="font-medium capitalize">
                  {userRole.replace("_", " ") || "-"}
                </p>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Loket:</span>
                <p className="font-medium text-amber-600">Belum ditugaskan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan hanya 1 counter untuk CS
  const displayCounters = isCS ? counters.slice(0, 1) : counters;

  const CardSkeleton = () => (
    <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm animate-pulse">
      <div className="h-4 sm:h-5 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-2/3 mb-3" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/3 mb-4" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-5/12 mb-4" />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      {/* Toolbar */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              {isCS ? "Loket Anda" : "Daftar Loket"}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {isCS
                ? `Loket yang ditugaskan untuk ${storedUser?.name || "Anda"}`
                : "Kelola semua loket layanan publik"}
            </p>
          </div>

          <div className="flex flex-row gap-2">
            <Button
              icon="pi pi-eye"
              label="Display Antrean"
              className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                         text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                         duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                         flex items-center justify-center"
              onClick={() => navigate("/cs/display")}
            />

            <Button
              icon="pi pi-ticket"
              label="Ambil Antrean"
              className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                           text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                           duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                           flex items-center justify-center"
              onClick={() => navigate("/cs/ambil-antrean-cs")}
            />

            <Button
              icon="pi pi-sign-out"
              label="Logout"
              className="bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-400 hover:to-blue-300 
                         text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                         duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                         flex items-center justify-center"
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
            />
          </div>
        </div>

        {/* Search Section - hanya untuk admin */}
        {!isCS && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <InputText
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari loket..."
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3
                   focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/30 
                   shadow-sm py-2 sm:py-3 text-sm sm:text-base"
              />
            </div>

            {/* Info Stats */}
            <div className="flex items-center justify-between sm:justify-center gap-3 sm:gap-4 text-sm text-slate-600 bg-slate-50/80 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-200/60 min-w-0 flex-1 sm:flex-none">
              <div className="text-center flex-1 sm:flex-none">
                <div className="font-bold text-slate-800 text-sm sm:text-base">
                  {displayCounters.length}
                </div>
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {isCS ? "Loket Anda" : "Total Loket"}
                </div>
              </div>
              {!isCS && (
                <>
                  <div className="h-4 sm:h-6 w-px bg-slate-300 flex-shrink-0"></div>
                  <div className="text-center flex-1 sm:flex-none">
                    <div className="font-bold text-slate-800 text-sm sm:text-base">
                      {
                        new Set(
                          displayCounters.map((c) => getServiceName(c.name))
                        ).size
                      }
                    </div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      Jenis Layanan
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 sm:p-6 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-start sm:items-center gap-3 sm:gap-4 shadow-lg">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
            <i className="pi pi-exclamation-triangle text-red-500 text-base sm:text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-800 text-sm sm:text-base">
              Gagal memuat data loket
            </p>
            <p className="text-red-600 mt-1 text-xs sm:text-sm">
              {error?.status
                ? `Kode: ${error.status}`
                : "Silakan refresh halaman atau coba lagi nanti."}
            </p>
          </div>
          <Button
            icon="pi pi-refresh"
            label="Coba Lagi"
            className="bg-red-500 hover:bg-red-600 text-white whitespace-nowrap"
            onClick={refetch}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: isCS ? 1 : 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Counter Display untuk CS (hanya 1) */}
      {!isLoading && displayCounters.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {displayCounters.map((counter) => (
            <CounterCard
              key={counter.id}
              counter={counter}
              navigate={navigate}
              getCounterNumber={getCounterNumber}
              isCS={isCS}
            />
          ))}
        </div>
      )}

      {/* Empty State untuk admin */}
      {!isLoading && !isCS && displayCounters.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-6 sm:p-8 md:p-12 text-center text-slate-500 backdrop-blur-sm">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <i className="pi pi-inbox text-slate-400 text-2xl sm:text-3xl" />
          </div>
          <p className="text-lg sm:text-xl font-semibold text-slate-600 mb-2">
            {displayCounters.length === 0
              ? "Belum ada loket"
              : "Tidak ada hasil"}
          </p>
        </div>
      )}
    </div>
  );
}

// Komponen terpisah untuk Counter Card (diperbarui)
const CounterCard = ({ counter, navigate, getCounterNumber, isCS }) => {
  return (
    <div
      onClick={() => navigate(`/cs/counters/${counter.id}`)}
      className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex flex-col h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:scale-[1.02] group">
      {/* Header dengan badge khusus untuk CS */}
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
            {counter.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Kode:{" "}
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs">
              {counter.counter_code}
            </span>
          </p>

          {/* Badge khusus untuk CS */}
          {isCS && (
            <div className="mt-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm shadow-green-200">
                Loket Anda
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200 whitespace-nowrap">
            Loket {getCounterNumber(counter.counter_code)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5 flex-1">
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <i className="pi pi-users text-blue-600 text-xs sm:text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">
              {counter.quota || 50} / hari
            </p>
            <p className="text-xs text-slate-500">Kuota layanan</p>
          </div>
        </div>

        {counter.schedule_start && counter.schedule_end ? (
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-clock text-green-600 text-xs sm:text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {formatTime(counter.schedule_start)} -{" "}
                {formatTime(counter.schedule_end)}
              </p>
              <p className="text-xs text-slate-500">Jam operasional</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-clock text-amber-600 text-xs sm:text-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-700 truncate">
                Tidak ada jadwal
              </p>
              <p className="text-xs text-amber-600">Atur jadwal operasional</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function untuk format waktu
const formatTime = (timeString) => {
  if (!timeString) return "-";
  if (timeString.includes(":")) {
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
  }
  return timeString;
};
