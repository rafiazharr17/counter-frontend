import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetCounterQuery } from "../../../features/counters/counterApi";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

export default function DetailCounter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);

  // Fetch counter detail from API
  const { data: counter, isLoading } = useGetCounterQuery(id);

  // Soft status simulation
  const [status, setStatus] = useState("active");

  // Date filter for statistics & logs
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dummy logs (replace later with API)
  const [logs, setLogs] = useState([
    { id: 1, counter_id: id, queue_number: "A-001", status: "Call", time_status: "09:15:21" },
    { id: 2, counter_id: id, queue_number: "A-001", status: "Start", time_status: "09:16:10" },
    { id: 3, counter_id: id, queue_number: "A-001", status: "Done", time_status: "09:18:55" },
  ]);

  // Dummy statistics (replace later with API)
  const [statistics, setStatistics] = useState({
    total_queues: 35,
    called: 30,
    served: 28,
    canceled: 2,
    avg_duration: 180,
  });

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
        toast.current.show({
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
        toast.current.show({
          severity: "success",
          summary: "Aktif kembali",
          detail: `Counter "${counter?.name}" telah diaktifkan`,
        });
      },
    });
  };

  const statusBadge = (row) => {
    const s = row.status;
    const colors = {
      Start: "bg-blue-100 text-blue-700",
      Call: "bg-yellow-100 text-yellow-700",
      Done: "bg-green-100 text-green-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[s] || ""}`}>
        {s}
      </span>
    );
  };

  if (isLoading) return <p>Loading...</p>;

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
            <Button
              label="Nonaktifkan"
              icon="pi pi-trash"
              severity="danger"
              onClick={softDelete}
            />
          ) : (
            <Button
              label="Aktifkan"
              icon="pi pi-refresh"
              severity="success"
              onClick={restore}
            />
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
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}>
              {status === "active" ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
      </div>

      {/* Statistik Harian */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Statistik Harian</h2>

        {/* Date Picker */}
        <Calendar
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.value)}
          dateFormat="yy-mm-dd"
          showIcon
          className="mb-3"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-100 text-blue-700 p-4 rounded-xl shadow text-center font-semibold">
            Total: {statistics.total_queues}
          </div>
          <div className="bg-yellow-100 text-yellow-700 p-4 rounded-xl shadow text-center font-semibold">
            Dipanggil: {statistics.called}
          </div>
          <div className="bg-green-100 text-green-700 p-4 rounded-xl shadow text-center font-semibold">
            Selesai: {statistics.served}
          </div>
          <div className="bg-purple-100 text-purple-700 p-4 rounded-xl shadow text-center font-semibold">
            Rata-rata: {statistics.avg_duration} detik
          </div>
        </div>
      </div>

      {/* Riwayat Aktivitas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Riwayat Aktivitas</h2>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          <DataTable value={logs} paginator rows={5} stripedRows size="small">
            <Column field="id" header="ID Detail" sortable />
            <Column field="counter_id" header="ID Counter" sortable />
            <Column field="queue_number" header="No. Antrian" sortable />
            <Column header="Status" body={statusBadge} sortable />
            <Column field="time_status" header="Waktu Status" sortable />
          </DataTable>
        </div>
      </div>
    </div>
  );
}
