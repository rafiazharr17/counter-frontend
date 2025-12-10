import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  useCreateUserMutation,
  useGetRolesQuery,
} from "../../../features/users_managements/userManagementApi";
import { userCreateSchema } from "../../../schemas/userSchemas";

// PrimeReact Components
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";

const AddUser = () => {
  const navigate = useNavigate();
  const toast = React.useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  // RTK Queries
  const { data: rolesResponse, isLoading: isLoadingRoles } = useGetRolesQuery();
  const [createUser] = useCreateUserMutation();

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role_id: "",
    },
    mode: "onChange",
  });

  // Process roles data properly
  const getRolesData = () => {
    if (!rolesResponse) return [];

    let data = [];

    if (Array.isArray(rolesResponse)) {
      data = rolesResponse;
    } else if (rolesResponse.data && Array.isArray(rolesResponse.data)) {
      data = rolesResponse.data;
    }

    return data.map((role) => ({
      label:
        (role.name || "Unknown").charAt(0).toUpperCase() +
        (role.name || "").slice(1).replace("_", " "),
      value: (role.id || "").toString(),
      originalName: role.name || "",
    }));
  };

  const rolesData = getRolesData();
  const selectedRoleValue = watch("role_id");
  const formValues = watch();

  // Handler untuk password change
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPasswordValue(value);
    setValue("password", value, { shouldValidate: true });
  };

  // Handler untuk reset form
  const handleResetForm = () => {
    reset();
    setPasswordValue("");
    toast.current.show({
      severity: "info",
      summary: "Form Direset",
      detail: "Form telah direset ke kondisi awal",
      life: 2000,
    });
  };

  // Handler untuk create user
  const handleCreateUser = async (data) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        role_id: parseInt(data.role_id, 10),
      };

      await createUser(formattedData).unwrap();

      toast.current.show({
        severity: "success",
        summary: "Berhasil",
        detail: "User berhasil dibuat",
        life: 3000,
      });

      setTimeout(() => {
        navigate("/admin/users");
      }, 1500);
    } catch (error) {
      console.error("Create user error:", error);
      toast.current.show({
        severity: "error",
        summary: "Gagal",
        detail:
          error.data?.message ||
          error.data?.errors?.[0] ||
          "Gagal membuat user",
        life: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/users");
  };

  // Check if form has values
  const hasFormValues = () => {
    return (
      formValues.name ||
      formValues.email ||
      formValues.password ||
      formValues.role_id
    );
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

      {/* Header - Sama seperti EditUser */}
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
              className="p-button-outlined border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg gap-2"
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

      {/* Form Section - Layout sama seperti EditUser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-user-plus text-[#004A9F]" />
                Informasi User Baru
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Isi data lengkap user yang akan dibuat
              </p>
            </div>

            <form
              onSubmit={handleSubmit(handleCreateUser)}
              className="p-6 space-y-6">
              {/* Nama Field - Styling seperti EditUser */}
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

              {/* Email Field - Styling seperti EditUser */}
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

              {/* Password Field - Styling seperti EditUser */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-lock text-slate-400" />
                  Password *
                </label>
                <div className="relative">
                  <Password
                    value={passwordValue}
                    onChange={handlePasswordChange}
                    inputClassName={`w-full rounded-xl border ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-[#004A9F] focus:ring-[#004A9F]/30"
                    } pl-10 pr-10 py-3`}
                    placeholder="Minimal 6 karakter"
                    feedback={false}
                    disabled={isSubmitting}
                  />
                  <i className="pi pi-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 z-10" />
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <span
                      className={`text-xs font-medium ${
                        passwordValue.length >= 6
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}>
                      {passwordValue.length}/6
                    </span>
                  </div>
                </div>
                {errors.password && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                    <i className="pi pi-exclamation-circle text-sm" />
                    <span>{errors.password.message}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Password harus minimal 6 karakter
                </p>
              </div>

              {/* Role Field - Styling seperti EditUser */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <i className="pi pi-shield text-slate-400" />
                  Role *
                </label>
                <div className="relative">
                  <Dropdown
                    options={rolesData}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={
                      rolesData.length === 0
                        ? "Tidak ada role tersedia"
                        : "Pilih role"
                    }
                    className={`w-full rounded-xl border ${
                      errors.role_id
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-[#004A9F] focus:ring-[#004A9F]/30"
                    } pl-10 pr-3 py-2`}
                    value={selectedRoleValue}
                    onChange={(e) => {
                      setValue("role_id", e.value, { shouldValidate: true });
                    }}
                    disabled={isSubmitting || rolesData.length === 0}
                    panelClassName="rounded-xl shadow-lg border border-slate-200"
                  />
                  <i className="pi pi-shield absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
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
              </div>

              {/* Action Buttons - Styling seperti EditUser */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <Button
                  type="button"
                  label="Reset Form"
                  icon="pi pi-refresh"
                  className="p-button-text text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-4 py-2 rounded-lg gap-2"
                  onClick={handleResetForm}
                  disabled={isSubmitting || !hasFormValues()}
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
                    label="Simpan User"
                    icon="pi pi-check"
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                             text-white px-5 py-2 rounded-lg gap-2 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    loading={isSubmitting}
                    disabled={
                      isSubmitting ||
                      Object.keys(errors).length > 0 ||
                      !hasFormValues()
                    }
                  />
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column - Info Cards seperti EditUser */}
        <div className="space-y-6">
          {/* Role Info Card - Styling seperti EditUser */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-shield text-slate-500" />
                Daftar Role Tersedia
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {rolesData.length} role tersedia
              </p>
            </div>
            <div className="p-5 space-y-4">
              {rolesData.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <i className="pi pi-inbox text-slate-400 text-2xl" />
                  </div>
                  <p className="text-slate-400">Tidak ada role tersedia</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Hubungi administrator untuk menambahkan role
                  </p>
                </div>
              ) : (
                <>
                  {rolesData.map((role) => (
                    <div
                      key={role.value}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedRoleValue === role.value
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            role.originalName === "admin"
                              ? "bg-gradient-to-r from-red-100 to-rose-100"
                              : role.originalName === "customer_service"
                              ? "bg-gradient-to-r from-blue-100 to-cyan-100"
                              : "bg-gradient-to-r from-slate-100 to-gray-100"
                          }`}>
                          <i
                            className={`${
                              role.originalName === "admin"
                                ? "pi pi-star-fill text-red-500"
                                : role.originalName === "customer_service"
                                ? "pi pi-headset text-blue-500"
                                : "pi pi-user text-slate-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 truncate">
                            {role.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {role.originalName}
                          </div>
                        </div>
                        {selectedRoleValue === role.value && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                              <i className="pi pi-check text-emerald-600 text-xs" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          {/* Tips Card - Styling seperti EditUser */}
          <Card className="shadow-sm rounded-2xl border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="pi pi-lightbulb text-amber-500" />
                Tips Tambah User
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-check text-blue-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Semua field wajib diisi untuk membuat user baru
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-exclamation-triangle text-amber-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Password harus minimal 6 karakter untuk keamanan
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <i className="pi pi-info-circle text-emerald-500 text-xs" />
                </div>
                <div className="text-sm text-slate-600">
                  Pilih role sesuai dengan kebutuhan akses user
                </div>
              </div>
            </div>
          </Card>

          {/* Form Status Card */}
          {hasFormValues() && (
            <Card className="shadow-sm rounded-2xl border-emerald-200 overflow-hidden border">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <i className="pi pi-file-edit text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">
                      Form sedang diisi
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {Object.keys(errors).length === 0
                        ? "Semua field sudah valid"
                        : "Ada field yang perlu diperbaiki"}
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

export default AddUser;
