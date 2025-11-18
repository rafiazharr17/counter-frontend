import React, { useState, useEffect, useRef } from "react";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useNavigate, useParams } from "react-router-dom";

export default function EditCS() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [showSuccess, setShowSuccess] = useState(false);

  const initialData = {
    counter_code: "BP-001",
    name: "BPJS",
    description:
      "Layanan pembuatan kartu BPJS, informasi kepesertaan, dan konsultasi.",
    quota: 100,
    schedule_start: "08:00:00",
    schedule_end: "15:00:00",
  };

  const [form, setForm] = useState(initialData);

  const formatHms = (value) => {
    if (!value) return "";
    const [h, m] = value.split(":");
    return `${h}:${m}`;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  // === POPUP SUKSES TANPA CONFIRM ===
  const handleSave = () => {
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      navigate("/cs");
    }, 1500);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* POPUP SUKSES */}
      <Dialog
        visible={showSuccess}
        closable={false}
        className="rounded-2xl"
        style={{ width: "350px" }}
        modal
      >
        <div className="text-center py-6">
          <div className="flex justify-center mb-3">
            <span
              className="pi pi-check-circle text-green-500"
              style={{ fontSize: "3rem" }}
            ></span>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-1">
            Berhasil!
          </h3>
          <p className="text-slate-600">Data berhasil diperbarui.</p>
        </div>
      </Dialog>

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="flex items-center h-12 px-4 border-b border-slate-200">
          <div className="text-lg font-semibold text-[#004A9F] tracking-wide">
            Edit Counter
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Informasi Layanan
            </h3>

            {/* KODE COUNTER */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Kode Counter
              </label>
              <InputText
                value={form.counter_code}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono uppercase"
              />
            </div>

            {/* NAMA */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Layanan
              </label>
              <InputText
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/20"
              />
            </div>

            {/* DESKRIPSI */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Deskripsi
              </label>
              <InputTextarea
                autoResize
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/20"
              />
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Jadwal & Kuota
            </h3>

            {/* KUOTA */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Kuota per Hari
              </label>
              <InputText
                type="number"
                value={form.quota}
                onChange={(e) => updateField("quota", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/20"
              />
            </div>

            {/* JAM MULAI */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Jadwal Mulai
              </label>
              <InputText
                type="time"
                value={formatHms(form.schedule_start)}
                onChange={(e) =>
                  updateField("schedule_start", e.target.value + ":00")
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/20"
              />
            </div>

            {/* JAM SELESAI */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Jadwal Selesai
              </label>
              <InputText
                type="time"
                value={formatHms(form.schedule_end)}
                onChange={(e) =>
                  updateField("schedule_end", e.target.value + ":00")
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#004A9F] focus:ring-2 focus:ring-[#004A9F]/20"
              />
            </div>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center gap-4 mt-10">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="!px-8 !py-3 !rounded-xl !text-white bg-red-500 hover:bg-red-600"
            onClick={() => navigate("/cs")}
          />

          <Button
            label="Simpan"
            icon="pi pi-save"
            className="!px-8 !py-3 !rounded-xl !text-white bg-gradient-to-r from-[#004A9F] to-[#0066CC] hover:from-[#003B80] hover:to-[#004A9F]"
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
