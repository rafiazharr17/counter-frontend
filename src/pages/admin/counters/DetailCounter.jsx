import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

// API Hooks
import {
  useGetCounterQuery,
  useGetCounterStatisticsQuery,
  useDeleteCounterMutation,
} from "../../../features/counters/counterApi";
import { useGetQueuesByCounterQuery } from "../../../features/queues/queueApi"; // GANTI INI

function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDurationId(seconds) {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h} jam${m ? ` ${m} menit` : ""}`;
  if (m > 0) return `${m} menit${ss ? ` ${ss} detik` : ""}`;
  return `${ss} detik`;
}

export default function DetailCounter() {
  const { id } = useParams();
  const counterId = Number(id);
  const navigate = useNavigate();
  const toast = useRef(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const ymd = useMemo(() => toYMD(selectedDate), [selectedDate]);

  const { data: counter, isLoading: isCounterLoading } = useGetCounterQuery({
    id: counterId,
  });

  const [deleteCounter, { isLoading: isDeleting }] = useDeleteCounterMutation();

  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useGetCounterStatisticsQuery(
    { id: counterId, date: ymd },
    { skip: !ymd }
  );

  // GANTI INI: Gunakan useGetQueuesByCounterQuery daripada useGetQueueLogsByCounterQuery
  const {
    data: queuesData = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
  } = useGetQueuesByCounterQuery({ counterId, date: ymd });

  // Process queues data untuk tabel riwayat
  const processedQueues = useMemo(() => {
    if (!queuesData || !Array.isArray(queuesData)) return [];

    console.log("Queues data for processing:", queuesData);

    return queuesData
      .filter((queue) => {
        // Filter berdasarkan tanggal dari queue_number
        if (!queue.queue_number) return false;

        try {
          const parts = queue.queue_number.split("-");
          if (parts.length < 3) return false;

          const dateNum = parts[2];
          if (!dateNum || dateNum.length !== 8) return false;

          const extractedYmd =
            dateNum.slice(0, 4) +
            "-" +
            dateNum.slice(4, 6) +
            "-" +
            dateNum.slice(6, 8);

          return extractedYmd === ymd;
        } catch (error) {
          console.error(
            "Error parsing queue number:",
            queue.queue_number,
            error
          );
          return false;
        }
      })
      .map((queue) => {
        // Format data untuk tabel
        return {
          queue_number: queue.queue_number,
          created_at: queue.created_at || null,
          called_at: queue.called_at || null,
          served_at: queue.served_at || null,
          done_at: queue.done_at || null,
          canceled_at: queue.canceled_at || null,
          status: queue.status || null,
        };
      })
      .sort((a, b) => {
        // Urutkan berdasarkan waktu created_at (terlama ke terbaru)
        const timeA = a.created_at ? new Date(a.created_at) : new Date(0);
        const timeB = b.created_at ? new Date(b.created_at) : new Date(0);
        return timeA - timeB;
      });
  }, [queuesData, ymd]);

  // Hitung statistik manual dari queues
  const displayStats = useMemo(() => {
    if (stats && !isStatsError) {
      return {
        total: stats.total || 0,
        done: stats.done || 0,
        canceled: stats.canceled || 0,
        avgDuration: stats.avg_duration_minutes || 0,
      };
    }

    // Fallback: hitung dari queues data
    const total = processedQueues.length;
    const done = processedQueues.filter((q) => q.status === "done").length;
    const canceled = processedQueues.filter(
      (q) => q.status === "canceled"
    ).length;

    // Hitung rata-rata durasi sederhana
    let totalDuration = 0;
    let durationCount = 0;

    processedQueues.forEach((queue) => {
      if (queue.status === "done" && queue.called_at && queue.done_at) {
        const calledTime = new Date(queue.called_at);
        const doneTime = new Date(queue.done_at);
        const duration = (doneTime - calledTime) / (1000 * 60); // dalam menit
        totalDuration += duration;
        durationCount++;
      }
    });

    const avgDuration =
      durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return {
      total,
      done,
      canceled,
      avgDuration,
    };
  }, [stats, isStatsError, processedQueues]);

  const showDeleteDialog = () => setDeleteDialogVisible(true);

  const handleDeleteCounter = async () => {
    try {
      const result = await deleteCounter(counterId);
      if (result.error)
        throw new Error(
          result.error.data?.message || "Gagal menghapus counter"
        );

      toast.current.show({
        severity: "success",
        summary: "Berhasil Dihapus",
        detail: `Loket "${counter?.name}" dan semua antreannya berhasil dihapus`,
        life: 5000,
      });

      setTimeout(() => navigate("/admin/counters"), 1500);
    } catch (err) {
      console.error("Delete loket error:", err);
      toast.current.show({
        severity: "error",
        summary: "Gagal Menghapus",
        detail: err.message,
        life: 6000,
      });
    } finally {
      setDeleteDialogVisible(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogVisible(false);
    toast.current.show({
      severity: "info",
      summary: "Dibatalkan",
      detail: "Penghapusan loket dibatalkan.",
      life: 4000,
    });
  };

  useEffect(() => {
    if (!isCounterLoading && !counter) {
      toast.current.show({
        severity: "warn",
        summary: "Loket Tidak Ditemukan",
        detail: "Loket mungkin sudah dihapus.",
        life: 4000,
      });
      setTimeout(() => navigate("/admin/counters"), 2000);
    }
  }, [counter, isCounterLoading, navigate]);

  if (isCounterLoading) {
    return (
      <div className="p-6 text-center text-slate-600">Memuat data loket...</div>
    );
  }

  if (!counter) {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md mx-auto">
          <i className="pi pi-exclamation-triangle text-yellow-500 text-4xl mb-4" />
          <h3 className="text-lg font-bold text-yellow-800 mb-2">
            Loket Tidak Ditemukan
          </h3>
          <p className="text-yellow-700 mb-4">Loket mungkin sudah dihapus.</p>
          <Button
            label="Kembali"
            icon="pi pi-arrow-left"
            onClick={() => navigate("/admin/counters")}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Toast ref={toast} position="top-right" className="!min-w-80" />

      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        header={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <i className="pi pi-trash text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Loket</h3>
              <p className="text-sm text-slate-500 mt-0.5">Tindakan permanen</p>
            </div>
          </div>
        }
        message={
          <div className="space-y-4 p-6 bg-white">
            <div className="text-center">
              <p className="text-slate-700 text-base leading-relaxed">
                Anda akan menghapus loket{" "}
                <span className="font-bold text-slate-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  "{counter?.name}"
                </span>
              </p>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-exclamation-triangle text-red-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-red-800 font-semibold text-sm">
                    Perhatian!
                  </p>
                  <p className="text-red-700 text-xs leading-relaxed">
                    Semua data loket dan antrean yang terkait akan dihapus
                    secara permanen dan tidak dapat dikembalikan.
                  </p>
                  <p className="text-red-700 text-xs leading-relaxed font-semibold mt-2">
                    ⚠️ {processedQueues.length} antrean akan ikut terhapus!
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
            <Button
              label="Batal"
              icon="pi pi-times"
              outlined
              className="flex-1 !bg-blue-200 !text-slate-700 hover:!bg-blue-400 !font-medium !py-3 !rounded-xl transition-all duration-200"
              onClick={handleCancelDelete}
            />
            <Button
              label={isDeleting ? "Menghapus..." : "Ya, Hapus Semua"}
              icon={isDeleting ? "pi pi-spinner pi-spin" : "pi pi-trash"}
              className={`flex-1 !font-medium !py-3 !rounded-xl transition-all duration-200 shadow-lg ${
                isDeleting
                  ? "!bg-red-400 !border-red-400 cursor-not-allowed"
                  : "!bg-gradient-to-r !from-red-500 !to-red-600 !border-red-500 hover:!from-red-600 hover:!to-red-700 hover:shadow-xl"
              }`}
              onClick={handleDeleteCounter}
              disabled={isDeleting}
            />
          </div>
        }
        className="!max-w-sm !rounded-2xl !border-0 !shadow-2xl"
        dismissableMask
      />

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          label="Kembali"
          icon="pi pi-arrow-left"
          outlined
          className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200 !font-medium !py-3 !px-4 sm:!px-3 !rounded-xl transition-all duration-200 w-full sm:w-auto justify-center"
          onClick={() => navigate("/admin/counters")}
        />

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            label="Edit Loket"
            icon="pi pi-pencil"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white !py-3 !px-4 sm:!px-6 !rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-semibold w-full sm:w-auto justify-center"
            onClick={() => navigate(`/admin/counters/${id}/edit`)}
          />
          <Button
            label={isDeleting ? "Menghapus..." : "Hapus Loket"}
            icon={isDeleting ? "pi pi-spinner pi-spin" : "pi pi-trash"}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white !py-3 !px-4 sm:!px-6 !rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-semibold w-full sm:w-auto justify-center"
            onClick={showDeleteDialog}
            disabled={isDeleting}
          />
        </div>
      </div>

      {/* Informasi Counter */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm mb-4">
          Informasi Loket
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-building text-blue-600 text-lg sm:text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                  Nama Layanan
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-800 truncate">
                  {counter?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-qrcode text-green-600 text-lg sm:text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                  Kode Loket
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-800 font-mono truncate">
                  {counter?.counter_code}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-users text-purple-600 text-lg sm:text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                  Kuota Harian
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-800">
                  {counter?.quota} orang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-clock text-amber-600 text-lg sm:text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
                  Jam Operasional
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-800 truncate">
                  {counter?.schedule_start && counter?.schedule_end
                    ? `${counter.schedule_start} - ${counter.schedule_end}`
                    : "Tidak ada jadwal"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistik Harian */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
            Statistik Harian — {counter?.name}
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <i className="pi pi-calendar text-slate-400 flex-shrink-0" />
            <Calendar
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              showButtonBar
              className="custom-calendar !border-2 !border-slate-200 !rounded-xl !bg-white/80 backdrop-blur-sm w-full sm:w-48"
              inputClassName="!py-3 !rounded-xl px-4 !font-medium !text-slate-700 !placeholder-slate-400 !bg-white/80 backdrop-blur-sm !border-0"
              panelClassName="!border !border-slate-200 !rounded-xl !shadow-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {displayStats.total}
            </div>
            <div className="text-blue-100 text-xs sm:text-sm font-medium mt-1">
              Total Antrian
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {displayStats.done}
            </div>
            <div className="text-green-100 text-xs sm:text-sm font-medium mt-1">
              Selesai
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {displayStats.canceled}
            </div>
            <div className="text-red-100 text-xs sm:text-sm font-medium mt-1">
              Batal
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
            <div className="text-lg sm:text-2xl font-bold">
              {displayStats.avgDuration} menit
            </div>
            <div className="text-purple-100 text-xs sm:text-sm font-medium mt-1">
              Rata-rata
            </div>
          </div>
        </div>

        {isStatsError && (
          <div className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 flex items-center gap-3">
            <i className="pi pi-info-circle text-amber-500 text-xl" />
            <div>
              <p className="font-semibold">
                Menampilkan statistik dari data antrian
              </p>
              <p className="text-sm">Untuk tanggal {ymd}</p>
            </div>
          </div>
        )}

        {(isStatsLoading || isQueuesLoading) && (
          <div className="mt-4 text-center text-slate-500">
            Memuat statistik...
          </div>
        )}
      </div>

      {/* Riwayat Aktivitas */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent mb-4 sm:mb-6">
          Riwayat Aktivitas ({processedQueues.length} antrean)
        </h2>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable
            value={processedQueues}
            paginator
            rows={10}
            stripedRows
            size="small"
            showGridlines
            className="custom-datatable text-center"
            paginatorClassName="!border-t !border-slate-200 !bg-slate-50/50 !p-3 !justify-center sticky-paginator"
            emptyMessage={
              <div className="text-center py-8 text-slate-500">
                <i className="pi pi-inbox text-3xl text-slate-300 mb-2" />
                <p className="font-medium">Tidak ada data aktivitas</p>
                <p className="text-sm">Untuk tanggal {ymd}</p>
              </div>
            }>
            <Column
              field="queue_number"
              header="Nomor Antrian"
              sortable
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!font-bold !text-slate-800 !text-sm !border-r !border-slate-200 text-center"
              style={{ minWidth: "120px" }}
            />
            <Column
              header="Start"
              body={(row) =>
                row.created_at
                  ? new Date(row.created_at).toLocaleTimeString("id-ID")
                  : "-"
              }
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "80px" }}
            />
            <Column
              header="Dipanggil"
              body={(row) => {
                if (!row.called_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.called_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.called_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Dilayani"
              body={(row) => {
                if (!row.served_at || !row.called_at) return "-";
                const diff =
                  (new Date(row.served_at) - new Date(row.called_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.served_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Selesai"
              body={(row) => {
                if (!row.done_at || !row.served_at) return "-";
                const diff =
                  (new Date(row.done_at) - new Date(row.served_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.done_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Batal"
              body={(row) => {
                if (!row.canceled_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.canceled_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.canceled_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 text-center"
              bodyClassName="text-center"
              style={{ minWidth: "100px" }}
            />
          </DataTable>
        </div>

        {isQueuesLoading && (
          <p className="text-slate-500 mt-3 text-center">
            Memuat riwayat aktivitas...
          </p>
        )}
        {isQueuesError && (
          <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-center gap-3">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl" />
            <div>
              <p className="font-semibold">Gagal memuat riwayat aktivitas</p>
              <p className="text-sm">Untuk tanggal {ymd}</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <style>{`
        .custom-calendar .p-calendar .p-inputtext {
          border: none !important;
          background: transparent !important;
        }
        .custom-calendar .p-datepicker {
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
        }
        .custom-calendar .p-datepicker table td > span {
          width: 2rem !important;
          height: 2rem !important;
        }
        .custom-calendar .p-datepicker .p-datepicker-header {
          padding: 0.5rem !important;
        }

        .custom-datatable .p-datatable-tbody > tr > td {
          border-right: 1px solid #e2e8f0 !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        .custom-datatable .p-datatable-thead > tr > th {
          border-right: 1px solid #e2e8f0 !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        .custom-datatable .p-datatable-tbody > tr > td:last-child {
          border-right: none !important;
        }
        .custom-datatable .p-datatable-thead > tr > th:last-child {
          border-right: none !important;
        }
        .custom-datatable .p-datatable-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .custom-datatable .p-datatable-thead > tr > th {
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .custom-datatable .p-column-header-content {
          justify-content: center !important;
          width: 100% !important;
        }
        .custom-datatable .p-datatable-thead > tr > th > .p-column-header-content {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
        }

        .custom-datatable .p-datatable-wrapper {
          overflow-x: auto !important;
        }

        .sticky-paginator {
          position: relative !important;
          z-index: 10 !important;
        }

        .custom-datatable .p-datatable-table {
          min-width: 800px;
        }

        @media (min-width: 640px) {
          .custom-datatable .p-datatable-table {
            min-width: auto;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .custom-datatable .p-datatable-thead > tr > th {
            font-size: 0.75rem !important;
            padding: 0.5rem !important;
          }
          .custom-datatable .p-datatable-tbody > tr > td {
            font-size: 0.75rem !important;
            padding: 0.5rem !important;
          }
          
          .custom-datatable .p-paginator {
            padding: 0.5rem !important;
          }
          
          .custom-datatable .p-paginator .p-paginator-current,
          .custom-datatable .p-paginator .p-paginator-first,
          .custom-datatable .p-paginator .p-paginator-prev,
          .custom-datatable .p-paginator .p-paginator-page,
          .custom-datatable .p-paginator .p-paginator-next,
          .custom-datatable .p-paginator .p-paginator-last {
            min-width: 2rem !important;
            height: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
