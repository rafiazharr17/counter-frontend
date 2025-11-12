import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import {
  useGetCountersQuery,
  useDeleteCounterMutation,
} from "../../../features/counters/counterApi";

export default function HomeCounter() {
  const navigate = useNavigate();
  const toast = useRef(null);

  const {
    data: counters = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetCountersQuery();

  const [deleteCounter, { isLoading: isDeleting }] = useDeleteCounterMutation();
  const [search, setSearch] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [counterToDelete, setCounterToDelete] = useState(null);

  const getCounterNumber = (counterCode) => {
    if (!counterCode) return "000";
    const parts = counterCode.split("-");
    return parts.length > 1 ? parts[1] : "000";
  };

  const filteredCounters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return counters;
    return counters.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.counter_code?.toLowerCase().includes(q)
    );
  }, [counters, search]);

  const showDeleteDialog = (counter) => {
    setCounterToDelete(counter);
    setDeleteDialogVisible(true);
  };

  const handleDeleteCounter = async () => {
    if (!counterToDelete) return;

    try {
      const result = await deleteCounter(counterToDelete.id);

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
          summary: (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-200">
                <i className="pi pi-check text-white text-sm" />
              </div>
              <span className="font-semibold text-white">Berhasil Dihapus</span>
            </div>
          ),
          detail: (
            <div className="mt-2">
              <p className="text-green-100">
                Counter <strong>"{counterToDelete.name}"</strong> telah berhasil
                dihapus
              </p>
              <p className="text-green-200 text-xs mt-1">
                Data telah dihapus secara permanen dari sistem
              </p>
            </div>
          ),
          life: 5000,
          className:
            "!bg-gradient-to-r !from-green-600 !to-green-700 !border-0 !shadow-2xl backdrop-blur-md",
        });

        setTimeout(() => {
          refetch();
        }, 1000);
      } else {
        throw new Error("Tidak ada data dalam response");
      }
    } catch (err) {
      setDeleteDialogVisible(false);
      toast.current.show({
        severity: "error",
        summary: (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <i className="pi pi-times text-white text-sm" />
            </div>
            <span className="font-semibold text-white">Gagal Menghapus</span>
          </div>
        ),
        detail: (
          <div className="mt-2">
            <p className="text-red-100">
              {err.message || "Terjadi kesalahan saat menghapus counter"}
            </p>
            <p className="text-red-200 text-xs mt-1">
              Silakan coba lagi atau hubungi administrator
            </p>
          </div>
        ),
        life: 6000,
        className:
          "!bg-gradient-to-r !from-red-600 !to-red-700 !border-0 !shadow-2xl backdrop-blur-md",
      });
    } finally {
      setCounterToDelete(null);
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
    setCounterToDelete(null);
  };

  const StatusBadge = ({ counterCode }) => {
    const counterNumber = getCounterNumber(counterCode);
    return (
      <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200">
        Counter {counterNumber}
      </span>
    );
  };

  const ActionButton = ({ icon, label, color, onClick, disabled = false }) => (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Mencegah event bubbling ke card
        onClick();
      }}
      disabled={disabled}
      className={`flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl 
      border-2 transition-all duration-300 shadow-sm hover:shadow-lg group flex-1 min-w-0
      ${
        color === "edit"
          ? "border-amber-200 text-amber-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100 hover:border-amber-300 hover:scale-105"
          : "border-red-200 text-red-500 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:border-red-300 hover:scale-105"
      }
      ${
        disabled
          ? "opacity-50 cursor-not-allowed grayscale"
          : "hover:-translate-y-0.5"
      }`}>
      <i
        className={`${icon} text-sm group-hover:scale-110 transition-transform duration-300`}></i>
      <span className="truncate">{label}</span>
    </button>
  );

  const CardSkeleton = () => (
    <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-100 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="h-5 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-2/3 mb-3" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/3 mb-4" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-5/12 mb-4" />
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      {/* 🟦 PREMIUM TOAST */}
      <Toast
        ref={toast}
        position="top-right"
        className="!min-w-80"
        contentClassName="!rounded-2xl !backdrop-blur-xl !border-0 !shadow-2xl !overflow-hidden"
      />

      {/* 🟥 PREMIUM CONFIRMATION DIALOG */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        header={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <i className="pi pi-trash text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Counter</h3>
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
                  "{counterToDelete?.name}"
                </span>
              </p>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-exclamation-triangle text-red-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-red-800 font-semibold text-sm">Perhatian!</p>
                  <p className="text-red-700 text-xs leading-relaxed">
                    Data counter akan dihapus secara permanen dan tidak dapat
                    dikembalikan. Pastikan ini adalah tindakan yang Anda inginkan.
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
        className="!max-w-sm !rounded-2xl !border-0 !shadow-2xl backdrop-blur-xl"
        dismissableMask
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl bg-white/80 border border-slate-200/80 p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
            Daftar Counter
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Kelola semua counter layanan publik
          </p>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="p-input-icon-left">
            <i className="pi pi-search px-3 text-slate-400" />
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari counter..."
              className="rounded-xl border border-slate-300 pl-10 
               focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/30 
               shadow-sm py-3"
            />
          </span>

          <Button
            icon="pi pi-plus"
            label="Add Counter"
            className="bg-gradient-to-r from-[#004A9F] to-[#0066CC] hover:from-[#003770] hover:to-[#004A9F] 
               text-white py-3 px-6 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
               duration-300 hover:scale-105 border-0 font-semibold"
            onClick={() => navigate("/admin/counters/new")}
          />
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-6 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl" />
          </div>
          <div>
            <p className="font-bold text-red-800">Gagal memuat data counter</p>
            <p className="text-red-600 mt-1">
              {error?.status
                ? `Kode: ${error.status}`
                : "Silakan refresh halaman atau coba lagi nanti."}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCounters.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-12 text-center text-slate-500 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <i className="pi pi-inbox text-slate-400 text-3xl" />
          </div>
          <p className="text-xl font-semibold text-slate-600 mb-2">
            {counters.length === 0 ? "Belum ada counter" : "Tidak ada hasil"}
          </p>
          <p className="text-slate-500 max-w-sm mx-auto">
            {counters.length === 0
              ? "Mulai dengan menambahkan counter pertama untuk melayani pengunjung"
              : "Coba ubah kata kunci pencarian atau filter yang berbeda"}
          </p>
        </div>
      )}

      {/* Counter Grid - CLICKABLE CARDS */}
      {!isLoading && filteredCounters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCounters.map((counter) => {
            const counterNumber = getCounterNumber(counter.counter_code);

            return (
              <div
                key={counter.id}
                onClick={() => navigate(`/admin/counters/${counter.id}`)}
                className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-200/20 flex flex-col h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:scale-[1.02] group">
                
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
                  <StatusBadge counterCode={counter.counter_code} />
                </div>

                {/* Content */}
                <div className="space-y-3 mb-5 flex-1">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <i className="pi pi-users text-blue-600 text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {counter.quota} / hari
                      </p>
                      <p className="text-xs text-slate-500">Kuota layanan</p>
                    </div>
                  </div>

                  {counter.schedule_start && counter.schedule_end ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <i className="pi pi-clock text-green-600 text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {counter.schedule_start} - {counter.schedule_end}
                        </p>
                        <p className="text-xs text-slate-500">
                          Jam operasional
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <i className="pi pi-clock text-amber-600 text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-700">
                          Tidak ada jadwal
                        </p>
                        <p className="text-xs text-amber-600">
                          Atur jadwal operasional
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Hanya Edit dan Hapus */}
                <div className="flex gap-2 justify-between items-stretch mt-auto">
                  <ActionButton
                    icon="pi pi-pencil"
                    label="Edit"
                    color="edit"
                    onClick={() => navigate(`/admin/counters/${counter.id}/edit`)}
                  />
                  <ActionButton
                    icon="pi pi-trash"
                    label={isDeleting ? "..." : "Hapus"}
                    color="delete"
                    disabled={isDeleting}
                    onClick={() => showDeleteDialog(counter)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}