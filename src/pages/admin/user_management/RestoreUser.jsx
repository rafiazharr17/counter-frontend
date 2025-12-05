import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetArchivedUsersQuery, 
  useRestoreUserMutation,
  useForceDeleteUserMutation 
} from '../../../features/users_managements/userManagementApi';

// PrimeReact Components
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';

const RestoreUser = () => {
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [selectedUsers, setSelectedUsers] = useState([]);

  // RTK Queries
  const { 
    data: archivedUsersResponse, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useGetArchivedUsersQuery();

  const [restoreUser] = useRestoreUserMutation();
  const [forceDeleteUser] = useForceDeleteUserMutation();

  // Data
  const archivedUsers = archivedUsersResponse?.data || [];

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return '-';
    }
  };

  const getRoleColor = (roleId) => {
    if (roleId === 1) return 'danger';
    if (roleId === 2) return 'warning';
    return 'info';
  };

  const getRoleDisplayName = (roleId) => {
    if (roleId === 1) return 'Admin';
    if (roleId === 2) return 'Customer Service';
    return 'Unknown';
  };

  // Handlers
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

  const handleRestoreSelected = () => {
    if (selectedUsers.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'Peringatan',
        detail: 'Pilih user terlebih dahulu',
        life: 3000,
      });
      return;
    }

    confirmDialog({
      message: `Apakah Anda yakin ingin mengembalikan ${selectedUsers.length} user?`,
      header: 'Konfirmasi Restore Massal',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-success',
      accept: async () => {
        try {
          const promises = selectedUsers.map(user => restoreUser(user.id).unwrap());
          await Promise.all(promises);
          
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil',
            detail: `${selectedUsers.length} user berhasil dikembalikan`,
            life: 3000,
          });
          
          setSelectedUsers([]);
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal',
            detail: 'Gagal mengembalikan beberapa user',
            life: 3000,
          });
        }
      },
    });
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  // Table columns
  const columns = [
    {
      field: 'id',
      header: 'ID',
      style: { width: '80px' },
    },
    {
      field: 'name',
      header: 'Nama',
      body: (rowData) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
            <i className="pi pi-user text-white text-sm" />
          </div>
          <div>
            <div className="font-semibold text-slate-700">{rowData.name}</div>
            <div className="text-xs text-slate-500">{rowData.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'role_id',
      header: 'Role',
      body: (rowData) => (
        <Tag 
          value={getRoleDisplayName(rowData.role_id)}
          severity={getRoleColor(rowData.role_id)}
          className="px-3 py-1"
        />
      ),
    },
    {
      field: 'deleted_at',
      header: 'Diarsipkan',
      body: (rowData) => (
        <div className="text-sm">
          <div className="text-slate-700">{formatDate(rowData.deleted_at)}</div>
          <div className="text-xs text-slate-500">
            Dibuat: {formatDate(rowData.created_at)}
          </div>
        </div>
      ),
    },
    {
      header: 'Aksi',
      body: (rowData) => (
        <div className="flex gap-2">
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
      ),
      style: { width: '120px' },
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="flex justify-center items-center h-64">
          <ProgressSpinner />
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
                Gagal memuat data user terarsip
              </p>
              <p className="text-red-600 mt-1 text-xs sm:text-sm">
                {error?.data?.message || 'Silakan refresh halaman atau coba lagi nanti.'}
              </p>
            </div>
            <Button
              icon="pi pi-refresh"
              label="Coba Lagi"
              className="bg-red-500 hover:bg-red-600 text-white"
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

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              User Terarsip
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Kelola user yang telah diarsipkan (soft delete)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              icon="pi pi-arrow-left"
              label="Kembali"
              className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 
                       text-white px-4 py-2 rounded-lg gap-2"
              onClick={handleBack}
            />
            
            {selectedUsers.length > 0 && (
              <Button
                icon="pi pi-refresh"
                label={`Kembalikan ${selectedUsers.length} User`}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                         text-white px-4 py-2 rounded-lg gap-2"
                onClick={handleRestoreSelected}
              />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-slate-800">{archivedUsers.length}</p>
              <p className="text-gray-700 text-sm">Total Terarsip</p>
            </div>
            <i className="pi pi-archive text-slate-400 text-2xl"></i>
          </div>

          <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {archivedUsers.filter(u => u.role_id === 1).length}
              </p>
              <p className="text-gray-700 text-sm">Admin</p>
            </div>
            <i className="pi pi-shield text-red-400 text-2xl"></i>
          </div>

          <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {archivedUsers.filter(u => u.role_id === 2).length}
              </p>
              <p className="text-gray-700 text-sm">Customer Service</p>
            </div>
            <i className="pi pi-users text-amber-400 text-2xl"></i>
          </div>

          <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-teal-700">Area Berbahaya</p>
              <p className="text-gray-500 text-xs">Hati-hati saat hapus permanen</p>
            </div>
            <i className="pi pi-exclamation-triangle text-teal-600 text-xl"></i>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-slate-800 text-lg flex gap-2 items-center">
            <i className="pi pi-archive text-amber-500"></i>
            Daftar User Terarsip
          </p>
          <div className="text-sm text-slate-500">
            {selectedUsers.length > 0 && (
              <Badge value={`${selectedUsers.length} terpilih`} severity="info" className="mr-2" />
            )}
            Total: {archivedUsers.length} user
          </div>
        </div>

        {archivedUsers.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-8 text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <i className="pi pi-inbox text-slate-400 text-2xl" />
            </div>
            <p className="text-lg font-semibold text-slate-600 mb-2">
              Tidak ada user terarsip
            </p>
            <p className="text-slate-500 max-w-sm mx-auto text-sm">
              Semua user saat ini aktif, tidak ada yang diarsipkan.
            </p>
            <Button
              label="Kembali ke Daftar User"
              icon="pi pi-arrow-left"
              className="mt-4"
              onClick={handleBack}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <DataTable
              value={archivedUsers}
              selection={selectedUsers}
              onSelectionChange={(e) => setSelectedUsers(e.value)}
              dataKey="id"
              emptyMessage="Tidak ada data user terarsip"
              className="p-datatable-sm"
              size="small"
              showGridlines
              stripedRows
              scrollable
              scrollHeight="500px"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
              {columns.map((col) => (
                <Column
                  key={col.field || 'actions'}
                  field={col.field}
                  header={col.header}
                  body={col.body}
                  style={col.style}
                  headerClassName="bg-slate-100 font-semibold text-slate-700"
                />
              ))}
            </DataTable>
          </div>
        )}

        {/* Warning Section */}
        {archivedUsers.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <i className="pi pi-exclamation-triangle text-red-500" />
              </div>
              <div>
                <h4 className="font-bold text-red-800">Peringatan Penting</h4>
                <ul className="text-red-600 text-sm mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    User terarsip dapat dikembalikan (restore) kapan saja
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    Hapus permanen akan menghilangkan data user selamanya
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-circle-fill text-xs mt-1" />
                    Pastikan data sudah tidak diperlukan sebelum menghapus permanen
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestoreUser;