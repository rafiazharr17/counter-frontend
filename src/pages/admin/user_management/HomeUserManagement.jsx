import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useGetUsersQuery,
  useGetCountersQuery,
  useGetArchivedUsersQuery,
} from "../../../features/users_managements/userManagementApi";

// PrimeReact Components
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import { Tooltip } from "primereact/tooltip";

const HomeUserManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = React.useRef(null);

  const [filters, setFilters] = useState({
    search: "",
    sort: "id",
    order: "desc",
    archived: 0,
    page: 1,
  });

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role?.name !== "admin") {
      navigate("/admin");
    }
  }, [navigate]);

  // RTK Queries
  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch: refetchUsers,
  } = useGetUsersQuery(filters);

  const { data: countersResponse } = useGetCountersQuery();

  // Tambahkan query untuk mendapatkan data user terhapus
  const {
    data: archivedUsersResponse,
    isLoading: isLoadingArchived,
    refetch: refetchArchivedUsers,
  } = useGetArchivedUsersQuery();

  // Auto-refresh ketika navigasi dari DetailUser setelah delete
  useEffect(() => {
    if (location.state?.shouldRefresh) {
      // Refetch kedua query untuk mendapatkan data terbaru
      refetchUsers();
      refetchArchivedUsers();

      // Tampilkan toast sukses jika ada
      if (location.state?.deletedUser) {
        toast.current?.show?.({
          severity: "success",
          summary: "Berhasil!",
          detail: `User "${location.state.deletedUser}" berhasil dihapus`,
          life: 3000,
        });
      }

      // Clear state agar tidak trigger terus
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, refetchUsers, refetchArchivedUsers, navigate]);

  // Data extraction
  const usersData = usersResponse?.data || [];
  const pagination = {
    total: usersResponse?.meta?.total || 0,
    current_page: usersResponse?.meta?.current_page || 1,
    last_page: usersResponse?.meta?.last_page || 1,
    per_page: usersResponse?.meta?.per_page || 20,
    from: usersResponse?.meta?.from || 1,
    to: usersResponse?.meta?.to || 0,
  };

  const countersData = countersResponse?.data || countersResponse || [];

  // Data user terhapus
  const archivedUsersData =
    archivedUsersResponse?.data || archivedUsersResponse || [];

  // Handlers
  const handleNavigateToAddUser = () => {
    navigate("/admin/users/add");
  };

  const handleNavigateToRestore = () => {
    navigate("/admin/users/restore");
  };

  const handleRowClick = (e) => {
    // Navigate to user detail when row is clicked
    navigate(`/admin/users/${e.data.id}`);
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "-";
    }
  };

  const getRoleName = (user) => {
    if (user.role?.name) return user.role.name;
    if (user.role_id === 1) return "admin";
    if (user.role_id === 2) return "customer_service";
    return "unknown";
  };

  const getRoleColor = (user) => {
    const roleName = getRoleName(user);
    switch (roleName) {
      case "admin":
        return "bg-gradient-to-r from-red-500 to-rose-600";
      case "customer_service":
        return "bg-gradient-to-r from-amber-500 to-orange-500";
      default:
        return "bg-gradient-to-r from-blue-500 to-blue-600";
    }
  };

  const getRoleDisplayName = (user) => {
    const roleName = getRoleName(user);
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

  // Get counter info by ID
  const getCounterInfo = (counterId) => {
    if (!counterId) return null;
    return countersData.find((counter) => counter.id === counterId);
  };

  // Stats calculation
  const userStats = {
    total: pagination.total,
    active: usersData.filter((u) => !u.deleted_at).length,
    deleted: archivedUsersData.length, // Ambil dari API users/trashed
    admin: usersData.filter((u) => getRoleName(u) === "admin").length,
    cs: usersData.filter((u) => getRoleName(u) === "customer_service").length,
  };

  // Table Columns - WITHOUT ACTIONS COLUMN
  const columns = [
    {
      field: "id",
      header: "ID",
      sortable: true,
      style: { width: "80px" },
    },
    {
      field: "name",
      header: "Nama",
      sortable: true,
      body: (rowData) => (
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
            <i className="pi pi-user text-white text-sm" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {rowData.name}
            </div>
            <div className="text-xs text-slate-500">{rowData.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: "role",
      header: "Role",
      body: (rowData) => {
        return (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white ${getRoleColor(
              rowData
            )}`}>
            {getRoleDisplayName(rowData)}
          </span>
        );
      },
    },
    {
      field: "counter_id",
      header: "Loket",
      body: (rowData) => {
        if (rowData.counter_id) {
          const counterInfo = getCounterInfo(rowData.counter_id);
          return (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-desktop text-white text-sm" />
              </div>
              <div>
                <div className="font-medium text-slate-800">
                  {counterInfo?.name || `Loket #${rowData.counter_id}`}
                </div>
                <div className="text-xs text-slate-500">
                  {counterInfo?.prefix
                    ? `Kode: ${counterInfo.prefix}`
                    : "Assigned"}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-slate-400">
            <i className="pi pi-times-circle" />
            <span className="text-sm">Tidak ada loket</span>
          </div>
        );
      },
    },
    {
      field: "created_at",
      header: "Dibuat",
      body: (rowData) => (
        <div className="text-sm">
          <div className="text-slate-800">{formatDate(rowData.created_at)}</div>
          <div className="text-xs text-slate-500">
            {rowData.deleted_at ? (
              <span className="inline-flex items-center gap-1 text-red-600">
                <i className="pi pi-trash text-xs" />
                Terhapus {formatDate(rowData.deleted_at)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <i className="pi pi-check-circle text-xs" />
                Aktif
              </span>
            )}
          </div>
        </div>
      ),
      sortable: true,
    },
  ];

  // Loading state
  if (isLoading && !usersResponse) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        {/* Header Skeleton */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 bg-slate-200 rounded flex-1"></div>
            <div className="h-10 bg-slate-200 rounded w-32"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-200/20 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </Card>
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
                  "Silakan refresh halaman atau coba lagi nanti."}
              </p>
            </div>
            <Button
              icon="pi pi-refresh"
              label="Coba Lagi"
              className="bg-red-500 hover:bg-red-600 text-white whitespace-nowrap"
              onClick={refetchUsers}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} position="top-right" />
      <Tooltip target=".p-button" />

      {/* Header Section */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              Manajemen User
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Kelola semua user dan hak akses sistem
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Tombol User Terhapus */}
            <Button
              icon="pi pi-history"
              label="User Terhapus"
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                       text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                       duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                       flex items-center justify-center"
              onClick={handleNavigateToRestore}
            />

            {/* Tombol Tambah User */}
            <Button
              icon="pi pi-plus"
              label="Tambah User"
              className="bg-gradient-to-r from-[#004A9F] to-[#0066CC] hover:from-[#003770] hover:to-[#004A9F] 
                 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                 duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                 flex items-center justify-center"
              onClick={handleNavigateToAddUser}
            />
          </div>
        </div>

        {/* Search Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <InputText
              value={filters.search}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                  page: 1,
                }));
              }}
              placeholder="Cari nama atau email..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-3
                 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/30 
                 shadow-sm py-2 sm:py-3 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#004A9F]">
              {userStats.total}
            </div>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">
              Total User
            </p>
          </div>
          <i className="pi pi-users text-[#004A9F] text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-emerald-600">
              {userStats.active}
            </div>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">
              User Aktif
            </p>
          </div>
          <i className="pi pi-user text-emerald-600 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-red-600">
              {isLoadingArchived ? (
                <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                userStats.deleted
              )}
            </div>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">
              User Terhapus
            </p>
          </div>
          <i className="pi pi-trash text-red-600 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <div className="font-semibold text-teal-700 text-base sm:text-lg md:text-lg">
              {userStats.admin} Admin, {userStats.cs} CS
            </div>
            <p className="text-gray-500 text-xs sm:text-sm md:text-sm">
              Distribusi Role
            </p>
          </div>
          <i className="pi pi-shield text-teal-600 text-2xl sm:text-3xl md:text-4xl opacity-80"></i>
        </div>
      </div>

      {/* Main Content - DataTable */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-800 text-lg flex gap-2 items-center">
              <i className="pi pi-users text-[#004A9F]"></i>
              Daftar User Aktif
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Klik pada baris untuk melihat detail user
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Halaman {pagination.current_page} dari {pagination.last_page} •
            Total: {pagination.total} user
          </div>
        </div>

        {usersData.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-6 sm:p-8 md:p-12 text-center text-slate-500 backdrop-blur-sm my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <i className="pi pi-inbox text-slate-400 text-2xl sm:text-3xl" />
            </div>
            <p className="text-lg sm:text-xl font-semibold text-slate-600 mb-2">
              Belum ada user
            </p>
            <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base">
              Mulai dengan menambahkan user pertama untuk mengelola sistem
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                icon="pi pi-plus"
                label="Tambah User Pertama"
                className="bg-gradient-to-r from-[#004A9F] to-[#0066CC] text-white"
                onClick={handleNavigateToAddUser}
              />
              <Button
                icon="pi pi-history"
                label="Cek User Terhapus"
                outlined
                className="border-red-500 text-red-500 hover:bg-red-50"
                onClick={handleNavigateToRestore}
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <DataTable
              value={usersData}
              loading={isLoading}
              emptyMessage="Tidak ada data user"
              className="p-datatable-sm cursor-pointer"
              size="small"
              showGridlines
              stripedRows
              paginator
              rows={pagination.per_page}
              totalRecords={pagination.total}
              lazy
              first={(filters.page - 1) * pagination.per_page}
              onPage={(e) => {
                setFilters((prev) => ({ ...prev, page: e.page + 1 }));
              }}
              onRowClick={handleRowClick}
              selectionMode="single"
              rowClassName="hover:bg-blue-50 transition-colors duration-200"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Menampilkan {first} sampai {last} dari {totalRecords} data"
              scrollable
              scrollHeight="500px">
              {columns.map((col) => (
                <Column
                  key={col.field}
                  field={col.field}
                  header={col.header}
                  sortable={col.sortable}
                  body={col.body}
                  style={col.style}
                  headerClassName="bg-slate-100 font-semibold text-slate-700"
                />
              ))}
            </DataTable>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeUserManagement;
