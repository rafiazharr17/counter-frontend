import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserRoleMutation,
  useAssignCounterToUserMutation,
  useArchiveUserMutation,
  useRestoreUserMutation,
  useForceDeleteUserMutation,
  useGetRolesQuery,
  useGetCountersQuery,
} from '../../../features/users_managements/userManagementApi';
import {
  userCreateSchema,
  userUpdateRoleSchema,
  userAssignCounterSchema,
} from '../../../schemas/userSchemas';

// PrimeReact Components
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import { ProgressSpinner } from 'primereact/progressspinner';

const HomeUserManagement = () => {
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [filters, setFilters] = useState({
    search: '',
    sort: 'id',
    order: 'desc',
    archived: 0,
    page: 1,
  });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Check if user is admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role?.name !== 'admin') {
      navigate('/admin');
    }
  }, [navigate]);

  // RTK Queries
  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetUsersQuery(filters);

  const { data: rolesResponse, isLoading: isLoadingRoles } = useGetRolesQuery();
  const { data: countersResponse, isLoading: isLoadingCounters } = useGetCountersQuery();

  // Mutations
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUserRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();
  const [assignCounter, { isLoading: isAssigning }] = useAssignCounterToUserMutation();
  const [archiveUser, { isLoading: isArchiving }] = useArchiveUserMutation();
  const [restoreUser, { isLoading: isRestoring }] = useRestoreUserMutation();
  const [forceDeleteUser, { isLoading: isDeleting }] = useForceDeleteUserMutation();

  // Forms
  const createForm = useForm({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: '',
    },
  });

  const roleForm = useForm({
    resolver: zodResolver(userUpdateRoleSchema),
  });

  const assignForm = useForm({
    resolver: zodResolver(userAssignCounterSchema),
  });

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

  const rolesData = rolesResponse?.data || rolesResponse || [];
  const countersData = countersResponse?.data || countersResponse || [];

  // Handlers
  const handleCreateUser = async (data) => {
    try {
      const formattedData = {
        ...data,
        role_id: parseInt(data.role_id, 10),
      };
      
      await createUser(formattedData).unwrap();
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'User berhasil dibuat',
        life: 3000,
      });
      
      setShowCreateDialog(false);
      createForm.reset();
      refetch();
    } catch (error) {
      console.error('Create user error:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || 'Gagal membuat user',
        life: 3000,
      });
    }
  };

  const handleUpdateRole = async (formData) => {
    try {
      await updateUserRole({
        id: selectedUser.id,
        role_id: parseInt(formData.role_id, 10),
      }).unwrap();
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Role user berhasil diupdate',
        life: 3000,
      });
      
      setShowRoleDialog(false);
      setSelectedUser(null);
      roleForm.reset();
      refetch();
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || 'Gagal update role',
        life: 3000,
      });
    }
  };

  const handleAssignCounter = async (formData) => {
    try {
      await assignCounter({
        id: selectedUser.id,
        counter_id: parseInt(formData.counter_id, 10),
      }).unwrap();
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Loket berhasil ditugaskan ke user',
        life: 3000,
      });
      
      setShowAssignDialog(false);
      setSelectedUser(null);
      assignForm.reset();
      refetch();
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || error.data?.errors?.counter_id?.[0] || 'Gagal menugaskan loket',
        life: 3000,
      });
    }
  };

  const handleArchive = (user) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin mengarsipkan user "${user.name}"?`,
      header: 'Konfirmasi Arsip',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        try {
          await archiveUser(user.id).unwrap();
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'User berhasil diarsipkan',
            life: 3000,
          });
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal',
            detail: error.data?.message || 'Gagal mengarsipkan user',
            life: 3000,
          });
        }
      },
    });
  };

  const handleRestore = (user) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin mengembalikan user "${user.name}"?`,
      header: 'Konfirmasi Restore',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-success',
      accept: async () => {
        try {
          await restoreUser(user.id).unwrap();
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'User berhasil dikembalikan',
            life: 3000,
          });
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal',
            detail: error.data?.message || 'Gagal mengembalikan user',
            life: 3000,
          });
        }
      },
    });
  };

  const handleForceDelete = (user) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus permanen user "${user.name}"? Tindakan ini tidak dapat dibatalkan!`,
      header: 'Konfirmasi Hapus Permanen',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await forceDeleteUser(user.id).unwrap();
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'User berhasil dihapus permanen',
            life: 3000,
          });
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal',
            detail: error.data?.message || 'Gagal menghapus user',
            life: 3000,
          });
        }
      },
    });
  };

  const handleViewDetail = (user) => {
    navigate(`/admin/users/${user.id}`);
  };

  const handleEditUser = (user) => {
    navigate(`/admin/users/${user.id}/edit`);
  };

  const handleNavigateToRestore = () => {
    navigate('/admin/users/restore');
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '-';
    }
  };

  const getRoleName = (user) => {
    if (user.role?.name) return user.role.name;
    if (user.role_id === 1) return 'admin';
    if (user.role_id === 2) return 'customer_service';
    return 'unknown';
  };

  const getRoleColor = (user) => {
    const roleName = getRoleName(user);
    switch (roleName) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'customer_service':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRoleDisplayName = (user) => {
    const roleName = getRoleName(user);
    switch (roleName) {
      case 'admin':
        return 'Admin';
      case 'customer_service':
        return 'Customer Service';
      default:
        return roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ');
    }
  };

  // Get counter info by ID
  const getCounterInfo = (counterId) => {
    if (!counterId) return null;
    return countersData.find(counter => counter.id === counterId);
  };

  // Stats calculation
  const userStats = {
    total: pagination.total,
    active: usersData.filter(u => !u.deleted_at).length,
    archived: usersData.filter(u => u.deleted_at).length,
    admin: usersData.filter(u => getRoleName(u) === 'admin').length,
    cs: usersData.filter(u => getRoleName(u) === 'customer_service').length,
  };

  // Table Columns
  const columns = [
    {
      field: 'id',
      header: 'ID',
      sortable: true,
      style: { width: '80px' },
    },
    {
      field: 'name',
      header: 'Nama',
      sortable: true,
      body: (rowData) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <i className="pi pi-user text-white text-sm" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">{rowData.name}</div>
            <div className="text-xs text-slate-500">{rowData.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'role',
      header: 'Role',
      body: (rowData) => {
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(rowData)} border`}>
            {getRoleDisplayName(rowData)}
          </span>
        );
      },
    },
    {
      field: 'counter_id',
      header: 'Loket',
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
                  {counterInfo?.prefix ? `Kode: ${counterInfo.prefix}` : 'Assigned'}
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
      field: 'created_at',
      header: 'Dibuat',
      body: (rowData) => (
        <div className="text-sm">
          <div className="text-slate-800">{formatDate(rowData.created_at)}</div>
          <div className="text-xs text-slate-500">
            {rowData.deleted_at ? 'Terarsip' : 'Aktif'}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Aksi',
      body: (rowData) => {
        const isCustomerService = getRoleName(rowData) === 'customer_service';
        
        if (filters.archived === 0) {
          return (
            <div className="flex gap-2">
              <Button
                icon="pi pi-eye"
                className="p-button-sm p-button-rounded p-button-text p-button-info"
                tooltip="Detail"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleViewDetail(rowData)}
              />
              <Button
                icon="pi pi-pencil"
                className="p-button-sm p-button-rounded p-button-text p-button-success"
                tooltip="Edit"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleEditUser(rowData)}
              />
              <Button
                icon="pi pi-user-edit"
                className="p-button-sm p-button-rounded p-button-text p-button-info"
                tooltip="Ubah Role"
                tooltipOptions={{ position: 'top' }}
                onClick={() => {
                  setSelectedUser(rowData);
                  roleForm.setValue('role_id', rowData.role_id.toString());
                  setShowRoleDialog(true);
                }}
              />
              {isCustomerService && (
                <Button
                  icon="pi pi-desktop"
                  className="p-button-sm p-button-rounded p-button-text p-button-warning"
                  tooltip="Tugaskan Loket"
                  tooltipOptions={{ position: 'top' }}
                  onClick={() => {
                    setSelectedUser(rowData);
                    assignForm.setValue('counter_id', rowData.counter_id ? rowData.counter_id.toString() : '');
                    setShowAssignDialog(true);
                  }}
                />
              )}
              <Button
                icon="pi pi-archive"
                className="p-button-sm p-button-rounded p-button-text p-button-warning"
                tooltip="Arsipkan"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleArchive(rowData)}
              />
            </div>
          );
        } else {
          return (
            <div className="flex gap-2">
              <Button
                icon="pi pi-eye"
                className="p-button-sm p-button-rounded p-button-text p-button-info"
                tooltip="Detail"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleViewDetail(rowData)}
              />
              <Button
                icon="pi pi-refresh"
                className="p-button-sm p-button-rounded p-button-text p-button-success"
                tooltip="Kembalikan"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleRestore(rowData)}
              />
              <Button
                icon="pi pi-trash"
                className="p-button-sm p-button-rounded p-button-text p-button-danger"
                tooltip="Hapus Permanen"
                tooltipOptions={{ position: 'top' }}
                onClick={() => handleForceDelete(rowData)}
              />
            </div>
          );
        }
      },
      style: { width: filters.archived === 0 ? '240px' : '180px' },
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
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-5 shadow-lg shadow-slate-200/20 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card className="shadow-sm animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
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
                {error?.data?.message || 'Silakan refresh halaman atau coba lagi nanti.'}
              </p>
            </div>
            <Button
              icon="pi pi-refresh"
              label="Coba Lagi"
              className="bg-red-500 hover:bg-red-600 text-white whitespace-nowrap"
              onClick={refetch}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />
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
            {/* Tombol User Terarsip */}
            <Button
              icon={filters.archived === 0 ? "pi pi-archive" : "pi pi-users"}
              label={filters.archived === 0 ? "User Terarsip" : "User Aktif"}
              className={`${
                filters.archived === 0 
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
              } text-white py-2 sm:py-3 px-3 sm:px-4 rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all 
                 duration-300 hover:scale-105 border-0 font-semibold text-sm sm:text-base whitespace-nowrap
                 flex items-center justify-center`}
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  archived: prev.archived === 0 ? 1 : 0,
                  page: 1,
                }));
              }}
            />

            {/* Tombol Halaman Restore */}
            <Button
              icon="pi pi-history"
              label="Loket Dihapus"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 
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
              onClick={() => setShowCreateDialog(true)}
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
                setFilters(prev => ({ 
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

          <div className="flex gap-2">
            <Dropdown
              value={filters.sort}
              options={[
                { label: 'Urutkan: ID', value: 'id' },
                { label: 'Urutkan: Nama', value: 'name' },
                { label: 'Urutkan: Email', value: 'email' },
                { label: 'Urutkan: Dibuat', value: 'created_at' },
              ]}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, sort: e.value, page: 1 }));
              }}
              placeholder="Urutkan"
              className="min-w-[160px]"
            />
            
            <Button
              icon={`pi pi-sort-${filters.order === 'asc' ? 'up' : 'down'}-alt`}
              className="p-button-outlined border-slate-300 text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  order: prev.order === 'asc' ? 'desc' : 'asc',
                }));
              }}
              tooltip={`Urutkan ${filters.order === 'asc' ? 'Menurun' : 'Menaik'}`}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#004A9F]">
              {userStats.total}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">Total User</p>
          </div>
          <i className="pi pi-users text-[#004A9F] text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-emerald-600">
              {userStats.active}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">User Aktif</p>
          </div>
          <i className="pi pi-user text-emerald-600 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-amber-600">
              {userStats.archived}
            </p>
            <p className="text-gray-700 mt-1 text-sm sm:text-base">User Terarsip</p>
          </div>
          <i className="pi pi-archive text-amber-600 text-3xl sm:text-4xl md:text-5xl opacity-80"></i>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
          <div>
            <p className="font-semibold text-teal-700 text-base sm:text-lg md:text-lg">
              {userStats.admin} Admin, {userStats.cs} CS
            </p>
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
          <p className="font-semibold text-slate-800 text-lg flex gap-2 items-center">
            <i className="pi pi-users text-[#004A9F]"></i>
            Daftar User {filters.archived === 1 ? 'Terarsip' : 'Aktif'}
          </p>
          <div className="text-sm text-slate-500">
            Halaman {pagination.current_page} dari {pagination.last_page} • Total: {pagination.total} user
          </div>
        </div>

        {usersData.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-6 sm:p-8 md:p-12 text-center text-slate-500 backdrop-blur-sm my-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <i className="pi pi-inbox text-slate-400 text-2xl sm:text-3xl" />
            </div>
            <p className="text-lg sm:text-xl font-semibold text-slate-600 mb-2">
              {filters.archived === 0 ? "Belum ada user" : "Tidak ada user terarsip"}
            </p>
            <p className="text-slate-500 max-w-sm mx-auto text-sm sm:text-base">
              {filters.archived === 0
                ? "Mulai dengan menambahkan user pertama untuk mengelola sistem"
                : "Semua user saat ini aktif, tidak ada yang terarsip"}
            </p>
            {filters.archived === 0 && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  icon="pi pi-plus"
                  label="Tambah User Pertama"
                  className="bg-gradient-to-r from-[#004A9F] to-[#0066CC] text-white"
                  onClick={() => setShowCreateDialog(true)}
                />
                <Button
                  icon="pi pi-history"
                  label="Cek User Dihapus"
                  outlined
                  className="border-orange-500 text-orange-500 hover:bg-orange-50"
                  onClick={handleNavigateToRestore}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <DataTable
              value={usersData}
              loading={isLoading}
              emptyMessage="Tidak ada data user"
              className="p-datatable-sm"
              size="small"
              showGridlines
              stripedRows
              paginator
              rows={pagination.per_page}
              rowsPerPageOptions={[10, 20, 50]}
              totalRecords={pagination.total}
              lazy
              first={(filters.page - 1) * pagination.per_page}
              onPage={(e) => {
                setFilters(prev => ({ ...prev, page: e.page + 1 }));
              }}
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Menampilkan {first} sampai {last} dari {totalRecords} data"
              scrollable
              scrollHeight="500px"
            >
              {columns.map((col) => (
                <Column
                  key={col.field || 'actions'}
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

      {/* Footer Info */}
      {!isLoading && usersData.length > 0 && (
        <div className="text-center text-slate-500 text-sm mt-4">
          <p>
            {filters.archived === 0 ? (
              <>
                Menemukan user yang tidak aktif?{' '}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, archived: 1, page: 1 }))}
                  className="text-orange-500 hover:text-orange-600 font-semibold underline transition-colors">
                  Cek user terarsip
                </button>{' '}
                untuk melihat atau mengembalikan data.
              </>
            ) : (
              <>
                Ingin melihat user aktif?{' '}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, archived: 0, page: 1 }))}
                  className="text-emerald-500 hover:text-emerald-600 font-semibold underline transition-colors">
                  Kembali ke user aktif
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center">
              <i className="pi pi-user-plus text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Tambah User Baru</h3>
              <p className="text-slate-500 text-xs">Buat akun user baru untuk sistem</p>
            </div>
          </div>
        }
        visible={showCreateDialog}
        style={{ width: '520px' }}
        modal
        onHide={() => {
          setShowCreateDialog(false);
          createForm.reset();
        }}
        className="rounded-2xl shadow-2xl"
        headerClassName="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl p-5"
        contentClassName="p-0"
      >
        <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-5 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                <i className="pi pi-user text-slate-400" />
                Nama Lengkap *
              </label>
              <InputText
                {...createForm.register('name')}
                className="w-full rounded-xl border-slate-300 pl-10"
                placeholder="Masukkan nama lengkap"
                disabled={isCreating}
              />
              {createForm.formState.errors.name && (
                <small className="p-error block mt-2 text-sm">{createForm.formState.errors.name.message}</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                <i className="pi pi-envelope text-slate-400" />
                Email *
              </label>
              <InputText
                {...createForm.register('email')}
                className="w-full rounded-xl border-slate-300 pl-10"
                placeholder="contoh@email.com"
                disabled={isCreating}
              />
              {createForm.formState.errors.email && (
                <small className="p-error block mt-2 text-sm">{createForm.formState.errors.email.message}</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                <i className="pi pi-lock text-slate-400" />
                Password *
              </label>
              <Password
                {...createForm.register('password')}
                className="w-full rounded-xl border-slate-300"
                placeholder="Minimal 6 karakter"
                toggleMask
                feedback={false}
                disabled={isCreating}
                inputClassName="w-full pl-10"
                panelClassName="hidden"
              />
              {createForm.formState.errors.password && (
                <small className="p-error block mt-2 text-sm">{createForm.formState.errors.password.message}</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                <i className="pi pi-shield text-slate-400" />
                Role *
              </label>
              <Dropdown
                options={rolesData.map((role) => ({
                  label: (
                    <div className="flex items-center gap-2">
                      <i className={`pi pi-${role.name === 'admin' ? 'star-fill' : 'user'} text-slate-400`} />
                      <span>{role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('_', ' ')}</span>
                    </div>
                  ),
                  value: role.id.toString(),
                }))}
                placeholder={isLoadingRoles ? "Memuat..." : "Pilih role"}
                className="w-full rounded-xl border-slate-300"
                value={createForm.watch('role_id')}
                onChange={(e) => createForm.setValue('role_id', e.value)}
                disabled={isLoadingRoles || isCreating}
                panelClassName="rounded-xl shadow-lg"
              />
              {createForm.formState.errors.role_id && (
                <small className="p-error block mt-2 text-sm">{createForm.formState.errors.role_id.message}</small>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
            <Button
              type="button"
              label="Batal"
              icon="pi pi-times"
              className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            />
            <Button
              type="submit"
              label="Simpan"
              icon="pi pi-check"
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                       text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
              loading={isCreating}
              disabled={isCreating}
            />
          </div>
        </form>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <i className="pi pi-user-edit text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Ubah Role User</h3>
              <p className="text-slate-500 text-xs">Untuk: {selectedUser?.name}</p>
            </div>
          </div>
        }
        visible={showRoleDialog}
        style={{ width: '480px' }}
        modal
        onHide={() => {
          setShowRoleDialog(false);
          setSelectedUser(null);
          roleForm.reset();
        }}
        className="rounded-2xl shadow-2xl"
        headerClassName="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl p-5"
        contentClassName="p-0"
      >
        <form onSubmit={roleForm.handleSubmit(handleUpdateRole)} className="space-y-5 p-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
              <i className="pi pi-shield text-slate-400" />
              Pilih Role Baru *
            </label>
            <Dropdown
              options={rolesData.map((role) => ({
                label: (
                  <div className="flex items-center gap-2">
                    <i className={`pi pi-${role.name === 'admin' ? 'star-fill' : 'user'} text-slate-400`} />
                    <span>{role.name.charAt(0).toUpperCase() + role.name.slice(1).replace('_', ' ')}</span>
                  </div>
                ),
                value: role.id.toString(),
              }))}
              placeholder={isLoadingRoles ? "Memuat..." : "Pilih role"}
              className="w-full rounded-xl border-slate-300"
              value={roleForm.watch('role_id')}
              onChange={(e) => roleForm.setValue('role_id', e.value)}
              disabled={isLoadingRoles || isUpdatingRole}
              panelClassName="rounded-xl shadow-lg"
            />
            {roleForm.formState.errors.role_id && (
              <small className="p-error block mt-2 text-sm">{roleForm.formState.errors.role_id.message}</small>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="pi pi-info text-blue-500 text-sm" />
              </div>
              <div>
                <p className="font-medium text-blue-800 text-sm">Informasi</p>
                <p className="text-blue-600 text-sm mt-1">
                  Mengubah role user akan mempengaruhi hak akses yang dimilikinya dalam sistem.
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
              onClick={() => setShowRoleDialog(false)}
              disabled={isUpdatingRole}
            />
            <Button
              type="submit"
              label="Update Role"
              icon="pi pi-check"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                       text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
              loading={isUpdatingRole}
              disabled={isUpdatingRole}
            />
          </div>
        </form>
      </Dialog>

      {/* Assign Counter Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <i className="pi pi-desktop text-white text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Tugaskan Loket</h3>
              <p className="text-slate-500 text-xs">Untuk: {selectedUser?.name}</p>
            </div>
          </div>
        }
        visible={showAssignDialog}
        style={{ width: '480px' }}
        modal
        onHide={() => {
          setShowAssignDialog(false);
          setSelectedUser(null);
          assignForm.reset();
        }}
        className="rounded-2xl shadow-2xl"
        headerClassName="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50/80 rounded-t-2xl p-5"
        contentClassName="p-0"
      >
        <form onSubmit={assignForm.handleSubmit(handleAssignCounter)} className="space-y-5 p-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
              <i className="pi pi-headphones text-slate-400" />
              Pilih Loket *
            </label>
            <Dropdown
              options={countersData.map((counter) => ({
                label: (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <i className="pi pi-desktop text-green-500 text-xs" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{counter.name}</div>
                        <div className="text-xs text-slate-500">Kode: {counter.prefix || '-'}</div>
                      </div>
                    </div>
                    {counter.quota && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        Kuota: {counter.quota}
                      </span>
                    )}
                  </div>
                ),
                value: counter.id.toString(),
              }))}
              placeholder={isLoadingCounters ? "Memuat..." : "Pilih loket"}
              className="w-full rounded-xl border-slate-300"
              value={assignForm.watch('counter_id')}
              onChange={(e) => assignForm.setValue('counter_id', e.value)}
              disabled={isLoadingCounters || isAssigning}
              panelClassName="rounded-xl shadow-lg"
            />
            {assignForm.formState.errors.counter_id && (
              <small className="p-error block mt-2 text-sm">{assignForm.formState.errors.counter_id.message}</small>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="pi pi-exclamation-triangle text-amber-500 text-sm" />
              </div>
              <div>
                <p className="font-medium text-amber-800 text-sm">Perhatian Penting</p>
                <ul className="text-amber-600 text-sm mt-1 space-y-1">
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    Hanya satu customer service yang dapat ditugaskan ke satu loket
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    Jika loket sudah ditugaskan ke CS lain, pilih loket lain
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    User harus memiliki role "Customer Service" untuk dapat ditugaskan loket
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
            <Button
              type="button"
              label="Batal"
              icon="pi pi-times"
              className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg"
              onClick={() => setShowAssignDialog(false)}
              disabled={isAssigning}
            />
            <Button
              type="submit"
              label="Tugaskan Loket"
              icon="pi pi-check"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                       text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
              loading={isAssigning}
              disabled={isAssigning}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default HomeUserManagement;