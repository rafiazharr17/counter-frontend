import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

// API Hooks
import { useGetCounterQuery, useGetCounterStatisticsQuery } from "../../../features/counters/counterApi";
import { useGetQueuesByCounterQuery } from "../../../features/queues/queueApi";

function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function autoFormatSeconds(sec) {
  if (sec == null || Number.isNaN(sec) || sec < 0) return "-";
  if (sec < 60) return `${Math.round(sec)} detik`;
  return `${(sec / 60).toFixed(2)} menit`;
}

export default function DetailCounter() {
  const { id } = useParams();
  const counterId = Number(id);
  const navigate = useNavigate();
  const toast = useRef(null);

  const [status, setStatus] = useState("active");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const ymd = useMemo(() => toYMD(selectedDate), [selectedDate]);

  // Fetch Counter Info
  const { data: counter, isLoading: isCounterLoading } = useGetCounterQuery(counterId);

  // Fetch Statistics
  const {
    data: stats, // langsung objek data, bukan {message,data}
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useGetCounterStatisticsQuery({ id: counterId, date: ymd });

  // Fetch Queue Activity
  const {
    data: queues = [],
    isLoading: isQueuesLoading,
    isError: isQueuesError,
  } = useGetQueuesByCounterQuery({ counterId, date: ymd });

  useEffect(() => {
    if (counter) setStatus("active");
  }, [counter]);

  const softDelete = () => {
    confirmDialog({
      message: `Yakin ingin menonaktifkan counter "${counter?.name}"?`,
      header: "Konfirmasi Nonaktifkan",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Ya, Nonaktifkan",
      rejectLabel: "Batal",
      accept: () => {
        setStatus("inactive");
        toast.current?.show({
          severity: "warn",
          summary: "Dinonaktifkan",
          detail: `Counter "${counter?.name}" telah dinonaktifkan`,
        });
      },
    });
  };

  const restore = () => {
    confirmDialog({
      message: `Aktifkan kembali counter "${counter?.name}"?`,
      header: "Konfirmasi Aktifkan",
      icon: "pi pi-check-circle",
      acceptLabel: "Aktifkan",
      rejectLabel: "Batal",
      accept: () => {
        setStatus("active");
        toast.current?.show({
          severity: "success",
          summary: "Aktif kembali",
          detail: `Counter "${counter?.name}" telah diaktifkan`,
        });
      },
    });
  };

  const statusBadge = (row) => {
    const map = {
      waiting: { cls: "bg-gray-100 text-gray-700", label: "Menunggu" },
      called: { cls: "bg-yellow-100 text-yellow-700", label: "Dipanggil" },
      served: { cls: "bg-green-100 text-green-700", label: "Selesai" },
      canceled: { cls: "bg-red-100 text-red-700", label: "Batal" },
    };
    const cfg = map[row.status] || { cls: "bg-gray-100 text-gray-700", label: row.status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  // Durasi status waktu
  const statusDurationBody = (row) => {
    const toMs = (ts) => (ts ? new Date(ts).getTime() : null);
    const created = toMs(row.created_at);
    const served = toMs(row.served_at);
    const canceled = toMs(row.canceled_at);

    if (!created) return "-";

    let seconds = null;

    if (row.status === "served" && served) {
      seconds = (served - created) / 1000;
    } else if (row.status === "canceled" && canceled) {
      seconds = (canceled - created) / 1000;
    } else if (row.status === "called") {
      seconds = (Date.now() - created) / 1000;
    } else {
      return "-";
    }

    return autoFormatSeconds(seconds);
  };

  if (isCounterLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-5">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <Button
          label="Kembali"
          icon="pi pi-arrow-left"
          outlined
          onClick={() => navigate("/admin/counters")}
        />

        <div className="flex gap-2">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            severity="info"
            onClick={() => navigate(`/admin/counters/${id}/edit`)}
          />
          {status === "active" ? (
            <Button label="Nonaktifkan" icon="pi pi-trash" severity="danger" onClick={softDelete} />
          ) : (
            <Button label="Aktifkan" icon="pi pi-refresh" severity="success" onClick={restore} />
          )}
        </div>
      </div>

      {/* Informasi Counter */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Informasi Counter</h2>
        <div className="bg-white shadow p-4 rounded-xl border border-gray-200 space-y-2 text-gray-700">
          <p><strong>Nama Layanan:</strong> {counter?.name}</p>
          <p><strong>Kode Counter:</strong> {counter?.counter_code}</p>
          <p><strong>Kuota:</strong> {counter?.quota} / hari</p>
          <p>
            <strong>Jadwal:</strong>{" "}
            {counter?.schedule_start && counter?.schedule_end
              ? `${counter.schedule_start} - ${counter.schedule_end}`
              : "Tidak ada jadwal"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {status === "active" ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
      </div>

      {/* Statistik Harian */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Statistik Harian — {counter?.name}
        </h2>

        <Calendar
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.value)}
          dateFormat="yy-mm-dd"
          showIcon
          className="mb-3"
        />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-blue-100 text-blue-700 p-4 rounded-xl shadow text-center font-semibold">
            Total: {isStatsLoading || !stats ? 0 : stats.total}
          </div>
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-xl shadow text-center font-semibold">
            Dipanggil: {isStatsLoading || !stats ? 0 : stats.called}
          </div>
          <div className="bg-green-100 text-green-700 p-4 rounded-xl shadow text-center font-semibold">
            Selesai: {isStatsLoading || !stats ? 0 : stats.served}
          </div>
          <div className="bg-red-100 text-red-700 p-4 rounded-xl shadow text-center font-semibold">
            Batal: {isStatsLoading || !stats ? 0 : stats.canceled}
          </div>
          <div className="bg-purple-100 text-purple-700 p-4 rounded-xl shadow text-center font-semibold">
            Rata-rata: {isStatsLoading || !stats ? "-" : `${stats.avg_duration_minutes} menit`}
          </div>
        </div>

        {isStatsError && (
          <div className="mt-2 text-sm text-red-600">
            Gagal memuat statistik untuk tanggal {ymd}.
          </div>
        )}
      </div>

      {/* Riwayat Aktivitas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Riwayat Aktivitas</h2>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <DataTable
            value={queues}
            paginator
            rows={5}
            stripedRows
            size="small"
            emptyMessage={isQueuesLoading ? "Memuat..." : "Tidak ada data"}
          >
            <Column field="id" header="ID Detail" sortable />
            <Column field="counter_id" header="ID Counter" sortable />
            <Column field="queue_number" header="No. Antrian" sortable />
            <Column header="Status" body={statusBadge} sortable />
            <Column header="Status Waktu" body={statusDurationBody} sortable />
          </DataTable>

          {isQueuesError && (
            <div className="mt-2 text-sm text-red-600">
              Gagal memuat riwayat aktivitas untuk tanggal {ymd}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
