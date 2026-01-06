import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetUserQuery,
  useArchiveUserMutation, // Hanya untuk soft delete
} from "../../../features/users_managements/userManagementApi";

// PrimeReact Components
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import { ProgressSpinner } from "primereact/progressspinner";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";

const DetailUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);

  const [userData, setUserData] = useState(null);

  // RTK Query
  const {
    data: userResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetUserQuery(id);

  // Tambahkan mutation untuk soft delete saja
  const [archiveUser, { isLoading: isArchiving }] = useArchiveUserMutation();

  useEffect(() => {
    if (userResponse) {
      setUserData(userResponse.data || userResponse);
    }
  }, [userResponse]);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "-";
    }
  };

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case "admin":
        return "danger";
      case "customer_service":
        return "warning";
      default:
        return "info";
    }
  };

  const getRoleDisplayName = (roleName) => {
    switch (roleName) {
      case "admin":
        return "Admin";
      case "customer_service":
        return "Customer Service";
      default:
        return (
          roleName.charAt(0).toUpperCase() + roleName.slice(1).replace("_", " ")
        );
    }
  };

  const getStatusBadge = (deletedAt) => {
    if (deletedAt) {
      return <Badge value="Terhapus" severity="danger" className="ml-2" />;
    }
    return <Badge value="Aktif" severity="success" className="ml-2" />;
  };

  const handleBack = () => {
    navigate("/admin/users");
  };

  const handleEdit = () => {
    navigate(`/admin/users/${id}/edit`);
  };

  const handleManageCounter = () => {
    navigate(`/admin/users/${id}/loket-management`);
  };

  const handleDeleteUser = () => {
    confirmDialog({
      message: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                Hapus User "{userData.name}"?
              </p>
              <p className="text-slate-600 text-sm">
                User akan dipindahkan ke daftar terhapus dan dapat dikembalikan
                dari halaman "User Terhapus".
              </p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <i className="pi pi-info-circle text-amber-500 text-sm mt-0.5" />
              <p className="text-amber-700 text-xs">
                User yang dihapus tidak dapat mengakses sistem sampai
                dikembalikan dari halaman "User Terhapus".
              </p>
            </div>
          </div>
        </div>
      ),
      header: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <i className="pi pi-trash text-red-500" />
          </div>
          <span className="font-bold text-lg text-slate-800">Hapus User</span>
        </div>
      ),
      icon: null,
      acceptClassName: "p-button-danger p-button-rounded gap-2",
      rejectClassName:
        "p-button-outlined p-button-rounded p-button-secondary gap-2",
      acceptLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-trash" />
          <span>Ya, Hapus User</span>
        </div>
      ),
      rejectLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-times" />
          <span>Batal</span>
        </div>
      ),
      accept: async () => {
        try {
          await archiveUser(id).unwrap();

          // PERBAIKAN: Navigasi dengan state untuk trigger refetch
          navigate("/admin/users", {
            state: {
              shouldRefresh: true,
              deletedUser: userData.name,
              deletedUserId: id,
            },
          });
        } catch (error) {
          console.error("Error deleting user:", error);

          // Hanya tampilkan error toast jika masih di halaman ini
          toast.current?.show?.({
            severity: "error",
            summary: "Gagal!",
            detail:
              error?.data?.message ||
              "Gagal menghapus user. Silakan coba lagi.",
            life: 3000,
          });
        }
      },
      reject: () => {
        // Gunakan optional chaining
        toast.current?.show?.({
          severity: "info",
          summary: "Dibatalkan",
          detail: "Penghapusan user dibatalkan",
          life: 2000,
        });
      },
      className: "w-11/12 md:w-2/3 lg:w-1/2",
      contentClassName: "p-0",
      headerClassName: "border-b border-slate-200 p-5",
      footerClassName: "border-t border-slate-200 p-5",
    });
  };

  // Fungsi untuk mendapatkan informasi loket
  const getCounterInfo = () => {
    if (userData?.counter) {
      // Jika data counter sudah ada dalam response
      return {
        name: userData.counter.name || "Loket",
        code:
          userData.counter.counter_code ||
          userData.counter.code ||
          userData.counter.prefix ||
          "-",
        id: userData.counter.id,
      };
    } else if (userData?.counters && userData.counters.length > 0) {
      // Jika multiple counters, ambil yang pertama
      const counter = userData.counters[0];
      return {
        name: counter.name || "Loket",
        code: counter.counter_code || counter.code || counter.prefix || "-",
        id: counter.id,
      };
    } else if (userData?.counter_id) {
      // Jika hanya ada counter_id
      return {
        name: "Loket",
        code: "-",
        id: userData.counter_id,
      };
    }
    return null;
  };

  // Tambahkan loading state untuk mutations
  const isLoadingAction = isArchiving;

  // Loading state
  if (isLoading || isLoadingAction) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <ProgressSpinner />
            <p className="text-slate-500 mt-4">
              {isLoadingAction ? "Memproses..." : "Memuat data user..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
          <div className="p-4 sm:p-6 rounded-2xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-start sm:items-center gap-3 sm:gap-4 shadow-lg">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-exclamation-triangle text-red-500 text-base sm:text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-800 text-sm sm:text-base">
                Gagal memuat data user
              </p>
              <p className="text-red-600 mt-1 text-xs sm:text-sm">
                {error?.data?.message ||
                  "User tidak ditemukan atau terjadi kesalahan."}
              </p>
            </div>
            <Button
              icon="pi pi-arrow-left"
              label="Kembali"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleBack}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="text-center p-8">
          <i className="pi pi-user-slash text-4xl text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">
            User tidak ditemukan
          </h3>
          <p className="text-slate-500 mt-2">
            User dengan ID tersebut tidak ditemukan dalam sistem.
          </p>
          <Button
            label="Kembali ke Daftar User"
            icon="pi pi-arrow-left"
            className="mt-4"
            onClick={handleBack}
          />
        </div>
      </div>
    );
  }

  const counterInfo = getCounterInfo();
  const hasCounters = userData?.counters && userData.counters.length > 0;

  // Cek apakah user sudah dihapus (deleted_at tidak null)
  const isDeleted = !!userData.deleted_at;

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header dengan Profil */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Bagian Profil */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <i className="pi pi-user text-white text-2xl sm:text-3xl" />
              </div>
              {isDeleted && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <i className="pi pi-trash text-white text-xs" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                  {userData.name}
                </h2>
                {getStatusBadge(userData.deleted_at)}
                <Tag
                  value={getRoleDisplayName(userData.role?.name || "unknown")}
                  severity={getRoleColor(userData.role?.name || "unknown")}
                  className="px-3 py-1 text-sm font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <i className="pi pi-envelope text-slate-400 text-sm" />
                <p className="text-slate-600 text-sm sm:text-base">
                  {userData.email}
                </p>
                {userData.email_verified_at && (
                  <Badge
                    value="Terverifikasi"
                    severity="success"
                    className="text-xs"
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <i className="pi pi-id-card" />
                  <span>ID: {userData.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <i className="pi pi-calendar" />
                  <span>Bergabung: {formatDate(userData.created_at)}</span>
                </div>
              </div>
              {isDeleted && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-xs flex items-center gap-1">
                    <i className="pi pi-exclamation-triangle" />
                    User ini telah dihapus. Untuk mengembalikan atau menghapus
                    permanen, kunjungi halaman "User Terhapus".
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              icon="pi pi-arrow-left"
              label="Kembali"
              className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 
                       text-white px-4 py-2 rounded-lg gap-2 flex-1 sm:flex-none"
              onClick={handleBack}
            />
          </div>
        </div>
      </div>

      {/* Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri - Informasi Detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kartu Informasi Dasar */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-id-card text-[#004A9F]" />
                Informasi Dasar
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs text-slate-500 font-medium block mb-2">
                      ID User
                    </label>
                    <div className="font-bold text-slate-800 text-lg">
                      {userData.id}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs text-slate-500 font-medium block mb-2">
                      Email
                    </label>
                    <div className="font-medium text-slate-800">
                      {userData.email}
                    </div>
                    <div className="mt-2">
                      {userData.email_verified_at ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <i className="pi pi-check-circle text-xs" />
                          Terverifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          <i className="pi pi-exclamation-circle text-xs" />
                          Belum Verifikasi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs text-slate-500 font-medium block mb-2">
                      Role
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          userData.role?.name === "admin"
                            ? "bg-red-100"
                            : "bg-blue-100"
                        }`}>
                        <i
                          className={`pi pi-${
                            userData.role?.name === "admin"
                              ? "star-fill"
                              : "user"
                          } ${
                            userData.role?.name === "admin"
                              ? "text-red-500"
                              : "text-blue-500"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">
                          {getRoleDisplayName(userData.role?.name || "unknown")}
                        </div>
                        {userData.role?.description && (
                          <div className="text-xs text-slate-500 mt-1">
                            {userData.role.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bagian Loket - DIPERBAIKI */}
                  {(userData.counter || userData.counter_id || hasCounters) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="text-xs text-slate-500 font-medium block mb-2">
                        Loket
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <i className="pi pi-desktop text-green-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">
                            {counterInfo ? counterInfo.name : "Loket"}
                            {counterInfo?.code && counterInfo.code !== "-" && (
                              <span className="text-slate-600 text-sm font-normal ml-2">
                                (Kode: {counterInfo.code})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {hasCounters
                              ? `Ditugaskan untuk ${userData.counters.length} loket`
                              : "Ditugaskan untuk layanan"}
                          </div>
                          {hasCounters && userData.counters.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {userData.counters.map((counter, index) => (
                                <Tag
                                  key={counter.id}
                                  value={`${counter.name} (${
                                    counter.counter_code ||
                                    counter.code ||
                                    counter.prefix ||
                                    "-"
                                  })`}
                                  severity="info"
                                  className="text-xs"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Kartu Timeline Aktivitas */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-history text-[#004A9F]" />
                Timeline Aktivitas
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <i className="pi pi-user-plus text-emerald-500" />
                    </div>
                    <div className="absolute top-10 bottom-0 left-1/2 w-0.5 bg-slate-200 transform -translate-x-1/2"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      Akun Dibuat
                    </div>
                    <div className="text-slate-500 text-sm mt-1">
                      {formatDate(userData.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <i className="pi pi-sync text-blue-500" />
                    </div>
                    <div className="absolute top-10 bottom-0 left-1/2 w-0.5 bg-slate-200 transform -translate-x-1/2"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      Terakhir Diperbarui
                    </div>
                    <div className="text-slate-500 text-sm mt-1">
                      {formatDate(userData.updated_at)}
                    </div>
                  </div>
                </div>

                {isDeleted && (
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <i className="pi pi-trash text-red-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">Dihapus</div>
                      <div className="text-slate-500 text-sm mt-1">
                        {formatDate(userData.deleted_at)}
                      </div>
                      <div className="mt-2 text-xs text-red-600">
                        <i className="pi pi-exclamation-triangle mr-1" />
                        Kunjungi halaman "User Terhapus" untuk mengelola user
                        ini.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Kolom Kanan - Tombol Aksi */}
        <div className="space-y-6">
          {/* Kartu Aksi Utama */}
          <Card
            id="actionButtons"
            className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-bolt text-amber-500" />
                Aksi User
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Kelola user ini dengan pilihan aksi berikut
              </p>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {/* Baris 1 - Edit dan Kelola */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    icon="pi pi-pencil"
                    label="Edit User"
                    className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                             text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={handleEdit}
                    disabled={isLoadingAction || isDeleted}
                  />
                  <Button
                    icon="pi pi-desktop"
                    label="Kelola Loket"
                    className="w-full justify-start bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                             text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={handleManageCounter}
                    disabled={
                      !(
                        userData.role_id === 2 ||
                        userData.role?.name === "customer_service"
                      ) ||
                      isLoadingAction ||
                      isDeleted
                    }
                  />
                </div>

                {!isDeleted && (
                  <>
                    <Divider className="my-2" />

                    {/* Baris 2 - Hapus User (warna merah) */}
                    <Button
                      icon="pi pi-trash"
                      label="Hapus User"
                      className="w-full justify-start bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                               text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                      severity="danger"
                      onClick={handleDeleteUser}
                      disabled={isLoadingAction}
                    />
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Status</div>
                    <div
                      className={`font-semibold ${
                        isDeleted ? "text-red-600" : "text-emerald-600"
                      }`}>
                      {isDeleted ? "Terhapus" : "Aktif"}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Role</div>
                    <div className="font-semibold text-slate-800">
                      {getRoleDisplayName(userData.role?.name || "unknown")}
                    </div>
                  </div>
                </div>
                {isDeleted && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-xs text-center">
                      <i className="pi pi-info-circle mr-1" />
                      User telah dihapus. Kunjungi halaman "User Terhapus" untuk
                      mengelola.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Kartu Informasi Cepat */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-info-circle text-slate-500" />
                Informasi Cepat
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Edit user untuk mengubah data dasar seperti nama dan email
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-exclamation-triangle text-red-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  {isDeleted
                    ? 'User telah dihapus. Kunjungi halaman "User Terhapus" untuk mengelola.'
                    : "Hapus user akan memindahkan user ke daftar terhapus (soft delete)"}
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-desktop text-emerald-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Loket hanya dapat ditugaskan untuk user dengan role Customer
                  Service
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetailUser;
