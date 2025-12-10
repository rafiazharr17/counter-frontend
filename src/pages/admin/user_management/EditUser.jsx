import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetUserQuery,
  useUpdateUserMutation,
} from "../../../features/users_managements/userManagementApi";
import { simpleUserUpdateSchema } from "../../../schemas/userSchemas";

// PrimeReact Components
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = React.useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formHasChanges, setFormHasChanges] = useState(false);

  // RTK Queries
  const {
    data: userResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetUserQuery(id);
  const [updateUser] = useUpdateUserMutation();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, dirtyFields },
    reset,
    getValues,
  } = useForm({
    resolver: zodResolver(simpleUserUpdateSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Watch form values
  const formValues = watch();

  useEffect(() => {
    if (userResponse) {
      const data = userResponse.data || userResponse;
      setUserData(data);

      // Set form values
      reset({
        name: data.name || "",
        email: data.email || "",
        password: "", // Always empty for password
      });
    }
  }, [userResponse, reset]);

  // Check for form changes
  useEffect(() => {
    if (!userData) return;

    const currentValues = getValues();
    const originalData = {
      name: userData.name || "",
      email: userData.email || "",
      password: "", // Password selalu kosong di original data
    };

    const hasNameChanged = currentValues.name !== originalData.name;
    const hasEmailChanged = currentValues.email !== originalData.email;
    const hasPasswordChanged =
      currentValues.password && currentValues.password.trim() !== "";

    setFormHasChanges(hasNameChanged || hasEmailChanged || hasPasswordChanged);
  }, [formValues, userData, getValues]);

  // Handler
  const handleUpdateUser = async (formData) => {
    setIsSubmitting(true);
    try {
      // Prepare update data - hanya kirim field yang berubah
      const updateData = {};
      const originalData = userData;

      // Cek perubahan di name
      if (formData.name && formData.name !== originalData.name) {
        updateData.name = formData.name;
      }

      // Cek perubahan di email
      if (formData.email && formData.email !== originalData.email) {
        updateData.email = formData.email;
      }

      // Cek password (hanya jika diisi)
      if (formData.password && formData.password.trim() !== "") {
        updateData.password = formData.password;
      }

      // Jika tidak ada perubahan, tampilkan pesan
      if (Object.keys(updateData).length === 0) {
        toast.current.show({
          severity: "warn",
          summary: "Tidak ada perubahan",
          detail: "Tidak ada data yang diubah",
          life: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      console.log("Data yang akan dikirim:", { id, ...updateData });

      await updateUser({ id, ...updateData }).unwrap();

      toast.current.show({
        severity: "success",
        summary: "Berhasil!",
        detail: "User berhasil diperbarui",
        life: 3000,
      });

      // Refresh user data
      refetch();

      // Navigasi setelah sukses
      setTimeout(() => {
        navigate(`/admin/users/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Update user error:", error);
      toast.current.show({
        severity: "error",
        summary: "Gagal!",
        detail:
          error?.data?.message || error?.message || "Gagal memperbarui user",
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    confirmDialog({
      message: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                Batalkan Perubahan?
              </p>
              <p className="text-slate-600 text-sm">
                Semua perubahan yang belum disimpan akan hilang.
              </p>
            </div>
          </div>
        </div>
      ),
      header: (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <i className="pi pi-times text-red-500" />
          </div>
          <span className="font-bold text-lg text-slate-800">
            Konfirmasi Pembatalan
          </span>
        </div>
      ),
      icon: null,
      acceptClassName: "p-button-danger p-button-rounded gap-2",
      rejectClassName:
        "p-button-outlined p-button-rounded p-button-secondary gap-2",
      acceptLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-times" />
          <span>Ya, Batalkan</span>
        </div>
      ),
      rejectLabel: (
        <div className="flex items-center gap-2">
          <i className="pi pi-arrow-left" />
          <span>Kembali Edit</span>
        </div>
      ),
      accept: () => navigate(`/admin/users/${id}`),
    });
  };

  const handleBack = () => {
    navigate(`/admin/users/${id}`);
  };

  const handleResetForm = () => {
    if (userData) {
      reset({
        name: userData.name || "",
        email: userData.email || "",
        password: "",
      });
    }
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
              onClick={() => navigate("/admin/users")}
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
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                ID: {userData.id}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              icon="pi pi-times"
              label="Batal"
              className="p-button-outlined border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg gap-2"
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
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-pencil text-[#004A9F]" />
                Edit Informasi User
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Perbarui data user sesuai kebutuhan
              </p>
            </div>

            <form
              onSubmit={handleSubmit(handleUpdateUser)}
              className="p-6 space-y-6">
              {/* Nama Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-user text-slate-400" />
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <InputText
                    {...register("name")}
                    className={`w-full rounded-xl border ${
                      errors.name
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-[#004A9F] focus:ring-[#004A9F]/30"
                    } pl-10 pr-3 py-3`}
                    placeholder="Masukkan nama lengkap"
                    disabled={isSubmitting}
                    defaultValue={userData.name}
                  />
                  <i className="pi pi-user absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
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
                <div className="relative">
                  <InputText
                    {...register("email")}
                    className={`w-full rounded-xl border ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-[#004A9F] focus:ring-[#004A9F]/30"
                    } pl-10 pr-3 py-3`}
                    placeholder="contoh@email.com"
                    disabled={isSubmitting}
                    defaultValue={userData.email}
                  />
                  <i className="pi pi-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
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
                <div className="relative">
                  <Password
                    {...register("password")}
                    inputClassName={`w-full rounded-xl border ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-[#004A9F] focus:ring-[#004A9F]/30"
                    } pl-10 pr-10 py-3`}
                    placeholder="Kosongkan jika tidak ingin mengganti password"
                    disabled={isSubmitting}
                    feedback={false}
                    onChange={(e) => {
                      // Trigger form validation
                      register("password").onChange(e);
                    }}
                  />
                  <i className="pi pi-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.password.message}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Biarkan kosong jika tidak ingin mengubah password. Minimal 6
                  karakter.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  label="Reset Form"
                  icon="pi pi-refresh"
                  className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg gap-2"
                  onClick={handleResetForm}
                  disabled={isSubmitting || !formHasChanges}
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    label="Batal"
                    icon="pi pi-times"
                    className="p-button-outlined border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg gap-2"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="submit"
                    label="Simpan Perubahan"
                    icon="pi pi-check"
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                             text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    loading={isSubmitting}
                    disabled={isSubmitting || !formHasChanges}
                  />
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Current Info Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-info-circle text-slate-500" />
                Informasi Saat Ini
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <i className="pi pi-user text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">
                    {userData.name}
                  </div>
                  <div className="text-slate-500 text-xs">{userData.email}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Role</div>
                  <div className="font-medium text-slate-800">
                    {userData.role?.name === "admin"
                      ? "Admin"
                      : userData.role?.name === "customer_service"
                      ? "Customer Service"
                      : userData.role?.name || "Unknown"}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">
                    Tanggal Bergabung
                  </div>
                  <div className="font-medium text-slate-800">
                    {new Date(userData.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {userData.counter_id && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Loket</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <i className="pi pi-desktop text-green-500 text-xs" />
                      </div>
                      <div className="font-medium text-slate-800">
                        Loket #{userData.counter_id}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Tips Card */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-lightbulb text-amber-500" />
                Tips Edit User
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Password hanya perlu diisi jika ingin mengubah password user
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-exclamation-triangle text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Email yang valid diperlukan untuk proses verifikasi dan
                  pemulihan akun
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-info-circle text-emerald-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Anda bisa mengubah nama saja, email saja, atau password saja
                </div>
              </div>
            </div>
          </Card>

          {/* Perubahan Form Status */}
          {formHasChanges && (
            <Card className="shadow-sm rounded-2xl border-emerald-200 overflow-hidden border">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <i className="pi pi-pencil text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">
                      Ada perubahan yang belum disimpan
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Klik "Simpan Perubahan" untuk menyimpan
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditUser;
