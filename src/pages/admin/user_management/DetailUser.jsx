import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetUserQuery } from '../../../features/users_managements/userManagementApi';

// PrimeReact Components
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Divider } from 'primereact/divider';

const DetailUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [userData, setUserData] = useState(null);

  // RTK Query
  const { data: userResponse, isLoading, isError, error, refetch } = useGetUserQuery(id);

  useEffect(() => {
    if (userResponse) {
      setUserData(userResponse.data || userResponse);
    }
  }, [userResponse]);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '-';
    }
  };

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case 'admin':
        return 'danger';
      case 'customer_service':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getRoleDisplayName = (roleName) => {
    switch (roleName) {
      case 'admin':
        return 'Admin';
      case 'customer_service':
        return 'Customer Service';
      default:
        return roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' ');
    }
  };

  const getStatusBadge = (deletedAt) => {
    if (deletedAt) {
      return <Badge value="Terarsip" severity="warning" className="ml-2" />;
    }
    return <Badge value="Aktif" severity="success" className="ml-2" />;
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  const handleEdit = () => {
    navigate(`/admin/users/${id}/edit`);
  };

  const handleManageCounter = () => {
    navigate(`/admin/users/${id}/counter`);
  };

  const handleChangeRole = () => {
    navigate(`/admin/users/${id}/role`);
  };

  const handleArchive = () => {
    confirmDialog({
      message: `Apakah Anda yakin ingin mengarsipkan user "${userData.name}"? User akan dipindahkan ke daftar arsip.`,
      header: 'Konfirmasi Arsip',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-warning',
      accept: () => {
        toast.current.show({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'User berhasil diarsipkan',
          life: 3000,
        });
        setTimeout(() => {
          navigate('/admin/users');
        }, 1500);
      },
    });
  };

  const handleDelete = () => {
    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus permanen user "${userData.name}"? Tindakan ini tidak dapat dibatalkan!`,
      header: 'Konfirmasi Hapus Permanen',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => {
        toast.current.show({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'User berhasil dihapus permanen',
          life: 3000,
        });
        setTimeout(() => {
          navigate('/admin/users');
        }, 1500);
      },
    });
  };

  const handleRestore = () => {
    confirmDialog({
      message: `Apakah Anda yakin ingin mengembalikan user "${userData.name}"?`,
      header: 'Konfirmasi Restore',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-success',
      accept: () => {
        toast.current.show({
          severity: 'success',
          summary: 'Berhasil',
          detail: 'User berhasil dikembalikan',
          life: 3000,
        });
        refetch();
      },
    });
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
                {error?.data?.message || 'User tidak ditemukan atau terjadi kesalahan.'}
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
          <h3 className="text-lg font-semibold text-slate-600">User tidak ditemukan</h3>
          <p className="text-slate-500 mt-2">User dengan ID tersebut tidak ditemukan dalam sistem.</p>
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
              {userData.deleted_at && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                  <i className="pi pi-archive text-white text-xs" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{userData.name}</h2>
                {getStatusBadge(userData.deleted_at)}
                <Tag 
                  value={getRoleDisplayName(userData.role?.name || 'unknown')}
                  severity={getRoleColor(userData.role?.name || 'unknown')}
                  className="px-3 py-1 text-sm font-semibold"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <i className="pi pi-envelope text-slate-400 text-sm" />
                <p className="text-slate-600 text-sm sm:text-base">{userData.email}</p>
                {userData.email_verified_at && (
                  <Badge value="Terverifikasi" severity="success" className="text-xs" />
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
            <Button
              icon="pi pi-cog"
              label="Kelola"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                       text-white px-4 py-2 rounded-lg gap-2 flex-1 sm:flex-none"
              onClick={() => document.getElementById('actionButtons').scrollIntoView({ behavior: 'smooth' })}
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
                    <label className="text-xs text-slate-500 font-medium block mb-2">ID User</label>
                    <div className="font-bold text-slate-800 text-lg">{userData.id}</div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs text-slate-500 font-medium block mb-2">Email</label>
                    <div className="font-medium text-slate-800">{userData.email}</div>
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
                    <label className="text-xs text-slate-500 font-medium block mb-2">Role</label>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        userData.role?.name === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <i className={`pi pi-${userData.role?.name === 'admin' ? 'star-fill' : 'user'} ${
                          userData.role?.name === 'admin' ? 'text-red-500' : 'text-blue-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{getRoleDisplayName(userData.role?.name || 'unknown')}</div>
                        {userData.role?.description && (
                          <div className="text-xs text-slate-500 mt-1">{userData.role.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {userData.counter_id && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="text-xs text-slate-500 font-medium block mb-2">Loket</label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <i className="pi pi-desktop text-green-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Loket #{userData.counter_id}</div>
                          <div className="text-xs text-slate-500 mt-1">Ditugaskan untuk layanan</div>
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
                    <div className="font-medium text-slate-800">Akun Dibuat</div>
                    <div className="text-slate-500 text-sm mt-1">{formatDate(userData.created_at)}</div>
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
                    <div className="font-medium text-slate-800">Terakhir Diperbarui</div>
                    <div className="text-slate-500 text-sm mt-1">{formatDate(userData.updated_at)}</div>
                  </div>
                </div>
                
                {userData.deleted_at && (
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <i className="pi pi-archive text-amber-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">Diarsipkan</div>
                      <div className="text-slate-500 text-sm mt-1">{formatDate(userData.deleted_at)}</div>
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
          <Card id="actionButtons" className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-bolt text-amber-500" />
                Aksi User
              </h3>
              <p className="text-slate-500 text-xs mt-1">Kelola user ini dengan pilihan aksi berikut</p>
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
                  />
                  <Button
                    icon="pi pi-desktop"
                    label="Kelola Loket"
                    className="w-full justify-start bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                             text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={handleManageCounter}
                    disabled={!(userData.role_id === 2 || userData.role?.name === 'customer_service')}
                  />
                </div>
                
                {/* Baris 2 - Ubah Role */}
                <Button
                  icon="pi pi-shield"
                  label="Ubah Role User"
                  className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                           text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={handleChangeRole}
                />
                
                <Divider className="my-2" />
                
                {/* Baris 3 - Status Management */}
                {!userData.deleted_at ? (
                  <Button
                    icon="pi pi-archive"
                    label="Arsipkan User"
                    className="w-full justify-start bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                             text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                    onClick={handleArchive}
                  />
                ) : (
                  <div className="space-y-3">
                    <Button
                      icon="pi pi-refresh"
                      label="Kembalikan User"
                      className="w-full justify-start bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                               text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={handleRestore}
                    />
                    <Button
                      icon="pi pi-trash"
                      label="Hapus Permanen"
                      className="w-full justify-start bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                               text-white py-3 px-4 rounded-lg gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                      severity="danger"
                      onClick={handleDelete}
                    />
                  </div>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Status</div>
                    <div className={`font-semibold ${userData.deleted_at ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {userData.deleted_at ? 'Terarsip' : 'Aktif'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500">Role</div>
                    <div className="font-semibold text-slate-800">
                      {getRoleDisplayName(userData.role?.name || 'unknown')}
                    </div>
                  </div>
                </div>
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
                  User dapat diarsipkan kapan saja tanpa menghapus data permanen
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-exclamation-triangle text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Hapus permanen akan menghilangkan semua data user dari sistem
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-desktop text-emerald-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Loket hanya dapat ditugaskan untuk user dengan role Customer Service
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