import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  useGetUserQuery,
  useAssignCounterToUserMutation,
  useUnassignCounterFromUserMutation,
  useGetCountersQuery,
  useGetAvailableCountersQuery
} from '../../../features/users_managements/userManagementApi';
import { userAssignCounterSchema } from '../../../schemas/userSchemas';

// PrimeReact Components
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const LoketUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // RTK Queries
  const { data: userResponse, isLoading, isError, error, refetch } = useGetUserQuery(id);
  const { data: countersResponse, isLoading: isLoadingCounters } = useGetCountersQuery();
  const { data: availableCountersResponse, isLoading: isLoadingAvailableCounters } = useGetAvailableCountersQuery();
  
  // Mutations
  const [assignCounter] = useAssignCounterToUserMutation();
  const [unassignCounter] = useUnassignCounterFromUserMutation();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(userAssignCounterSchema),
    defaultValues: {
      counter_id: '',
    },
  });

  useEffect(() => {
    if (userResponse) {
      const data = userResponse.data || userResponse;
      setUserData(data);
      
      // Set form values
      if (data.counter_id) {
        setValue('counter_id', data.counter_id.toString());
      }
    }
  }, [userResponse, setValue]);

  // Data
  const countersData = countersResponse?.data || countersResponse || [];
  const availableCountersData = availableCountersResponse?.data || availableCountersResponse || [];

  // Helper functions
  const getCounterInfo = (counterId) => {
    if (!counterId) return null;
    return countersData.find(counter => counter.id === counterId);
  };

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

  // Handlers
  const handleAssignCounter = async (formData) => {
    setIsSubmitting(true);
    try {
      await assignCounter({
        id,
        counter_id: parseInt(formData.counter_id, 10),
      }).unwrap();
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'Loket berhasil ditugaskan',
        life: 3000,
      });
      
      setShowAssignDialog(false);
      reset();
      refetch();
    } catch (error) {
      console.error('Assign counter error:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || 'Gagal menugaskan loket',
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignCounter = () => {
    confirmDialog({
      message: `Apakah Anda yakin ingin melepaskan loket dari user "${userData?.name}"?`,
      header: 'Konfirmasi Lepas Loket',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        try {
          await unassignCounter(id).unwrap();
          
          toast.current.show({
            severity: 'success',
            summary: 'Berhasil',
            detail: 'Loket berhasil dilepaskan',
            life: 3000,
          });
          
          refetch();
        } catch (error) {
          toast.current.show({
            severity: 'error',
            summary: 'Gagal',
            detail: error.data?.message || 'Gagal melepaskan loket',
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
            onClick={() => navigate('/admin/users')}
          />
        </div>
      </div>
    );
  }

  // Check if user is Customer Service
  const isCustomerService = userData.role_id === 2 || userData.role?.name === 'customer_service';
  const currentCounter = getCounterInfo(userData.counter_id);

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              Kelola Loket User
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 text-sm">{userData.name}</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">ID: {userData.id}</span>
              <Tag 
                value={userData.role?.name === 'admin' ? 'Admin' : 'Customer Service'} 
                severity={userData.role?.name === 'admin' ? 'danger' : 'warning'}
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
                        <h4 className="text-xl font-bold text-slate-800">{currentCounter.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-600">Kode: {currentCounter.prefix || '-'}</span>
                          <Badge value="Aktif" severity="success" />
                        </div>
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
                      <div className="font-semibold text-slate-800">{currentCounter.id}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">Kuota</div>
                      <div className="font-semibold text-slate-800">
                        {currentCounter.quota || 'Tidak Terbatas'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">Status</div>
                      <div className="font-semibold text-green-600">Aktif</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="text-sm text-slate-500">Ditugaskan Pada</div>
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
                  <h4 className="text-lg font-semibold text-slate-600 mb-2">Belum Ada Loket</h4>
                  <p className="text-slate-500 mb-6">
                    User ini belum ditugaskan ke loket manapun
                  </p>
                  {isCustomerService ? (
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
                          Hanya user dengan role Customer Service yang dapat ditugaskan loket
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* History Card (if needed) */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-history text-[#004A9F]" />
                Informasi Loket
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <i className="pi pi-info-circle text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Persyaratan Penugasan Loket</p>
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
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Available Counters & Actions */}
        <div className="space-y-6">
          {/* Available Counters Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-list text-[#004A9F]" />
                Loket Tersedia
                {isLoadingAvailableCounters && (
                  <span className="text-xs text-slate-500 ml-2">Memuat...</span>
                )}
              </h3>
            </div>
            <div className="p-5">
              {isLoadingAvailableCounters ? (
                <div className="flex justify-center py-8">
                  <ProgressSpinner style={{ width: '40px', height: '40px' }} />
                </div>
              ) : availableCountersData.length === 0 ? (
                <div className="text-center py-6">
                  <i className="pi pi-inbox text-slate-300 text-4xl mb-3" />
                  <p className="text-slate-500">Tidak ada loket tersedia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCountersData.map((counter) => (
                    <div
                      key={counter.id}
                      className="p-3 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <i className="pi pi-desktop text-green-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{counter.name}</div>
                            <div className="text-xs text-slate-500">Kode: {counter.prefix || '-'}</div>
                          </div>
                        </div>
                        <Badge value="Tersedia" severity="success" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isCustomerService && !currentCounter && (
                <Button
                  icon="pi pi-plus"
                  label="Tugaskan Loket"
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                           text-white py-3 rounded-lg gap-2"
                  onClick={() => setShowAssignDialog(true)}
                  disabled={isLoadingAvailableCounters || availableCountersData.length === 0}
                />
              )}
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-bolt text-amber-500" />
                Aksi Cepat
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <Button
                icon="pi pi-user-edit"
                label="Edit User"
                className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                         text-white"
                onClick={() => navigate(`/admin/users/${id}/edit`)}
              />
              <Button
                icon="pi pi-shield"
                label="Ubah Role"
                className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                         text-white"
                onClick={() => navigate(`/admin/users/${id}/role`)}
              />
              {!userData.deleted_at ? (
                <Button
                  icon="pi pi-archive"
                  label="Arsipkan User"
                  className="w-full justify-start bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                           text-white"
                  onClick={() => navigate(`/admin/users/${id}/archive`)}
                />
              ) : (
                <Button
                  icon="pi pi-refresh"
                  label="Kembalikan User"
                  className="w-full justify-start bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white"
                  onClick={() => navigate(`/admin/users/${id}/restore`)}
                />
              )}
              <Button
                icon="pi pi-trash"
                label="Hapus Permanen"
                className="w-full justify-start bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                         text-white"
                severity="danger"
                onClick={() => navigate(`/admin/users/${id}/delete`)}
              />
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
                  <p className="text-slate-500 text-xs">Untuk: {userData.name}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(handleAssignCounter)} className="space-y-5 p-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 flex items-center gap-2">
                  <i className="pi pi-headphones text-slate-400" />
                  Pilih Loket *
                </label>
                <Dropdown
                  options={availableCountersData.map((counter) => ({
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
                  placeholder="Pilih loket"
                  className="w-full rounded-xl border-slate-300"
                  value={watch('counter_id')}
                  onChange={(e) => setValue('counter_id', e.value)}
                  disabled={isSubmitting || isLoadingAvailableCounters}
                  panelClassName="rounded-xl shadow-lg"
                />
                {errors.counter_id && (
                  <small className="p-error block mt-2 text-sm">{errors.counter_id.message}</small>
                )}
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="pi pi-exclamation-triangle text-amber-500 text-sm" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 text-sm">Perhatian</p>
                    <p className="text-amber-600 text-sm mt-1">
                      Pastikan loket yang dipilih benar. Satu loket hanya dapat ditugaskan ke satu Customer Service.
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
                    reset();
                  }}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  label="Tugaskan"
                  icon="pi pi-check"
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                  loading={isSubmitting}
                  disabled={isSubmitting || !watch('counter_id')}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoketUser;