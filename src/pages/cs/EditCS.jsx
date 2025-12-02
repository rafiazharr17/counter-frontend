import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";

import {
  useGetCounterQuery,
  useUpdateCounterMutation,
} from "../../features/counters/counterApi";

// date -> "HH:mm:ss"
function toHms(dateObj) {
  if (!dateObj) return null;
  const h = String(dateObj.getHours()).padStart(2, "0");
  const m = String(dateObj.getMinutes()).padStart(2, "0");
  const s = String(dateObj.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// "HH:mm:ss" -> Date object
function fromHms(timeString) {
  if (!timeString) return null;
  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

const schema = z.object({
  name: z.string().min(2, "Nama Layanan wajib diisi (minimal 2 karakter)"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  quota: z
    .number({ required_error: "Kuota wajib diisi" })
    .int("Kuota harus bilangan bulat")
    .min(1, "Kuota minimal 1"),
  schedule_start: z.date({ required_error: "Jadwal Mulai wajib diisi" }),
  schedule_end: z.date({ required_error: "Jadwal Selesai wajib diisi" }),
});

export default function EditCounter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useRef(null);

  // Debug ID dan pastikan berupa number
  console.log("ID dari URL:", id, "Tipe:", typeof id);
  const counterId = parseInt(id);

  if (isNaN(counterId)) {
    console.error("ID loket tidak valid:", id);
  }

  const {
    data: counter,
    isLoading,
    error,
  } = useGetCounterQuery({ id: counterId });
  const [updateCounter, { isLoading: isUpdating }] = useUpdateCounterMutation();

  // State untuk men-track field yang sudah di-touch
  const [touchedFields, setTouchedFields] = useState({
    quota: false,
    name: false,
    description: false,
    schedule_start: false,
    schedule_end: false,
  });

  // State untuk menandai apakah form sudah pernah di-submit
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      quota: undefined,
      schedule_start: null,
      schedule_end: null,
    },
    mode: "onChange",
  });

  // Set form values ketika data counter tersedia
  useEffect(() => {
    if (counter) {
      console.log("Data counter diterima:", counter);
      setValue("name", counter.name || "");
      setValue("description", counter.description || "");
      setValue("quota", counter.quota || 0);
      setValue("schedule_start", fromHms(counter.schedule_start));
      setValue("schedule_end", fromHms(counter.schedule_end));
    }
  }, [counter, setValue]);

  // Fungsi untuk menandai field sebagai touched
  const handleFieldTouch = (fieldName) => {
    setTouchedFields((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  // Fungsi untuk mengecek apakah error harus ditampilkan
  const shouldShowError = (fieldName) => {
    return (touchedFields[fieldName] || isSubmitted) && errors[fieldName];
  };

  // Submit
  const onSubmit = async (values) => {
    setIsSubmitted(true);

    // Validasi ID
    if (isNaN(counterId)) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "ID loket tidak valid",
      });
      return;
    }

    // tandai semua field sebagai touched
    setTouchedFields({
      quota: true,
      name: true,
      description: true,
      schedule_start: true,
      schedule_end: true,
    });

    // Validasi manual
    const isValid = await trigger();
    if (!isValid) {
      toast.current.show({
        severity: "error",
        summary: "Validasi Gagal",
        detail: "Harap perbaiki semua field yang ditandai dengan warna merah",
      });
      return;
    }

    // Payload ke backend - HANYA field yang boleh diubah oleh CS
    const payload = {
      description: values.description,
      quota: values.quota,
      schedule_start: toHms(values.schedule_start),
      schedule_end: toHms(values.schedule_end),
    };

    console.log(
      "Mengupdate counter dengan ID:",
      counterId,
      "Payload:",
      payload
    );

    const result = await updateCounter({ id: counterId, ...payload });

    // Jika sukses
    if (result?.data) {
      toast.current.show({
        severity: "success",
        summary: "Berhasil",
        detail: "Loket berhasil diperbarui.",
      });

      setTimeout(() => {
        navigate(`/cs/counters/${counterId}`); // ✅ Kembali ke DetailCS
      }, 400);

      return;
    }

    // Jika error
    const msg =
      result?.error?.data?.message ||
      result?.error?.message ||
      "Gagal memperbarui loket. Periksa kembali input Anda.";

    // Mapping error field (jika tersedia)
    if (result?.error?.data?.errors) {
      Object.entries(result.error.data.errors).forEach(([field, messages]) => {
        setError(field, {
          type: "server",
          message: String(messages?.[0] || msg),
        });
      });
    }

    toast.current.show({
      severity: "error",
      summary: "Gagal",
      detail: msg,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-spin pi-spinner text-4xl text-blue-500 mb-4"></i>
          <p className="text-slate-600">Memuat data loket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Error loading counter:", error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Gagal Memuat Data
          </h3>
          <p className="text-red-600 mb-4">
            {error?.data?.message || error?.message || "Loket tidak ditemukan"}
          </p>
          <Button
            label="Kembali"
            icon="pi pi-arrow-left"
            onClick={() => navigate(`/cs/counters/${counterId}`)} // ✅ Kembali ke DetailCS
            className="bg-red-500 hover:bg-red-600 text-white"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast ref={toast} />

      {/* TOP APP BAR - IMPROVED RESPONSIVE */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              className="p-button-text p-button-sm !text-slate-600 hover:!bg-slate-100"
              onClick={() => navigate(`/cs/counters/${counterId}`)} // ✅ Kembali ke DetailCS
            />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-[#004A9F]">
                Edit loket
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                Edit loket {counter?.counter_code}
              </p>
            </div>
          </div>
          {counter?.counter_code && (
            <div className="hidden sm:block">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-mono font-semibold">
                {counter.counter_code}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTAINER - IMPROVED RESPONSIVE */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* SPLIT PANELS */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* LEFT CARD — Informasi Layanan */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                Informasi Layanan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Informasi dasar tentang layanan loket
              </p>
            </div>

            {/* Kode Counter (Read-only) */}
            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Kode Loket
              </label>
              <InputText
                value={counter?.counter_code || ""}
                readOnly
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-600 text-sm sm:text-base"
              />
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <i className="pi pi-info-circle text-slate-400 text-xs"></i>
                Kode loket tidak dapat diubah
              </p>
            </div>

            {/* Nama Layanan (Read-only untuk CS) */}
            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Nama Layanan
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    value={field.value}
                    readOnly // ❌ DIBUAT READONLY
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-600 text-sm sm:text-base"
                  />
                )}
              />
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <i className="pi pi-info-circle text-slate-400 text-xs"></i>
                Nama layanan tidak dapat diubah
              </p>
            </div>

            {/* Deskripsi (Masih bisa diubah) */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Deskripsi <span className="text-red-500">*</span>
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputTextarea
                    {...field}
                    autoResize
                    rows={3}
                    placeholder="Tuliskan informasi singkat mengenai layanan ini..."
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      if (isSubmitted) trigger("description");
                    }}
                    onBlur={() => handleFieldTouch("description")}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border transition-colors text-sm sm:text-base ${
                      shouldShowError("description")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                  />
                )}
              />
              {shouldShowError("description") && (
                <p className="mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-xs sm:text-sm"></i>
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT CARD — Jadwal & Kuota */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                Jadwal & Kuota
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Pengaturan jadwal operasional dan kuota
              </p>
            </div>

            {/* Kuota */}
            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Kuota per Hari <span className="text-red-500">*</span>
              </label>
              <Controller
                name="quota"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => {
                      field.onChange(e.value);
                      if (isSubmitted) trigger("quota");
                    }}
                    onBlur={() => handleFieldTouch("quota")}
                    placeholder="Contoh: 100"
                    className={`w-full rounded-lg sm:rounded-xl border transition-colors ${
                      shouldShowError("quota")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                    inputClassName={`px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm sm:text-base ${
                      shouldShowError("quota") ? "text-red-600" : ""
                    }`}
                    min={1}
                    useGrouping={false}
                  />
                )}
              />
              {shouldShowError("quota") && (
                <p className="mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-xs sm:text-sm"></i>
                  {errors.quota.message}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Kuota minimal 1 per hari
              </p>
            </div>

            {/* Jadwal Mulai & Selesai */}
            <div className="space-y-4 sm:space-y-5">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Jadwal Mulai <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    Format:{" "}
                    <span className="font-mono font-semibold">00:00:00</span>
                  </span>
                </div>
                <Controller
                  name="schedule_start"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.value);
                        if (isSubmitted) trigger("schedule_start");
                      }}
                      onBlur={() => handleFieldTouch("schedule_start")}
                      timeOnly
                      hourFormat="24"
                      showIcon
                      showSeconds
                      icon="pi pi-clock"
                      placeholder="Pilih waktu mulai..."
                      className={`w-full rounded-lg sm:rounded-xl border transition-colors ${
                        shouldShowError("schedule_start")
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                      inputClassName={`px-3 sm:px-4 py-2.5 sm:py-3 w-full rounded-lg sm:rounded-xl text-sm sm:text-base ${
                        shouldShowError("schedule_start") ? "text-red-600" : ""
                      }`}
                    />
                  )}
                />
                {shouldShowError("schedule_start") && (
                  <p className="mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <i className="pi pi-exclamation-circle text-xs sm:text-sm"></i>
                    {errors.schedule_start.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Jadwal Selesai <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    Format:{" "}
                    <span className="font-mono font-semibold">00:00:00</span>
                  </span>
                </div>
                <Controller
                  name="schedule_end"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.value);
                        if (isSubmitted) trigger("schedule_end");
                      }}
                      onBlur={() => handleFieldTouch("schedule_end")}
                      timeOnly
                      hourFormat="24"
                      showIcon
                      showSeconds
                      icon="pi pi-clock"
                      placeholder="Pilih waktu selesai..."
                      className={`w-full rounded-lg sm:rounded-xl border transition-colors ${
                        shouldShowError("schedule_end")
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                      inputClassName={`px-3 sm:px-4 py-2.5 sm:py-3 w-full rounded-lg sm:rounded-xl text-sm sm:text-base ${
                        shouldShowError("schedule_end") ? "text-red-600" : ""
                      }`}
                    />
                  )}
                />
                {shouldShowError("schedule_end") && (
                  <p className="mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <i className="pi pi-exclamation-circle text-xs sm:text-sm"></i>
                    {errors.schedule_end.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BUTTON AREA - IMPROVED RESPONSIVE */}
          <div className="xl:col-span-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                label="Batal"
                icon="pi pi-times"
                outlined
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-red-500 text-red-500 hover:bg-red-50 transition-all order-2 sm:order-1"
                onClick={() => navigate(`/cs/counters/${counterId}`)} // ✅ Kembali ke DetailCS
              />
              <Button
                type="submit"
                label={
                  isUpdating || isSubmitting ? "Memperbarui..." : "Perbarui"
                }
                icon="pi pi-save"
                disabled={isUpdating || isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-white shadow-sm
                           transition-all hover:shadow-md order-1 sm:order-2
                           bg-gradient-to-r from-[#0B63CE] to-[#003B80] hover:from-[#0a57b7] hover:to-[#00306a]
                           disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}