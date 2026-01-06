import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Dropdown } from "primereact/dropdown";
import { Card } from "primereact/card";
import { Button } from "primereact/button";

// Import mutations
import {
  useGetUserQuery,
  useAssignCounterToUserMutation,
  useUnassignCounterFromUserMutation,
  useGetCountersQuery,
  useGetUsersQuery, // TAMBAHKAN INI untuk mendapatkan semua user
} from "../../../features/users_managements/userManagementApi";

const LoketUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCounterId, setSelectedCounterId] = useState("");

  // RTK Queries
  const {
    data: userResponse,
    isLoading,
    isError,
    error,
    refetch: refetchUser,
  } = useGetUserQuery(id);

  // Ambil semua counters
  const { data: countersResponse, isLoading: isLoadingCounters } =
    useGetCountersQuery();

  // AMBIL SEMUA USER untuk mengetahui siapa yang sudah punya counter
  const { data: usersResponse, isLoading: isLoadingUsers } = useGetUsersQuery({
    archived: 0,
    per_page: 100, // Ambil semua user
  });

  // Mutations
  const [assignCounter] = useAssignCounterToUserMutation();
  const [unassignCounter] = useUnassignCounterFromUserMutation();

  // Data processing
  const countersData = countersResponse?.data || countersResponse || [];
  const allUsers = usersResponse?.data || [];

  useEffect(() => {
    if (userResponse) {
      const data = userResponse.data || userResponse;
      setUserData(data);
    }
  }, [userResponse]);

  // Debugging
  useEffect(() => {
    console.log("=== DEBUG DATA ===");
    console.log("User ID:", id);
    console.log("Current User Data:", userData);
    console.log("All Counters:", countersData);
    console.log("All Users (with counters):", allUsers);

    // Cari user lain yang sudah punya counter
    const usersWithCounters = allUsers.filter(
      (user) => user.counter_id || user.counter
    );
    console.log("Users with counters:", usersWithCounters);
  }, [id, userData, countersData, allUsers]);

  // Gunakan useMemo untuk menghitung status counters
  const { availableCounters, occupiedCounters, currentCounter } =
    useMemo(() => {
      const currentUserId = parseInt(id, 10);

      // 1. Cari counter milik user saat ini
      let currentCounter = null;
      if (userData && userData.counter_id) {
        currentCounter = countersData.find(
          (counter) => counter.id === userData.counter_id
        );
      }

      // 2. Cari semua counter_id yang sudah dipakai oleh user lain
      const occupiedCounterIds = new Set();

      allUsers.forEach((user) => {
        // Skip user saat ini
        if (user.id === currentUserId) return;

        // Jika user memiliki counter_id, tambahkan ke set
        if (user.counter_id) {
          occupiedCounterIds.add(user.counter_id);
        }

        // Jika user memiliki object counter
        if (user.counter && user.counter.id) {
          occupiedCounterIds.add(user.counter.id);
        }
      });

      console.log("Occupied counter IDs:", Array.from(occupiedCounterIds));

      // 3. Filter counters
      const available = [];
      const occupied = [];

      countersData.forEach((counter) => {
        // Jika ini adalah counter milik user saat ini
        if (currentCounter && counter.id === currentCounter.id) {
          // Masukkan ke available (untuk bisa pindah)
          available.push(counter);
        }
        // Jika counter sudah dipakai user lain
        else if (occupiedCounterIds.has(counter.id)) {
          occupied.push(counter);
        }
        // Jika counter belum dipakai siapa-siapa
        else {
          available.push(counter);
        }
      });

      return {
        availableCounters: available,
        occupiedCounters: occupied,
        currentCounter,
      };
    }, [countersData, allUsers, id, userData]);

  // Helper functions
  const getCounterInfo = (counterId) => {
    if (!counterId) return null;
    return countersData.find((counter) => counter.id === counterId);
  };

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

  // Fungsi untuk mendapatkan nama user yang memakai counter
  const getUserUsingCounter = (counterId) => {
    return allUsers.find(
      (user) =>
        user.counter_id === counterId ||
        (user.counter && user.counter.id === counterId)
    );
  };

  // Handlers
  const handleAssignCounter = async () => {
    if (!selectedCounterId) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Pilih loket terlebih dahulu",
        life: 3000,
      });
      return;
    }

    // Cek apakah counter masih tersedia
    const selectedCounter = availableCounters.find(
      (counter) => counter.id === parseInt(selectedCounterId, 10)
    );

    if (!selectedCounter) {
      toast.current.show({
        severity: "error",
        summary: "Loket Tidak Tersedia",
        detail: "Loket ini sudah tidak tersedia",
        life: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await assignCounter({
        id: parseInt(id, 10),
        counter_id: parseInt(selectedCounterId, 10),
      }).unwrap();

      toast.current.show({
        severity: "success",
        summary: "Berhasil",
        detail: "Loket berhasil ditugaskan",
        life: 3000,
      });

      setShowAssignDialog(false);
      setSelectedCounterId("");

      // Refetch data
      setTimeout(() => {
        refetchUser();
      }, 500);
    } catch (error) {
      console.error("Assign counter error:", error);
      toast.current.show({
        severity: "error",
        summary: "Gagal",
        detail: error.data?.message || "Gagal menugaskan loket",
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignCounter = () => {
    confirmDialog({
      closable: false,
      className: "max-w-md w-full rounded-2xl overflow-hidden",
      header: (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <i className="pi pi-exclamation-triangle text-red-500 text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Konfirmasi Lepas Loket</h3>
            <p className="text-slate-500 text-sm">
              Tindakan ini tidak dapat dibatalkan
            </p>
          </div>
        </div>
      ),
      message: (
        <div className="text-slate-700 leading-relaxed">
          Apakah Anda yakin ingin melepaskan loket dari user
          <span className="font-semibold text-slate-900">
            {" "}
            "{userData?.name}"
          </span>
          ?
        </div>
      ),
      acceptLabel: "Ya, Lepaskan",
      rejectLabel: "Batal",
      acceptClassName:
        "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-5 py-2 rounded-lg shadow-md",
      rejectClassName:
        "bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg",
      accept: async () => {
        try {
          await unassignCounter(id).unwrap();

          toast.current.show({
            severity: "success",
            summary: "Berhasil",
            detail: "Loket berhasil dilepaskan",
            life: 3000,
          });

          setTimeout(() => {
            refetchUser();
          }, 500);
        } catch (error) {
          toast.current.show({
            severity: "error",
            summary: "Gagal",
            detail: error.data?.message || "Gagal melepaskan loket",
            life: 3000,
          });
        }
      },
    });
  };

  const handleBack = () => {
    navigate(`/admin/users/${id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <ProgressSpinner />
            <p className="text-slate-500 mt-4">Memuat data user...</p>
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
            onClick={() => navigate("/admin/users")}
          />
        </div>
      </div>
    );
  }

  // Check if user is Customer Service
  const isCustomerService =
    userData.role_id === 2 || userData.role?.name === "customer_service";

  // Prepare dropdown options for available counters
  const dropdownOptions = availableCounters
    .filter((counter) => {
      // Filter out current counter
      if (currentCounter && counter.id === currentCounter.id) {
        return false;
      }
      return true;
    })
    .map((counter) => ({
      label: `${counter.name} (Kode: ${
        counter.counter_code || counter.code || counter.prefix || "-"
      })`,
      value: counter.id.toString(),
      counter: counter,
    }));

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              Kelola Loket {userData.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                ID: {userData.id}
              </span>
              <Tag
                value={
                  userData.role?.name === "admin" ? "Admin" : "Customer Service"
                }
                severity={
                  userData.role?.name === "admin" ? "danger" : "warning"
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              icon="pi pi-arrow-left"
              label="Kembali"
              className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 
                       text-white px-4 py-2 rounded-lg gap-2"
              onClick={handleBack}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Current Counter & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Counter Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-desktop text-[#004A9F]" />
                Loket Saat Ini
              </h3>
            </div>

            <div className="p-6">
              {currentCounter ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <i className="pi pi-desktop text-white text-2xl" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-800">
                          {currentCounter.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-600">
                            Kode:{" "}
                            {currentCounter.counter_code ||
                              currentCounter.code ||
                              currentCounter.prefix ||
                              "-"}
                          </span>
                          <Tag
                            value={
                              currentCounter.counter_code ||
                              currentCounter.code ||
                              currentCounter.prefix ||
                              "N/A"
                            }
                            severity="info"
                            className="ml-2"
                          />
                          <Badge value="Aktif" severity="success" />
                        </div>
                        {currentCounter.description && (
                          <p className="text-slate-500 text-sm mt-2">
                            {currentCounter.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      icon="pi pi-times"
                      label="Lepaskan Loket"
                      className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                               text-white px-4 py-2 rounded-lg gap-2"
                      onClick={handleUnassignCounter}
                      disabled={!isCustomerService || isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">ID Loket</div>
                      <div className="font-semibold text-slate-800">
                        {currentCounter.id}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">Kode Loket</div>
                      <div className="font-semibold text-slate-800">
                        {currentCounter.counter_code ||
                          currentCounter.code ||
                          currentCounter.prefix ||
                          "-"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">Kuota</div>
                      <div className="font-semibold text-slate-800">
                        {currentCounter.quota || "Tidak Terbatas"}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">
                        Ditugaskan Pada
                      </div>
                      <div className="font-semibold text-slate-800">
                        {formatDate(userData.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                    <i className="pi pi-desktop text-slate-400 text-3xl" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-600 mb-2">
                    Belum Ada Loket
                  </h4>
                  <p className="text-slate-500 mb-6">
                    User ini belum ditugaskan ke loket manapun
                  </p>
                  {isCustomerService && availableCounters.length > 0 ? (
                    <Button
                      icon="pi pi-plus"
                      label="Tugaskan Loket"
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                               text-white px-5 py-3 rounded-lg gap-2"
                      onClick={() => setShowAssignDialog(true)}
                    />
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-3">
                        <i className="pi pi-exclamation-triangle text-amber-500" />
                        <p className="text-amber-700">
                          {!isCustomerService
                            ? "Hanya user dengan role Customer Service yang dapat ditugaskan loket"
                            : "Tidak ada loket yang tersedia untuk ditugaskan"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Information Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-info-circle text-[#004A9F]" />
                Informasi Penugasan Loket
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i className="pi pi-info-circle text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      Persyaratan Penugasan Loket
                    </p>
                    <ul className="text-slate-600 text-sm mt-2 space-y-2">
                      <li className="flex items-start gap-2">
                        <i className="pi pi-check-circle text-green-500 text-sm mt-0.5" />
                        User harus memiliki role "Customer Service"
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="pi pi-check-circle text-green-500 text-sm mt-0.5" />
                        Satu loket hanya dapat ditugaskan ke satu user
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="pi pi-check-circle text-green-500 text-sm mt-0.5" />
                        User dapat dipindahkan ke loket lain kapan saja
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="pi pi-check-circle text-green-500 text-sm mt-0.5" />
                        Kode loket akan digunakan untuk identifikasi antrian
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Status Counters & Actions */}
        <div className="space-y-6">
          {/* Status Counters Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-list text-[#004A9F]" />
                Status Semua Loket
                {(isLoadingCounters || isLoadingUsers) && (
                  <span className="text-xs text-slate-500 ml-2">Memuat...</span>
                )}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Total: {countersData.length} loket • Tersedia:{" "}
                {availableCounters.length} • Dipakai: {occupiedCounters.length}
              </p>
            </div>
            <div className="p-5">
              {isLoadingCounters || isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <ProgressSpinner style={{ width: "40px", height: "40px" }} />
                </div>
              ) : countersData.length === 0 ? (
                <div className="text-center py-6">
                  <i className="pi pi-inbox text-slate-300 text-4xl mb-3" />
                  <p className="text-slate-500">Belum ada loket terdaftar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {/* Tampilkan counter milik user saat ini */}
                  {currentCounter && (
                    <div className="p-3 border border-blue-300 bg-blue-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <i className="pi pi-desktop text-blue-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {currentCounter.name}
                              <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                Saat Ini
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              <strong>Kode:</strong>{" "}
                              {currentCounter.counter_code ||
                                currentCounter.code ||
                                currentCounter.prefix ||
                                "-"}
                            </div>
                            {currentCounter.description && (
                              <div className="text-xs text-slate-400 mt-1">
                                {currentCounter.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge value="Dipakai (Saat Ini)" severity="info" />
                      </div>
                    </div>
                  )}

                  {/* Tampilkan loket TERSEDIA (kecuali yang sedang dipakai user ini) */}
                  {availableCounters
                    .filter(
                      (counter) =>
                        !currentCounter || counter.id !== currentCounter.id
                    )
                    .map((counter) => (
                      <div
                        key={counter.id}
                        className={`p-3 border rounded-xl transition-all duration-200 ${
                          currentCounter
                            ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70"
                            : "border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 cursor-pointer"
                        }`}
                        onClick={() => {
                          // Jika user sudah punya loket, nonaktifkan klik
                          if (!currentCounter) {
                            setSelectedCounterId(counter.id.toString());
                            setShowAssignDialog(true);
                          }
                        }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                currentCounter ? "bg-slate-200" : "bg-green-100"
                              }`}>
                              <i
                                className={`pi pi-desktop ${
                                  currentCounter
                                    ? "text-slate-400"
                                    : "text-green-500"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">
                                <strong>Kode:</strong>{" "}
                                {counter.counter_code ||
                                  counter.code ||
                                  counter.prefix ||
                                  "-"}
                              </div>
                              {counter.description && (
                                <div className="text-xs text-slate-400 mt-1">
                                  {counter.description}
                                </div>
                              )}
                              {currentCounter && (
                                <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                  <i className="pi pi-info-circle" />
                                  <span>
                                    User sudah memiliki loket. Lepaskan loket
                                    saat ini terlebih dahulu.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge value="Tersedia" severity="success" />
                        </div>
                      </div>
                    ))}

                  {/* Tampilkan loket yang DIPAKAI USER LAIN */}
                  {occupiedCounters.map((counter) => {
                    const userUsingCounter = getUserUsingCounter(counter.id);

                    return (
                      <div
                        key={counter.id}
                        className="p-3 border border-red-200 bg-red-50 rounded-xl opacity-70 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                              <i className="pi pi-desktop text-red-500" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                {counter.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                <strong>Kode:</strong>{" "}
                                {counter.counter_code ||
                                  counter.code ||
                                  counter.prefix ||
                                  "-"}
                              </div>
                              {counter.description && (
                                <div className="text-xs text-slate-400 mt-1">
                                  {counter.description}
                                </div>
                              )}
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <i className="pi pi-user" />
                                <span>
                                  Digunakan user lain
                                  {userUsingCounter?.name &&
                                    ` (${userUsingCounter.name})`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge value="Tidak Tersedia" severity="danger" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isCustomerService &&
                availableCounters.filter(
                  (counter) =>
                    !currentCounter || counter.id !== currentCounter.id
                ).length > 0 && (
                  <Button
                    icon="pi pi-plus"
                    label="Tugaskan Loket Baru"
                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                             text-white py-3 rounded-lg gap-2"
                    onClick={() => {
                      // Jika user sudah punya loket, nonaktifkan tombol
                      if (!currentCounter) {
                        setShowAssignDialog(true);
                      }
                    }}
                    disabled={
                      isLoadingCounters || isLoadingUsers || currentCounter
                    }
                  />
                )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Counter Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <i className="pi pi-desktop text-white text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Tugaskan Loket</h3>
                  <p className="text-slate-500 text-xs">
                    Untuk: {userData.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                  <i className="pi pi-headphones text-slate-400" />
                  Pilih Loket *
                </label>
                <Dropdown
                  value={selectedCounterId}
                  onChange={(e) => setSelectedCounterId(e.value)}
                  options={dropdownOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Pilih loket"
                  className="w-full"
                  disabled={isSubmitting || currentCounter}
                />
                {dropdownOptions.length === 0 && (
                  <small className="text-amber-500 block mt-2 text-sm">
                    Tidak ada loket yang tersedia untuk ditugaskan
                  </small>
                )}
                {!selectedCounterId && dropdownOptions.length > 0 && (
                  <small className="text-red-500 block mt-2 text-sm">
                    Harap pilih loket
                  </small>
                )}
                {currentCounter && (
                  <small className="text-red-500 block mt-2 text-sm">
                    User sudah memiliki loket. Lepaskan loket saat ini terlebih
                    dahulu.
                  </small>
                )}
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="pi pi-exclamation-triangle text-amber-500 text-sm" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 text-sm">
                      Perhatian
                    </p>
                    <p className="text-amber-600 text-sm mt-1">
                      Hanya loket dengan status "Tersedia" yang dapat dipilih.
                      Loket dengan status "Tidak Tersedia" sedang digunakan oleh
                      user lain.
                      {currentCounter &&
                        " Jika user sudah memiliki loket, loket sebelumnya akan otomatis dilepaskan."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                <Button
                  type="button"
                  label="Batal"
                  icon="pi pi-times"
                  className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg"
                  onClick={() => {
                    setShowAssignDialog(false);
                    setSelectedCounterId("");
                  }}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  label="Tugaskan"
                  icon="pi pi-check"
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={handleAssignCounter}
                  loading={isSubmitting}
                  disabled={
                    isSubmitting || !selectedCounterId || currentCounter
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoketUser;
