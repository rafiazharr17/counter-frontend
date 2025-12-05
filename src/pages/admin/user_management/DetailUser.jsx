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

const DetailUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [userData, setUserData] = useState(null);

  // RTK Query
  const { data: userResponse, isLoading, isError, error } = useGetUserQuery(id);

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

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
              <i className="pi pi-user text-white text-lg sm:text-2xl" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{userData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-500 text-sm">{userData.email}</p>
                {getStatusBadge(userData.deleted_at)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              icon="pi pi-arrow-left"
              label="Kembali"
              className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 
                       text-white px-4 py-2 rounded-lg gap-2"
              onClick={handleBack}
            />
            <Button
              icon="pi pi-pencil"
              label="Edit"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                       text-white px-4 py-2 rounded-lg gap-2"
              onClick={handleEdit}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-id-card text-[#004A9F]" />
                Informasi Dasar
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">ID User</label>
                  <div className="font-medium text-slate-800">{userData.id}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Role</label>
                  <div>
                    <Tag 
                      value={getRoleDisplayName(userData.role?.name || 'unknown')}
                      severity={getRoleColor(userData.role?.name || 'unknown')}
                      className="px-3 py-1"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Email</label>
                  <div className="font-medium text-slate-800">{userData.email}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Email Terverifikasi</label>
                  <div>
                    {userData.email_verified_at ? (
                      <Badge value="Terverifikasi" severity="success" />
                    ) : (
                      <Badge value="Belum Verifikasi" severity="warning" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-history text-[#004A9F]" />
                Timeline Aktivitas
              </h3>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <i className="pi pi-calendar-plus text-emerald-500 text-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">Dibuat</div>
                    <div className="text-slate-500 text-sm">{formatDate(userData.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i className="pi pi-sync text-blue-500 text-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">Terakhir Update</div>
                    <div className="text-slate-500 text-sm">{formatDate(userData.updated_at)}</div>
                  </div>
                </div>
                {userData.deleted_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <i className="pi pi-archive text-amber-500 text-sm" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">Diarsipkan</div>
                      <div className="text-slate-500 text-sm">{formatDate(userData.deleted_at)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Actions & Info */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-cog text-[#004A9F]" />
                Aksi
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <Button
                icon="pi pi-pencil"
                label="Edit User"
                className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                         text-white"
                onClick={handleEdit}
              />
              <Button
                icon="pi pi-shield"
                label="Ubah Role"
                className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                         text-white"
                onClick={() => navigate(`/admin/users/${id}/role`)}
              />
              {userData.counter_id && (
                <Button
                  icon="pi pi-desktop"
                  label="Kelola Loket"
                  className="w-full justify-start bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                           text-white"
                  onClick={() => navigate(`/admin/users/${id}/counter`)}
                />
              )}
              {!userData.deleted_at ? (
                <Button
                  icon="pi pi-archive"
                  label="Arsipkan User"
                  className="w-full justify-start bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                           text-white"
                  severity="warning"
                />
              ) : (
                <Button
                  icon="pi pi-refresh"
                  label="Kembalikan User"
                  className="w-full justify-start bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white"
                  severity="success"
                />
              )}
            </div>
          </Card>

          {/* Role Info Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-shield text-[#004A9F]" />
                Informasi Role
              </h3>
            </div>
            <div className="p-5">
              {userData.role ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      userData.role.name === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <i className={`pi pi-${userData.role.name === 'admin' ? 'star-fill' : 'user'} ${
                        userData.role.name === 'admin' ? 'text-red-500' : 'text-blue-500'
                      } text-lg`} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">
                        {getRoleDisplayName(userData.role.name)}
                      </div>
                      <div className="text-slate-500 text-xs">
                        ID: {userData.role.id}
                      </div>
                    </div>
                  </div>
                  {userData.role.description && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {userData.role.description}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <i className="pi pi-info-circle text-2xl mb-2" />
                  <p>Tidak ada informasi role</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetailUser;