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

  // Confirmation Dialog Handlers dengan styling yang diperbaiki
  const handleRestore = (user) => {
    confirmDialog({
      message: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-refresh text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Kembalikan User?</p>
              <p className="text-slate-600 text-sm">
                User <span className="font-medium text-emerald-700">"{user.name}"</span> akan dikembalikan ke daftar user aktif.
              </p>
            </div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <i className="pi pi-info-circle text-sm" />
              <span className="text-xs font-medium">User dapat dihapus kembali setelah dikembalikan</span>
            </div>
          </div>
        </div>
      ),
      header: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
            <i className="pi pi-refresh text-emerald-500" />
          </div>
          <span className="font-bold text-lg text-slate-800">Konfirmasi Restore</span>
        </div>
      ),
      icon: null,
      acceptClassName: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 p-button-rounded gap-2',
      rejectClassName: 'p-button-outlined p-button-rounded p-button-secondary gap-2',
      acceptLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-check" />
          <span>Ya, Kembalikan</span>
        </div>
      ),
      rejectLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-times" />
          <span>Batalkan</span>
        </div>
      ),
      accept: async () => {
        try {
          await restoreUser(user.id).unwrap();
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil!',
            detail: `User "${user.name}" berhasil dikembalikan`,
            life: 3000,
          });
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal!',
            detail: error.data?.message || 'Gagal mengembalikan user',
            life: 3000,
          });
        }
      },
    });
  };

  const handleForceDelete = (user) => {
    confirmDialog({
      message: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-trash text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Hapus Permanen User?</p>
              <p className="text-red-600 text-sm">
                User <span className="font-medium text-red-700">"{user.name}"</span> akan dihapus selamanya dari sistem.
                <br />
                <span className="font-semibold">Tindakan ini tidak dapat dibatalkan!</span>
              </p>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
            <div className="flex items-start gap-2 text-red-700">
              <i className="pi pi-exclamation-circle text-sm mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">Data yang akan hilang:</p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>Profil user</li>
                  <li>Email dan data autentikasi</li>
                  <li>Role dan permission</li>
                  <li>Semua histori terkait user</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      header: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-100 to-rose-100 flex items-center justify-center">
            <i className="pi pi-trash text-red-500" />
          </div>
          <span className="font-bold text-lg text-slate-800">Konfirmasi Hapus Permanen</span>
        </div>
      ),
      icon: null,
      acceptClassName: 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 p-button-rounded gap-2',
      rejectClassName: 'p-button-outlined p-button-rounded p-button-secondary gap-2',
      acceptLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-trash" />
          <span>Ya, Hapus Permanen</span>
        </div>
      ),
      rejectLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-times" />
          <span>Batalkan</span>
        </div>
      ),
      accept: async () => {
        try {
          await forceDeleteUser(user.id).unwrap();
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil!',
            detail: `User "${user.name}" berhasil dihapus permanen`,
            life: 3000,
          });
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal!',
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
      message: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="pi pi-refresh text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Kembalikan {selectedUsers.length} User?</p>
              <p className="text-slate-600 text-sm">
                {selectedUsers.length} user terpilih akan dikembalikan ke daftar user aktif.
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600">
              <p className="font-medium mb-1">Daftar user yang akan dikembalikan:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedUsers.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center gap-2 px-2 py-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700">{user.name}</span>
                    <span className="text-slate-500 text-xs">({user.email})</span>
                  </div>
                ))}
                {selectedUsers.length > 5 && (
                  <div className="text-slate-500 text-xs px-2 py-1">
                    + {selectedUsers.length - 5} user lainnya
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      header: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 flex items-center justify-center">
            <i className="pi pi-refresh text-emerald-500" />
          </div>
          <span className="font-bold text-lg text-slate-800">Konfirmasi Restore Massal</span>
        </div>
      ),
      icon: null,
      acceptClassName: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 p-button-rounded gap-2',
      rejectClassName: 'p-button-outlined p-button-rounded p-button-secondary gap-2',
      acceptLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-check" />
          <span>Ya, Kembalikan Semua</span>
        </div>
      ),
      rejectLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-times" />
          <span>Batalkan</span>
        </div>
      ),
      accept: async () => {
        try {
          const promises = selectedUsers.map(user => restoreUser(user.id).unwrap());
          await Promise.all(promises);
          
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil!',
            detail: `${selectedUsers.length} user berhasil dikembalikan`,
            life: 3000,
          });
          
          setSelectedUsers([]);
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal!',
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
          className="px-3 py-1 rounded-full text-xs font-medium"
        />
      ),
    },
    {
      field: 'deleted_at',
      header: 'Diarsipkan',
      body: (rowData) => (
        <div className="text-sm">
          <div className="text-slate-700 font-medium">{formatDate(rowData.deleted_at)}</div>
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
            className="p-button-sm p-button-rounded bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 border-0 text-white"
            tooltip="Kembalikan"
            tooltipOptions={{ 
              position: 'top',
              className: 'text-xs'
            }}
            onClick={() => handleRestore(rowData)}
          />
          <Button
            icon="pi pi-trash"
            className="p-button-sm p-button-rounded bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 border-0 text-white"
            tooltip="Hapus Permanen"
            tooltipOptions={{ 
              position: 'top',
              className: 'text-xs'
            }}
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
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <ProgressSpinner />
              <p className="text-slate-500 mt-4">Memuat data user terarsip...</p>
            </div>
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
                Gagal memuat data user terarsip
              </p>
              <p className="text-red-600 mt-1 text-xs sm:text-sm">
                {error?.data?.message || 'Silakan refresh halaman atau coba lagi nanti.'}
              </p>
            </div>
            <Button
              icon="pi pi-refresh"
              label="Coba Lagi"
              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
                         text-white px-4 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg"
                onClick={handleRestoreSelected}
              />
            )}
          </div>
        </div>

        {/* Stats - Styling lebih baik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="backdrop-blur-sm bg-white/90 border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-800">{archivedUsers.length}</p>
                <p className="text-slate-600 text-sm font-medium">Total Terarsip</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center">
                <i className="pi pi-archive text-slate-500 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/90 border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {archivedUsers.filter(u => u.role_id === 1).length}
                </p>
                <p className="text-slate-600 text-sm font-medium">Admin</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-100 to-rose-100 flex items-center justify-center">
                <i className="pi pi-shield text-red-500 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/90 border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {archivedUsers.filter(u => u.role_id === 2).length}
                </p>
                <p className="text-slate-600 text-sm font-medium">Customer Service</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center">
                <i className="pi pi-users text-amber-500 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/90 border border-red-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-red-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-red-700">Area Berbahaya</p>
                <p className="text-red-600 text-xs">Hapus permanen tidak bisa dibatalkan!</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-100 to-rose-100 flex items-center justify-center">
                <i className="pi pi-exclamation-triangle text-red-500 text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-archive text-amber-500"></i>
                Daftar User Terarsip
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Pilih user untuk mengembalikan atau menghapus permanen
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedUsers.length > 0 && (
                <Badge 
                  value={`${selectedUsers.length} terpilih`} 
                  severity="info" 
                  className="text-xs font-medium px-3 py-1"
                />
              )}
              <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                Total: <span className="font-semibold text-slate-700">{archivedUsers.length}</span> user
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          {archivedUsers.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <i className="pi pi-inbox text-slate-400 text-3xl" />
              </div>
              <h4 className="text-lg font-semibold text-slate-600 mb-2">
                Tidak ada user terarsip
              </h4>
              <p className="text-slate-500 max-w-sm mx-auto text-sm mb-6">
                Semua user saat ini aktif, tidak ada yang diarsipkan.
              </p>
              <Button
                label="Kembali ke Daftar User"
                icon="pi pi-arrow-left"
                className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white"
                onClick={handleBack}
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <DataTable
                  value={archivedUsers}
                  selection={selectedUsers}
                  onSelectionChange={(e) => setSelectedUsers(e.value)}
                  dataKey="id"
                  emptyMessage="Tidak ada data user terarsip"
                  className="p-datatable-sm border-0"
                  size="small"
                  showGridlines
                  stripedRows
                  scrollable
                  scrollHeight="500px"
                  selectionMode="checkbox"
                >
                  <Column 
                    selectionMode="multiple" 
                    headerStyle={{ width: '3rem' }} 
                    headerClassName="bg-slate-100"
                  />
                  {columns.map((col) => (
                    <Column
                      key={col.field || 'actions'}
                      field={col.field}
                      header={col.header}
                      body={col.body}
                      style={col.style}
                      headerClassName="bg-slate-100 font-semibold text-slate-700"
                      bodyClassName="py-3"
                    />
                  ))}
                </DataTable>
              </div>

              {/* Warning Section */}
              <div className="mt-6 p-4 rounded-xl border bg-gradient-to-r from-red-50/50 to-rose-50/50 border-red-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <i className="pi pi-exclamation-triangle text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-red-800 flex items-center gap-2">
                      Peringatan Penting
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-100">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <i className="pi pi-refresh text-emerald-500 text-xs" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-700 text-sm">Restore</p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            User dapat dikembalikan ke daftar aktif kapan saja
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-red-100">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <i className="pi pi-trash text-red-500 text-xs" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-700 text-sm">Hapus Permanen</p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            Data akan hilang selamanya dan tidak dapat dipulihkan
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RestoreUser;