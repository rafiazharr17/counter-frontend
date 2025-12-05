import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  useGetUserQuery, 
  useUpdateUserMutation,
  useGetRolesQuery,
  useGetCountersQuery 
} from '../../../features/users_managements/userManagementApi';
import { userCreateSchema } from '../../../schemas/userSchemas';

// PrimeReact Components
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);

  // RTK Queries
  const { data: userResponse, isLoading, isError, error } = useGetUserQuery(id);
  const { data: rolesResponse, isLoading: isLoadingRoles } = useGetRolesQuery();
  const { data: countersResponse, isLoading: isLoadingCounters } = useGetCountersQuery();
  const [updateUser] = useUpdateUserMutation();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role_id: '',
      counter_id: '',
    },
  });

  // Data
  const rolesData = rolesResponse?.data || rolesResponse || [];
  const countersData = countersResponse?.data || countersResponse || [];

  useEffect(() => {
    if (userResponse) {
      const data = userResponse.data || userResponse;
      setUserData(data);
      
      // Set form values
      reset({
        name: data.name || '',
        email: data.email || '',
        password: '', // Leave empty for password
        role_id: data.role_id?.toString() || '',
        counter_id: data.counter_id?.toString() || '',
      });
    }
  }, [userResponse, reset]);

  // Handler
  const handleUpdateUser = async (formData) => {
    setIsSubmitting(true);
    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        email: formData.email,
        role_id: parseInt(formData.role_id, 10),
      };

      // Only include password if provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      // Only include counter_id if provided and user is customer service
      if (formData.counter_id && parseInt(formData.role_id, 10) === 2) {
        updateData.counter_id = parseInt(formData.counter_id, 10);
      } else {
        updateData.counter_id = null;
      }

      await updateUser({ id, ...updateData }).unwrap();
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'User berhasil diperbarui',
        life: 3000,
      });

      setTimeout(() => {
        navigate(`/admin/users/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Update user error:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || 'Gagal memperbarui user',
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    confirmDialog({
      message: 'Apakah Anda yakin ingin membatalkan perubahan? Semua perubahan yang belum disimpan akan hilang.',
      header: 'Konfirmasi Pembatalan',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => navigate(`/admin/users/${id}`),
      rejectClassName: 'p-button-text',
    });
  };

  const handleBack = () => {
    navigate(`/admin/users/${id}`);
  };

  // Loading state
  if (isLoading || isLoadingRoles) {
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

  const isCustomerService = watch('role_id') === '2';

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              Edit User
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 text-sm">{userData.name}</p>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">ID: {userData.id}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              icon="pi pi-times"
              label="Batal"
              className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2"
              onClick={handleCancel}
              disabled={isSubmitting}
            />
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

      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-pencil text-[#004A9F]" />
                Edit Informasi User
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Perbarui data user sesuai kebutuhan
              </p>
            </div>

            <form onSubmit={handleSubmit(handleUpdateUser)} className="p-6 space-y-6">
              {/* Nama Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-user text-slate-400" />
                  Nama Lengkap *
                </label>
                <InputText
                  {...register('name')}
                  className={`w-full rounded-xl border ${errors.name ? 'border-red-300' : 'border-slate-300'} pl-10`}
                  placeholder="Masukkan nama lengkap"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.name.message}</span>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-envelope text-slate-400" />
                  Email *
                </label>
                <InputText
                  {...register('email')}
                  className={`w-full rounded-xl border ${errors.email ? 'border-red-300' : 'border-slate-300'} pl-10`}
                  placeholder="contoh@email.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.email.message}</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-lock text-slate-400" />
                  Password Baru (Opsional)
                </label>
                <InputText
                  type="password"
                  {...register('password')}
                  className={`w-full rounded-xl border ${errors.password ? 'border-red-300' : 'border-slate-300'} pl-10`}
                  placeholder="Kosongkan jika tidak ingin mengganti password"
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.password.message}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Biarkan kosong jika tidak ingin mengubah password
                </p>
              </div>

              {/* Role Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
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
                  placeholder="Pilih role"
                  className="w-full rounded-xl border-slate-300"
                  value={watch('role_id')}
                  onChange={(e) => setValue('role_id', e.value)}
                  disabled={isSubmitting}
                  panelClassName="rounded-xl shadow-lg"
                />
                {errors.role_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.role_id.message}</span>
                  </div>
                )}
              </div>

              {/* Counter Field (only for customer service) */}
              {isCustomerService && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                    <i className="pi pi-desktop text-slate-400" />
                    Loket (Opsional)
                  </label>
                  <Dropdown
                    options={[
                      { label: 'Tidak ada loket', value: '' },
                      ...countersData.map((counter) => ({
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
                          </div>
                        ),
                        value: counter.id.toString(),
                      }))
                    ]}
                    placeholder={isLoadingCounters ? "Memuat..." : "Pilih loket"}
                    className="w-full rounded-xl border-slate-300"
                    value={watch('counter_id')}
                    onChange={(e) => setValue('counter_id', e.value)}
                    disabled={isSubmitting || isLoadingCounters}
                    panelClassName="rounded-xl shadow-lg"
                  />
                  {errors.counter_id && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                      <i className="pi pi-exclamation-circle text-sm" />
                      <span>{errors.counter_id.message}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Pilih loket jika user adalah Customer Service yang akan melayani antrian
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  label="Reset"
                  icon="pi pi-refresh"
                  className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg"
                  onClick={() => reset({
                    name: userData.name || '',
                    email: userData.email || '',
                    password: '',
                    role_id: userData.role_id?.toString() || '',
                    counter_id: userData.counter_id?.toString() || '',
                  })}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  label="Simpan Perubahan"
                  icon="pi pi-check"
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Current Info Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-info-circle text-[#004A9F]" />
                Informasi Saat Ini
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <i className="pi pi-user text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{userData.name}</div>
                  <div className="text-slate-500 text-xs">{userData.email}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-medium text-slate-800">
                    {userData.role?.name ? 
                      userData.role.name.charAt(0).toUpperCase() + userData.role.name.slice(1).replace('_', ' ') : 
                      'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dibuat:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(userData.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {userData.counter_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Loket:</span>
                    <span className="font-medium text-slate-800">#{userData.counter_id}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Warning Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-exclamation-triangle text-amber-500" />
                Perhatian
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-info text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Mengubah role user akan mempengaruhi hak akses sistem
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-info text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Pastikan email valid untuk proses verifikasi dan pemulihan akun
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-info text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Password hanya perlu diisi jika ingin mengubah password user
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditUser;