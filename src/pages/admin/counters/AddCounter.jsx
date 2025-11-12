import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  useAddCounterMutation,
  useGetCountersQuery,
} from "../../../features/counters/counterApi";

/* =========================
   Helpers
========================= */

// debounce hook (500ms default)
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// get prefix from service name
function buildPrefixFromName(name) {
  if (!name) return "";
  const clean = name.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length >= 2) {
    const a = parts[0].match(/[A-Za-z]/)?.[0] || "";
    const b = parts[1].match(/[A-Za-z]/)?.[0] || "";
    return (a + b).toUpperCase();
  }
  const letters = parts[0].replace(/[^A-Za-z]/g, "");
  return letters.slice(0, 2).toUpperCase();
}

// get next 3-digit code from existing counters list with given prefix
function getNextThreeDigitCode(prefix, counters) {
  if (!prefix || prefix.length < 1) return "";
  const nums = (counters || [])
    .map((c) => c.counter_code)
    .filter((code) => typeof code === "string" && code.startsWith(`${prefix}-`))
    .map((code) => {
      const n = parseInt(code.split("-")[1], 10);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n) => n !== null);

  const last = nums.length ? Math.max(...nums) : 0;
  const next = last + 1;
  if (next > 999) return "__MAX__"; // trigger error
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

// date -> "HH:mm:ss"
function toHms(dateObj) {
  if (!dateObj) return null;
  const h = String(dateObj.getHours()).padStart(2, "0");
  const m = String(dateObj.getMinutes()).padStart(2, "0");
  const s = String(dateObj.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* =========================
   Zod Schema - SEMUA FIELD WAJIB
========================= */

const schema = z.object({
  counter_code: z
    .string()
    .min(1, "Kode Counter wajib diisi")
    .regex(/^[A-Z]{2}-\d{3}$/, "Format harus XX-000 (huruf besar & 3 digit)"),
  name: z.string().min(2, "Nama Layanan wajib diisi (minimal 2 karakter)"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  quota: z
    .number({ required_error: "Kuota wajib diisi" })
    .int("Kuota harus bilangan bulat")
    .min(1, "Kuota minimal 1"),
  schedule_start: z.date({ required_error: "Jadwal Mulai wajib diisi" }),
  schedule_end: z.date({ required_error: "Jadwal Selesai wajib diisi" }),
});

export default function AddCounter() {
  const navigate = useNavigate();
  const toast = useRef(null);

  const { data: counters = [] } = useGetCountersQuery();

  // Auto-suggest code
  const [userEditedCode, setUserEditedCode] = useState(false);
  const [serviceName, setServiceName] = useState("");

  // State untuk men-track field yang sudah di-touch
  const [touchedFields, setTouchedFields] = useState({
    quota: false,
    name: false,
    counter_code: false,
    description: false,
    schedule_start: false,
    schedule_end: false,
  });

  // State untuk menandai apakah form sudah pernah di-submit
  const [isSubmitted, setIsSubmitted] = useState(false);

  const debouncedName = useDebounce(serviceName, 500);
  const prefix = useMemo(
    () => buildPrefixFromName(debouncedName),
    [debouncedName]
  );

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
    reset,
    trigger,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      counter_code: "",
      name: "",
      description: "",
      quota: undefined,
      schedule_start: null,
      schedule_end: null,
    },
    mode: "onChange",
  });

  const [addCounter, { isLoading: isSaving }] = useAddCounterMutation();

  // Auto suggest counter_code berdasarkan name
  useEffect(() => {
    if (!debouncedName) {
      setValue("counter_code", "");
      setUserEditedCode(false);
      return;
    }
    if (userEditedCode) return;
    const suggestion = getNextThreeDigitCode(prefix, counters || []);
    if (suggestion === "__MAX__") {
      setError("counter_code", {
        type: "manual",
        message: `Kode untuk prefix "${prefix}" sudah mencapai batas maksimal (999).`,
      });
      return;
    }
    if (suggestion) {
      clearErrors("counter_code");
      setValue("counter_code", suggestion);
      // Trigger validation setelah set value
      if (isSubmitted) {
        trigger("counter_code");
      }
    }
  }, [
    debouncedName,
    prefix,
    counters,
    userEditedCode,
    setValue,
    setError,
    clearErrors,
    isSubmitted,
    trigger,
  ]);

  // Bersihkan error saat nama kosong
  useEffect(() => {
    if (!serviceName) {
      setValue("counter_code", "");
      setUserEditedCode(false);
      clearErrors("counter_code");
    }
  }, [serviceName, setValue, clearErrors]);

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

    // Tandai semua field sebagai touched saat submit
    setTouchedFields({
      quota: true,
      name: true,
      counter_code: true,
      description: true,
      schedule_start: true,
      schedule_end: true,
    });

    // Trigger validation untuk semua field
    const isValid = await trigger();
    if (!isValid) {
      toast.current.show({
        severity: "error",
        summary: "Validasi Gagal",
        detail: "Harap perbaiki semua field yang ditandai dengan warna merah",
      });
      return;
    }

    const payload = {
      counter_code: values.counter_code,
      name: values.name,
      description: values.description,
      quota: values.quota,
      schedule_start: toHms(values.schedule_start),
      schedule_end: toHms(values.schedule_end),
    };

    try {
      await addCounter(payload).unwrap();
      toast.current.show({
        severity: "success",
        summary: "Berhasil",
        detail: "Counter berhasil ditambahkan.",
      });
      setTimeout(() => navigate("/admin/counters"), 450);
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.message ||
        "Gagal menambahkan counter. Periksa kembali input Anda.";

      // mapping error field jika ada
      if (err?.data?.errors) {
        Object.entries(err.data.errors).forEach(([field, messages]) => {
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
    }
  };

  return (
    <div className="space-y-5">
      <Toast ref={toast} />

      {/* TOP APP BAR (HDR-B) */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center h-10 px-3 md:px-4 border-b border-slate-200">
          <div className="text-base md:text-lg font-semibold text-[#004A9F] tracking-wide">
            Tambah Counter
          </div>
        </div>
      </div>

      {/* CONTAINER */}
      <div className="max-w-6xl mx-auto px-3 md:px-4">
        {/* SPLIT PANELS (C2) */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT CARD — Informasi Layanan */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-6">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Informasi Layanan
              </h3>
            </div>

            {/* Nama Layanan */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Nama Layanan <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setServiceName(e.target.value);
                      if (isSubmitted) trigger("name");
                    }}
                    onBlur={() => handleFieldTouch("name")}
                    placeholder="Contoh: BPJS, Disdukcapil, Samsat"
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      shouldShowError("name")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                  />
                )}
              />
              {shouldShowError("name") && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-sm"></i>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Kode Counter */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Kode Counter <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  Format:{" "}
                  <span className="font-mono font-semibold">XX-000</span>
                </span>
              </div>
              <Controller
                name="counter_code"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    value={field.value}
                    onChange={(e) => {
                      setUserEditedCode(true);
                      field.onChange(e.target.value.toUpperCase());
                      clearErrors("counter_code");
                      if (isSubmitted) trigger("counter_code");
                    }}
                    onBlur={() => handleFieldTouch("counter_code")}
                    placeholder="XX-000"
                    className={`w-full px-4 py-3 rounded-xl border transition-colors uppercase font-medium ${
                      shouldShowError("counter_code")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                  />
                )}
              />
              {shouldShowError("counter_code") ? (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-sm"></i>
                  {errors.counter_code.message}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <i className="pi pi-info-circle text-slate-400"></i>
                  Otomatis: 2 huruf dari nama layanan + 3 digit (001–999). Bisa
                  diedit manual.
                </p>
              )}
            </div>

            {/* Deskripsi */}
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
                    rows={4}
                    placeholder="Tuliskan informasi singkat mengenai layanan ini..."
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      if (isSubmitted) trigger("description");
                    }}
                    onBlur={() => handleFieldTouch("description")}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      shouldShowError("description")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                  />
                )}
              />
              {shouldShowError("description") && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-sm"></i>
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT CARD — Jadwal & Kuota */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-6">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Jadwal & Kuota
              </h3>
            </div>

            {/* Kuota */}
            <div className="mb-5">
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
                    className={`w-full rounded-xl border transition-colors ${
                      shouldShowError("quota")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-slate-400 focus:border-[#004A9F]"
                    } focus:ring-2 focus:ring-[#004A9F]/20`}
                    inputClassName={`px-4 py-3 w-full ${
                      shouldShowError("quota") ? "text-red-600" : ""
                    }`}
                    min={1}
                    useGrouping={false}
                  />
                )}
              />
              {shouldShowError("quota") && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle text-sm"></i>
                  {errors.quota.message}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Kuota minimal 1 per hari
              </p>
            </div>

            {/* Jadwal Mulai & Selesai */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Jadwal Mulai <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
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
                      icon="pi pi-clock px-3"
                      placeholder="Pilih waktu mulai..."
                      className={`w-full rounded-xl border transition-colors ${
                        shouldShowError("schedule_start")
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                      inputClassName={`px-4 py-3 w-full rounded-xl ${
                        shouldShowError("schedule_start") ? "text-red-600" : ""
                      }`}
                    />
                  )}
                />
                {shouldShowError("schedule_start") && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <i className="pi pi-exclamation-circle text-sm"></i>
                    {errors.schedule_start.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Jadwal Selesai <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
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
                      icon="pi pi-clock px-3"
                      placeholder="Pilih waktu selesai..."
                      className={`w-full rounded-xl border transition-colors ${
                        shouldShowError("schedule_end")
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                      inputClassName={`px-4 py-3 w-full rounded-xl ${
                        shouldShowError("schedule_end") ? "text-red-600" : ""
                      }`}
                    />
                  )}
                />
                {shouldShowError("schedule_end") && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <i className="pi pi-exclamation-circle text-sm"></i>
                    {errors.schedule_end.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BUTTON AREA */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                label="Batal"
                icon="pi pi-times px-1"
                outlined
                className="!px-8 !py-3 !rounded-xl border-red-500 text-white bg-red-500 hover:bg-red-700 hover:border-red-700 transition-all"
                onClick={() => navigate("/admin/counters")}
              />
              <Button
                type="submit"
                label={isSaving || isSubmitting ? "Menyimpan..." : "Save"}
                icon="pi pi-save px-1"
                disabled={isSaving || isSubmitting}
                className="!px-8 !py-3 !rounded-xl !text-white shadow-sm
                           transition-all hover:shadow-md
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
