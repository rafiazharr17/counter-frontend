import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { useGetCountersQuery } from "../../../features/counters/counterApi";

export default function HomeCounter() {
  const navigate = useNavigate();
  const toast = useRef(null);

  // Ambil data counter dari API (RTK Query)
  const { data: counters = [], isLoading, isError, error } = useGetCountersQuery();

  // State UI
  const [search, setSearch] = useState("");
  const [localStatus, setLocalStatus] = useState({}); // { [id]: 'active' | 'inactive' }

  // Inisialisasi status lokal (default active) saat data masuk
  useEffect(() => {
    if (counters?.length) {
      const init = {};
      counters.forEach((c) => (init[c.id] = "active"));
      setLocalStatus(init);
    }
  }, [counters]);

  // Filter pencarian (name / counter_code)
  const filteredCounters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return counters;
    return counters.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.counter_code?.toLowerCase().includes(q)
    );
  }, [counters, search]);

  // Soft delete (UI saja)
  const handleDeactivate = (counter) => {
    confirmDialog({
      header: "Konfirmasi Nonaktifkan",
      message: `Yakin ingin menonaktifkan counter "${counter.name}"?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Ya, Nonaktifkan",
      rejectLabel: "Batal",
      accept: () => {
        setLocalStatus((prev) => ({ ...prev, [counter.id]: "inactive" }));
        toast.current?.show({
          severity: "warn",
          summary: "Dinonaktifkan",
          detail: `Counter "${counter.name}" telah dinonaktifkan.`,
        });
      },
    });
  };

  const handleActivate = (counter) => {
    confirmDialog({
      header: "Konfirmasi Aktifkan",
      message: `Aktifkan kembali counter "${counter.name}"?`,
      icon: "pi pi-check-circle",
      acceptLabel: "Aktifkan",
      rejectLabel: "Batal",
      accept: () => {
        setLocalStatus((prev) => ({ ...prev, [counter.id]: "active" }));
        toast.current?.show({
          severity: "success",
          summary: "Aktif",
          detail: `Counter "${counter.name}" telah diaktifkan kembali.`,
        });
      },
    });
  };

  const StatusBadge = ({ status }) => {
    const active = status === "active";
    const cls = active
      ? "bg-sky-100 text-sky-700"
      : "bg-gray-100 text-gray-600";
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
        {active ? "Active" : "Inactive"}
      </span>
    );
  };

  const CardSkeleton = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-5/12 mb-4" />
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 rounded w-20" />
        <div className="h-9 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header bar: title + tools */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Daftar Counter</h2>

        <div className="flex items-center gap-2">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari counter..."
              className="w-56"
            />
          </span>

          <Button
            label="Tambah"
            icon="pi pi-plus"
            severity="success"
            className="!text-sm"
            onClick={() => navigate("/admin/counters/new")}
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          Gagal memuat data counter. {error?.status ? `Kode: ${error.status}` : ""}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredCounters.length === 0 && (
        <div className="border border-gray-200 bg-white rounded-xl p-10 text-center text-slate-500">
          Tidak ada counter yang cocok dengan pencarian.
        </div>
      )}

      {/* Grid of Cards */}
      {!isLoading && filteredCounters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCounters.map((counter) => {
            const status = localStatus[counter.id] || "active";
            return (
              <div
                key={counter.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {counter.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kode: <span className="font-medium">{counter.counter_code}</span>
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* Body: Quota + Schedule */}
                <div className="mt-3 text-sm text-slate-600 space-y-1.5">
                  <p>Kuota: {counter.quota} / hari</p>
                  {counter.schedule_start && counter.schedule_end ? (
                    <p>
                      Jam: {counter.schedule_start} - {counter.schedule_end}
                    </p>
                  ) : (
                    <p className="italic text-slate-400">Tidak ada jadwal</p>
                  )}
                </div>

                {/* Footer: Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    label="Detail"
                    icon="pi pi-eye"
                    outlined
                    className="!text-sm"
                    onClick={() => navigate(`/admin/counters/${counter.id}`)}
                  />
                  <Button
                    label="Edit"
                    icon="pi pi-pencil"
                    severity="info"
                    className="!text-sm"
                    onClick={() => navigate(`/admin/counters/${counter.id}/edit`)}
                  />
                  {status === "active" ? (
                    <Button
                      label="Nonaktifkan"
                      icon="pi pi-trash"
                      severity="danger"
                      className="!text-sm"
                      onClick={() => handleDeactivate(counter)}
                    />
                  ) : (
                    <Button
                      label="Aktifkan"
                      icon="pi pi-refresh"
                      severity="success"
                      className="!text-sm"
                      onClick={() => handleActivate(counter)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
