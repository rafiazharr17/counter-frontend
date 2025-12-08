import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useCreateUserMutation, useGetRolesQuery } from '../../../features/users_managements/userManagementApi';
import { userCreateSchema } from '../../../schemas/userSchemas';

// PrimeReact Components
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

const AddUser = () => {
  const navigate = useNavigate();
  const toast = React.useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RTK Queries
  const { data: rolesResponse, isLoading: isLoadingRoles } = useGetRolesQuery();
  const [createUser] = useCreateUserMutation();

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
    },
  });

  // Process roles data properly
  const getRolesData = () => {
    if (!rolesResponse) return [];
    
    // Debug log
    console.log('Roles API Response:', rolesResponse);
    
    // Try different response formats
    let data = [];
    
    if (Array.isArray(rolesResponse)) {
      data = rolesResponse;
    } else if (rolesResponse.data && Array.isArray(rolesResponse.data)) {
      data = rolesResponse.data;
    } else if (rolesResponse && typeof rolesResponse === 'object') {
      // Jika response adalah object tunggal
      data = [rolesResponse];
    }
    
    console.log('Extracted roles data:', data);
    
    // Transform data to proper format for Dropdown
    const formattedData = data.map((role) => {
      // Ensure role has proper structure
      const roleName = role.name || role.role_name || 'Unknown';
      const roleId = role.id || role.role_id || '';
      
      return {
        label: roleName.charAt(0).toUpperCase() + roleName.slice(1).replace('_', ' '),
        value: roleId.toString(),
        originalName: roleName
      };
    });
    
    console.log('Formatted roles data:', formattedData);
    return formattedData;
  };

  const rolesData = getRolesData();
  const selectedRoleValue = watch('role_id');

  // Handler
  const handleCreateUser = async (data) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        role_id: parseInt(data.role_id, 10),
      };
      
      console.log('Creating user with data:', formattedData);
      
      const result = await createUser(formattedData).unwrap();
      
      console.log('Create user success:', result);
      
      toast.current.show({
        severity: 'success',
        summary: 'Berhasil',
        detail: 'User berhasil dibuat',
        life: 3000,
      });

      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
      
    } catch (error) {
      console.error('Create user error:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Gagal',
        detail: error.data?.message || error.data?.errors?.[0] || 'Gagal membuat user',
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

  if (isLoadingRoles) {
    return (
      <div className="space-y-6 p-3 sm:p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <ProgressSpinner />
            <p className="text-slate-500 mt-4">Memuat data roles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <Toast ref={toast} position="top-right" />

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200/80 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
              Tambah User Baru
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Buat akun user baru untuk mengakses sistem
            </p>
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
              onClick={handleCancel}
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
                <i className="pi pi-user-plus text-[#004A9F]" />
                Informasi User
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Isi data lengkap user yang akan dibuat
              </p>
            </div>

            <form onSubmit={handleSubmit(handleCreateUser)} className="p-6 space-y-6">
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
                  Password *
                </label>
                <Password
                  {...register('password')}
                  className={`w-full rounded-xl border ${errors.password ? 'border-red-300' : 'border-slate-300'}`}
                  placeholder="Minimal 8 karakter"
                  feedback={true}
                  disabled={isSubmitting}
                  inputClassName="w-full pl-10"
                  panelClassName="rounded-xl shadow-lg"
                />
                {errors.password && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.password.message}</span>
                  </div>
                )}
              </div>

              {/* Role Field - SIMPLIFIED VERSION */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-shield text-slate-400" />
                  Role *
                </label>
                <Dropdown
                  options={rolesData}
                  optionLabel="label"
                  optionValue="value"
                  placeholder={rolesData.length === 0 ? "Tidak ada role tersedia" : "Pilih role"}
                  className={`w-full rounded-xl border ${errors.role_id ? 'border-red-300' : 'border-slate-300'}`}
                  value={selectedRoleValue}
                  onChange={(e) => {
                    console.log('Role selected:', e.value);
                    setValue('role_id', e.value, { shouldValidate: true });
                  }}
                  disabled={isSubmitting || rolesData.length === 0}
                  panelClassName="rounded-xl shadow-lg"
                />
                {errors.role_id && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.role_id.message}</span>
                  </div>
                )}
                {rolesData.length === 0 && !isLoadingRoles && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>Tidak ada role tersedia. Hubungi administrator.</span>
                  </div>
                )}
                {selectedRoleValue && (
                  <div className="text-sm text-slate-500 mt-1">
                    Selected: {rolesData.find(r => r.value === selectedRoleValue)?.label}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  label="Reset"
                  icon="pi pi-refresh"
                  className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg"
                  onClick={() => reset()}
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  label="Simpan User"
                  icon="pi pi-check"
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                           text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200"
                  loading={isSubmitting}
                  disabled={isSubmitting || rolesData.length === 0 || !selectedRoleValue}
                />
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Role Info Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-info-circle text-[#004A9F]" />
                Daftar Role Tersedia
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {rolesData.length} role
                </span>
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {rolesData.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <i className="pi pi-inbox text-3xl mb-3" />
                  <p>Tidak ada role tersedia</p>
                </div>
              ) : (
                rolesData.map((role) => (
                  <div key={role.value} className={`p-3 rounded-lg border ${selectedRoleValue === role.value ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        role.originalName === 'admin' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <i className={`pi pi-${role.originalName === 'admin' ? 'star-fill' : 'user'} ${
                          role.originalName === 'admin' ? 'text-red-500' : 'text-blue-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {role.label}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          ID: {role.value}
                        </div>
                      </div>
                      {selectedRoleValue === role.value && (
                        <div className="ml-auto">
                          <i className="pi pi-check-circle text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Tips Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-lightbulb text-amber-500" />
                Tips & Panduan
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Admin:</span> Akses penuh ke semua fitur sistem
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Customer Service:</span> Hanya dapat mengelola antrian dan loket
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Password:</span> Minimal 8 karakter dengan kombinasi huruf dan angka
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddUser;