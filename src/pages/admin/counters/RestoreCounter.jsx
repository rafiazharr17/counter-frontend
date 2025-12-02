import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Card } from "primereact/card";
import { Badge } from "primereact/badge";

import {
  useGetTrashedCountersQuery,
  useRestoreCounterMutation,
  useForceDeleteCounterMutation,
} from "../../../features/counters/counterApi";

const RestoreCounter = () => {
  const navigate = useNavigate();
  const toast = useRef(null);
  const [forceDeleteDialog, setForceDeleteDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);

  // PERBAIKAN: Gunakan query hook dengan parameter untuk avoid caching issues
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetTrashedCountersQuery(undefined, {
    refetchOnMountOrArgChange: true, // Penting: refresh data setiap kali komponen mount
  });

  const [restoreCounter, { isLoading: isRestoring }] =
    useRestoreCounterMutation();
  const [forceDeleteCounter, { isLoading: isForceDeleting }] =
    useForceDeleteCounterMutation();

  // State untuk data yang akan ditampilkan - PERBAIKAN UTAMA
  const [displayData, setDisplayData] = useState([]);

  // PERBAIKAN: Transform data dari API response
  useEffect(() => {
    console.log("API Response:", apiResponse); // Debug log
    console.log("Error:", error); // Debug log

    if (apiResponse) {
      // Handle berbagai format response dari API
      let data = [];
      
      // Format 1: apiResponse.data (array langsung)
      if (Array.isArray(apiResponse.data)) {
        data = apiResponse.data;
      } 
      // Format 2: apiResponse adalah array langsung
      else if (Array.isArray(apiResponse)) {
        data = apiResponse;
      }
      // Format 3: apiResponse.data.data (nested structure)
      else if (apiResponse.data && Array.isArray(apiResponse.data.data)) {
        data = apiResponse.data.data;
      }
      // Format 4: Data dalam property lain
      else if (apiResponse.data && Array.isArray(apiResponse.data.counters)) {
        data = apiResponse.data.counters;
      }
      
      console.log("Processed data:", data); // Debug log
      
      // Filter hanya data yang memiliki deleted_at
      const trashedData = data.filter(counter => 
        counter && counter.deleted_at && typeof counter.deleted_at === 'string'
      );
      
      setDisplayData(trashedData);
    } else if (isError) {
      console.error("Error fetching trashed counters:", error);
      setDisplayData([]);
    }
  }, [apiResponse, isError, error]);

  // Auto refresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Handle restore confirmation
  const confirmRestore = (counter) => {
    setSelectedCounter(counter);
    setRestoreDialog(true);
  };

  // Handle actual restore
  const handleRestore = async () => {
    if (!selectedCounter) return;

    try {
      await restoreCounter(selectedCounter.id).unwrap();

      toast.current.show({
        severity: "success",
        summary: "Berhasil Dikembalikan",
        detail: `Loket "${selectedCounter.name}" berhasil dikembalikan`,
        life: 4000,
      });

      setRestoreDialog(false);
      setSelectedCounter(null);

      // Refresh data setelah restore berhasil
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error("Restore error:", error);
      
      let errorMessage = "Terjadi kesalahan saat mengembalikan loket";
      
      if (error?.status === 404) {
        errorMessage = "Loket tidak ditemukan atau sudah dikembalikan";
      } else if (error?.status === 500) {
        errorMessage = "Terjadi kesalahan server";
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }

      toast.current.show({
        severity: "error",
        summary: "Gagal Mengembalikan",
        detail: errorMessage,
        life: 5000,
      });
    }
  };

  // Handle force delete confirmation
  const confirmForceDelete = (counter) => {
    setSelectedCounter(counter);
    setForceDeleteDialog(true);
  };

  // Handle actual force delete
  const handleForceDelete = async () => {
    if (!selectedCounter) return;

    try {
      await forceDeleteCounter(selectedCounter.id).unwrap();

      toast.current.show({
        severity: "success",
        summary: "Berhasil Dihapus Permanen",
        detail: `Loket "${selectedCounter.name}" telah dihapus permanen`,
        life: 4000,
      });

      setForceDeleteDialog(false);
      setSelectedCounter(null);

      // Refresh data setelah force delete berhasil
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error("Force delete error:", error);
      
      let errorMessage = "Terjadi kesalahan saat menghapus loket";
      
      if (error?.status === 404) {
        errorMessage = "Loket tidak ditemukan atau sudah dihapus";
      } else if (error?.status === 500) {
        errorMessage = "Terjadi kesalahan server";
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }

      toast.current.show({
        severity: "error",
        summary: "Gagal Menghapus",
        detail: errorMessage,
        life: 5000,
      });
    }
  };

  // Format tanggal untuk ditampilkan
  const formatDeletedDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Tanggal tidak valid";
    }
  };

  // Template untuk actions
  const actionBodyTemplate = (rowData) => {
    return (
      <div className="flex gap-2 justify-center">
        <Button
          icon="pi pi-refresh"
          className="p-button-success p-button-sm py-2 px-3 rounded-lg"
          tooltip="Kembalikan Loket"
          tooltipOptions={{ position: "top" }}
          onClick={() => confirmRestore(rowData)}
          disabled={isRestoring || isForceDeleting}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-danger p-button-sm py-2 px-3 rounded-lg"
          tooltip="Hapus Permanen"
          tooltipOptions={{ position: "top" }}
          onClick={() => confirmForceDelete(rowData)}
          disabled={isForceDeleting || isRestoring}
        />
      </div>
    );
  };

  // Template untuk deleted date
  const deletedDateTemplate = (rowData) => {
    return (
      <div className="text-center">
        <span className="text-sm text-slate-600 font-medium">
          {formatDeletedDate(rowData.deleted_at)}
        </span>
      </div>
    );
  };

  // Template untuk quota
  const quotaTemplate = (rowData) => {
    return (
      <div className="text-center">
        <Badge
          value={rowData.quota || 0}
          className="bg-gradient-to-r from-blue-500 to-blue-600 min-w-[3rem] font-bold"
        />
      </div>
    );
  };

  // Template untuk nama layanan
  const nameTemplate = (rowData) => {
    return (
      <div className="text-center">
        <span className="font-semibold text-slate-800">{rowData.name || "N/A"}</span>
      </div>
    );
  };

  // Template untuk kode counter
  const codeTemplate = (rowData) => {
    return (
      <div className="text-center">
        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-sm">
          {rowData.counter_code || "N/A"}
        </span>
      </div>
    );
  };

  // Template untuk deskripsi
  const descriptionTemplate = (rowData) => {
    return (
      <div className="text-center max-w-xs mx-auto">
        <span className="text-slate-600 text-sm line-clamp-2">
          {rowData.description || "-"}
        </span>
      </div>
    );
  };

  // Error handling
  if (isError && error?.status !== 404) {
    return (
      <div className="p-6">
        <Card className="border-2 border-red-200">
          <div className="text-center py-8">
            <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-700 mb-2">
              Gagal Memuat Data
            </h3>
            <p className="text-red-600 mb-4">
              {error?.data?.message || "Terjadi kesalahan saat memuat loket yang dihapus"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                label="Coba Lagi"
                icon="pi pi-refresh"
                onClick={() => refetch()}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              />
              <Button
                label="Kembali"
                icon="pi pi-arrow-left"
                onClick={() => navigate("/admin/counters")}
                className="bg-slate-500 hover:bg-slate-600 text-white"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Toast ref={toast} position="top-right" />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        visible={restoreDialog}
        onHide={() => setRestoreDialog(false)}
        header={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-200">
              <i className="pi pi-refresh text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Kembalikan Loket
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Restore data loket
              </p>
            </div>
          </div>
        }
        message={
          <div className="space-y-4 p-6 bg-white">
            <div className="text-center">
              <p className="text-slate-700 text-base leading-relaxed">
                Anda akan mengembalikan loket{" "}
                <span className="font-bold text-slate-900 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                  "{selectedCounter?.name}"
                </span>
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-info-circle text-green-500 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-green-800 font-semibold text-sm">
                    Informasi
                  </p>
                  <p className="text-green-700 text-xs leading-relaxed">
                    Loket akan dikembalikan ke daftar loket aktif dan dapat
                    digunakan kembali untuk melayani antrean.
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
              className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium py-3 rounded-xl transition-all duration-200"
              onClick={() => setRestoreDialog(false)}
            />
            <Button
              label={isRestoring ? "Mengembalikan..." : "Ya, Kembalikan"}
              icon={isRestoring ? "pi pi-spinner pi-spin" : "pi pi-refresh"}
              className={`flex-1 font-medium py-3 rounded-xl transition-all duration-200 shadow-lg ${
                isRestoring
                  ? "bg-green-400 border-green-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 to-green-600 border-green-500 hover:from-green-600 hover:to-green-700 hover:shadow-xl text-white"
              }`}
              onClick={handleRestore}
              disabled={isRestoring}
            />
          </div>
        }
        className="max-w-sm rounded-2xl border-0 shadow-2xl"
        dismissableMask
      />

      {/* Force Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={forceDeleteDialog}
        onHide={() => setForceDeleteDialog(false)}
        header={
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <i className="pi pi-trash text-white text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Hapus Permanen Loket
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">Tindakan permanen</p>
            </div>
          </div>
        }
        message={
          <div className="space-y-4 p-6 bg-white">
            <div className="text-center">
              <p className="text-slate-700 text-base leading-relaxed">
                Anda akan menghapus permanen loket{" "}
                <span className="font-bold text-slate-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                  "{selectedCounter?.name}"
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
                    Semua data loket akan dihapus secara permanen dan tidak
                    dapat dikembalikan.
                  </p>
                  <p className="text-red-700 text-xs leading-relaxed font-semibold mt-2">
                    ⚠️ Tindakan ini tidak dapat dibatalkan!
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
              className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium py-3 rounded-xl transition-all duration-200"
              onClick={() => setForceDeleteDialog(false)}
            />
            <Button
              label={isForceDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
              icon={isForceDeleting ? "pi pi-spinner pi-spin" : "pi pi-trash"}
              className={`flex-1 font-medium py-3 rounded-xl transition-all duration-200 shadow-lg ${
                isForceDeleting
                  ? "bg-red-400 border-red-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-500 to-red-600 border-red-500 hover:from-red-600 hover:to-red-700 hover:shadow-xl text-white"
              }`}
              onClick={handleForceDelete}
              disabled={isForceDeleting}
            />
          </div>
        }
        className="max-w-sm rounded-2xl border-0 shadow-2xl"
        dismissableMask
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button
            label="Kembali"
            icon="pi pi-arrow-left"
            outlined
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium py-3 px-4 rounded-xl transition-all duration-200 mb-2"
            onClick={() => navigate("/admin/counters")}
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Loket yang Dihapus
          </h1>
          <p className="text-slate-600 mt-1">
            Kelola loket yang telah dihapus sementara
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg">
          <div className="text-center p-4">
            <i className="pi pi-inbox text-3xl mb-2" />
            <div className="text-2xl font-bold">{displayData.length}</div>
            <div className="text-orange-100 text-sm">Total Loket Dihapus</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
          <div className="text-center p-4">
            <i className="pi pi-check-circle text-3xl mb-2" />
            <div className="text-2xl font-bold">
              {displayData.filter((c) => c.deleted_at).length}
            </div>
            <div className="text-green-100 text-sm">Dapat Dikembalikan</div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white shadow-lg">
          <div className="text-center p-4">
            <i className="pi pi-history text-3xl mb-2" />
            <div className="text-lg font-bold">
              {displayData.length > 0
                ? formatDeletedDate(displayData[0].deleted_at)
                : "-"}
            </div>
            <div className="text-purple-100 text-sm">Penghapusan Terakhir</div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="pi pi-trash text-slate-600" />
            Daftar Loket yang Dihapus
          </h2>
        </div>

        <div className="p-0">
          <DataTable
            value={displayData}
            loading={isLoading}
            paginator
            rows={10}
            emptyMessage={
              <div className="text-center py-12 text-slate-500">
                <i className="pi pi-inbox text-5xl text-slate-300 mb-4" />
                <p className="text-lg font-semibold mb-2">
                  Tidak ada loket yang dihapus
                </p>
                <p className="text-sm">
                  Semua loket aktif atau belum ada yang dihapus
                </p>
              </div>
            }
            className="p-datatable-sm custom-datatable"
            stripedRows
            showGridlines
            size="small">
            <Column
              field="counter_code"
              header="Kode Loket"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center border-r border-slate-200"
              body={codeTemplate}
              bodyClassName="text-center border-r border-slate-100"
              sortable
            />
            <Column
              field="name"
              header="Nama Layanan"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center border-r border-slate-200"
              body={nameTemplate}
              bodyClassName="text-center border-r border-slate-100"
              sortable
            />
            <Column
              field="description"
              header="Deskripsi"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center border-r border-slate-200"
              body={descriptionTemplate}
              bodyClassName="text-center border-r border-slate-100"
            />
            <Column
              field="quota"
              header="Kuota"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center border-r border-slate-200"
              body={quotaTemplate}
              bodyClassName="text-center border-r border-slate-100"
              sortable
            />
            <Column
              field="deleted_at"
              header="Dihapus Pada"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center border-r border-slate-200"
              body={deletedDateTemplate}
              bodyClassName="text-center border-r border-slate-100"
              sortable
            />
            <Column
              header="Aksi"
              headerClassName="bg-slate-50 font-bold text-slate-700 text-center"
              body={actionBodyTemplate}
              bodyClassName="text-center"
            />
          </DataTable>
        </div>
      </Card>

      {/* Custom CSS untuk DataTable */}
      <style>{`
        .custom-datatable {
          border: 1px solid #e2e8f0;
          border-radius: 0 0 12px 12px;
        }
        
        .custom-datatable .p-datatable-thead > tr > th {
          border-bottom: 2px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          padding: 0.75rem 0.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        
        .custom-datatable .p-datatable-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9;
          border-right: 1px solid #f1f5f9;
          padding: 0.75rem 0.5rem;
          vertical-align: middle;
        }
        
        .custom-datatable .p-datatable-tbody > tr:last-child > td {
          border-bottom: none;
        }
        
        .custom-datatable .p-datatable-thead > tr > th:last-child,
        .custom-datatable .p-datatable-tbody > tr > td:last-child {
          border-right: none;
        }
        
        .custom-datatable .p-paginator {
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.75rem;
        }
        
        .custom-datatable .p-datatable-tbody > tr:hover > td {
          background: #f8fafc;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default RestoreCounter;