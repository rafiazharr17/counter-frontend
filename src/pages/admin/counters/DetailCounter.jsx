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
import { useGetQueuesByCounterQuery } from "../../../features/queues/queueApi";

function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Format durasi: "X jam Y menit", "X menit Y detik", atau "Y detik"
function formatDurationId(seconds) {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h} jam${m ? ` ${m} menit` : ""}`;
  }
  if (m > 0) {
    return `${m} menit${ss ? ` ${ss} detik` : ""}`;
  }
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

  // Fetch Counter Info
  const { data: counter, isLoading: isCounterLoading } =
    useGetCounterQuery(counterId);

  // Delete Mutation
  const [deleteCounter, { isLoading: isDeleting }] = useDeleteCounterMutation();

  // Fetch Statistics
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useGetCounterStatisticsQuery(
    { id: counterId, date: ymd },
    { skip: !ymd }
  );

  // Fetch Queue Activity
  const {
    data: queues = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
  } = useGetQueuesByCounterQuery({ counterId, date: ymd }, { skip: !ymd });

  const showDeleteDialog = () => {
    setDeleteDialogVisible(true);
  };

  const handleDeleteCounter = async () => {
    try {
      const result = await deleteCounter(counterId);

      if (result.error) {
        throw new Error(
          result.error.data?.message ||
            result.error.message ||
            "Gagal menghapus counter"
        );
      }

      if (result.data) {
        setDeleteDialogVisible(false);
        toast.current.show({
          severity: "success",
          summary: "Berhasil Dihapus",
          detail: `Counter "${counter?.name}" telah berhasil dihapus`,
          life: 5000,
        });

        setTimeout(() => {
          navigate("/admin/counters");
        }, 1500);
      } else {
        throw new Error("Tidak ada data dalam response");
      }
    } catch (err) {
      setDeleteDialogVisible(false);
      toast.current.show({
        severity: "error",
        summary: "Gagal Menghapus",
        detail: err.message || "Terjadi kesalahan saat menghapus counter",
        life: 6000,
      });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogVisible(false);
    toast.current.show({
      severity: "info",
      summary: (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <i className="pi pi-info text-white text-sm" />
          </div>
          <span className="font-semibold text-white">Dibatalkan</span>
        </div>
      ),
      detail: (
        <div className="mt-2">
          <p className="text-blue-100">Penghapusan counter telah dibatalkan</p>
          <p className="text-blue-200 text-xs mt-1">
            Data counter tetap aman dalam sistem
          </p>
        </div>
      ),
      life: 4000,
      className:
        "!bg-gradient-to-r !from-blue-600 !to-blue-700 !border-0 !shadow-2xl backdrop-blur-md",
    });
  };

  if (isCounterLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-32 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-24 animate-pulse"></div>
            <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-100 rounded-2xl p-6 shadow-lg animate-pulse">
          <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/2"></div>
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/3"></div>
            <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* 🟦 PREMIUM TOAST */}
      <Toast ref={toast} position="top-right" className="!min-w-80" />

      {/* 🟥 PREMIUM CONFIRMATION DIALOG - CONTROLLED VERSION */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        header={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <i className="pi pi-trash text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Hapus Counter
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">Tindakan permanen</p>
            </div>
          </div>
        }
        message={
          <div className="space-y-4 p-6 bg-white">
            <div className="text-center">
              <p className="text-slate-700 text-base leading-relaxed">
                Anda akan menghapus counter{" "}
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
                    Data counter akan dihapus secara permanen dan tidak dapat
                    dikembalikan. Pastikan ini adalah tindakan yang Anda
                    inginkan.
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
              icon="pi pi-times px-3"
              outlined
              className="flex-1 !bg-blue-200 !text-slate-700 hover:!bg-blue-400 !font-medium !py-3 !rounded-xl transition-all duration-200"
              onClick={handleCancelDelete}
            />
            <Button
              label={isDeleting ? "Menghapus..." : "Ya, Hapus"}
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
          icon="pi pi-arrow-left px-2"
          outlined
          className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200 !font-medium !py-3 !px-3 !rounded-xl transition-all duration-200"
          onClick={() => navigate("/admin/counters")}
        />

        <div className="flex gap-3">
          <Button
            label="Edit Counter"
            icon="pi pi-pencil"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white !py-3 !px-6 !rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-semibold"
            onClick={() => navigate(`/admin/counters/${id}/edit`)}
          />
          <Button
            label={isDeleting ? "Menghapus..." : "Hapus Counter"}
            icon={isDeleting ? "pi pi-spinner pi-spin" : "pi pi-trash"}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white !py-3 !px-6 !rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-semibold"
            onClick={showDeleteDialog}
            disabled={isDeleting}
          />
        </div>
      </div>

      {/* Informasi Counter */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm mb-4">
          Informasi Counter
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-building text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">
                  Nama Layanan
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {counter?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-qrcode text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">
                  Kode Counter
                </p>
                <p className="text-lg font-bold text-slate-800 font-mono">
                  {counter?.counter_code}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-users text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">
                  Kuota Harian
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {counter?.quota} orang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-clock text-amber-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">
                  Jam Operasional
                </p>
                <p className="text-lg font-bold text-slate-800">
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
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
            Statistik Harian — {counter?.name}
          </h2>

          <div className="flex items-center gap-3">
            <i className="pi pi-calendar text-slate-400" />
            <Calendar
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              showButtonBar
              className="custom-calendar !border-2 !border-slate-200 !rounded-xl !bg-white/80 backdrop-blur-sm"
              inputClassName="!py-3 !rounded-xl px-4 !font-medium !text-slate-700 !placeholder-slate-400 !bg-white/80 backdrop-blur-sm !border-0"
              panelClassName="!border !border-slate-200 !rounded-xl !shadow-lg"
              // Custom styling untuk membuat tampilan lebih compact
              style={{ width: "200px" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg text-center">
            <div className="text-2xl font-bold">
              {isStatsLoading || !stats ? 0 : stats.total}
            </div>
            <div className="text-blue-100 text-sm font-medium mt-1">
              Total Antrian
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-5 rounded-2xl shadow-lg text-center">
            <div className="text-2xl font-bold">
              {isStatsLoading || !stats ? 0 : stats.called}
            </div>
            <div className="text-yellow-100 text-sm font-medium mt-1">
              Dipanggil
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-2xl shadow-lg text-center">
            <div className="text-2xl font-bold">
              {isStatsLoading || !stats ? 0 : stats.served}
            </div>
            <div className="text-green-100 text-sm font-medium mt-1">
              Dilayani
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-5 rounded-2xl shadow-lg text-center">
            <div className="text-2xl font-bold">
              {isStatsLoading || !stats ? 0 : stats.canceled}
            </div>
            <div className="text-red-100 text-sm font-medium mt-1">Batal</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg text-center">
            <div className="text-2xl font-bold">
              {isStatsLoading || !stats
                ? "-"
                : `${stats.avg_duration_minutes || 0} menit`}
            </div>
            <div className="text-purple-100 text-sm font-medium mt-1">
              Rata-rata
            </div>
          </div>
        </div>

        {isStatsError && (
          <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-center gap-3">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl" />
            <div>
              <p className="font-semibold">Gagal memuat statistik</p>
              <p className="text-sm">Untuk tanggal {ymd}</p>
            </div>
          </div>
        )}
      </div>

      {/* Riwayat Aktivitas */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm mb-6">
          Riwayat Aktivitas
        </h2>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable
            value={Array.isArray(queues) ? queues : []}
            paginator
            rows={10}
            stripedRows
            size="small"
            emptyMessage={
              <div className="text-center py-8 text-slate-500">
                <i className="pi pi-inbox text-3xl text-slate-300 mb-2" />
                <p className="font-medium">Tidak ada data aktivitas</p>
                <p className="text-sm">Untuk tanggal {ymd}</p>
              </div>
            }
            className="[&_.p-paginator]:!border-t [&_.p-paginator]:!border-slate-200 [&_.p-paginator]:!bg-slate-50">
            {/* Kolom Nomor Antrian */}
            <Column
              field="queue_number"
              header="Nomor Antrian"
              sortable
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200"
              bodyClassName="!font-bold !text-slate-800 !text-sm"
            />

            {/* Kolom Start */}
            <Column
              header="Start"
              body={(row) =>
                row.created_at
                  ? row?.created_at
                    ? new Date(row.created_at).toLocaleTimeString("id-ID")
                    : "-"
                  : "-"
              }
            />

            {/* Kolom Dipanggil */}
            <Column
              header="Dipanggil"
              body={(row) => {
                if (!row.called_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.called_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-start">
                    <span>
                      {row?.called_at
                        ? new Date(row.called_at).toLocaleTimeString("id-ID")
                        : "-"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
            />

            {/* Kolom Dilayani */}
            <Column
              header="Dilayani"
              body={(row) => {
                if (!row.served_at || !row.called_at) return "-";
                const diff =
                  (new Date(row.served_at) - new Date(row.called_at)) / 1000;
                return (
                  <div className="flex flex-col items-start">
                    <span>
                      {row?.served_at
                        ? new Date(row.served_at).toLocaleTimeString("id-ID")
                        : "-"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
            />

            {/* Kolom Selesai */}
            <Column
              header="Selesai"
              body={(row) => {
                if (!row.done_at || !row.served_at) return "-";
                const diff =
                  (new Date(row.done_at) - new Date(row.served_at)) / 1000;
                return (
                  <div className="flex flex-col items-start">
                    <span>
                      {row?.done_at
                        ? new Date(row.done_at).toLocaleTimeString("id-ID")
                        : "-"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
            />

            {/* Kolom Batal */}
            <Column
              header="Batal"
              body={(row) => {
                if (!row.canceled_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.canceled_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-start">
                    <span>
                      {row?.canceled_at
                        ? new Date(row.canceled_at).toLocaleTimeString("id-ID")
                        : "-"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
            />
          </DataTable>
        </div>

        {isQueuesLoading && (
          <p className="text-slate-500 mt-3">Memuat riwayat aktivitas...</p>
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

      {/* Custom CSS untuk Calendar */}
      <style jsx>{`
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
      `}</style>
    </div>
  );
}
