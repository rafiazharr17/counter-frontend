import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

export default function DetailCS() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Dummy data
  const counters = [
    {
      id: 1,
      name: "BPJS",
      counter_code: "BP-001",
      quota: "100 / hari",
      schedule_start: "08:00:00",
      schedule_end: "15:00:00",
      description:
        "Layanan pembuatan kartu BPJS, informasi kepesertaan, dan konsultasi.",
    },
    {
      id: 2,
      name: "Samsat",
      counter_code: "SM-002",
      quota: "80 / hari",
      schedule_start: "09:00:00",
      schedule_end: "14:00:00",
      description:
        "Layanan administrasi kendaraan bermotor dan pembayaran pajak.",
    },
    {
      id: 3,
      name: "Pelayanan Pajak Bumi dan Bangunan",
      counter_code: "PBB-003",
      quota: "120 / hari",
      schedule_start: "08:30:00",
      schedule_end: "15:30:00",
      description: "Layanan pembayaran dan konsultasi Pajak Bumi dan Bangunan.",
    },
  ];

  const [data, setData] = useState(null);

  // POPUP
  const [visible, setVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setVisible(true);
  };

  useEffect(() => {
    const selected = counters.find((c) => c.id === Number(id));
    setData(selected);
    window.scrollTo(0, 0);
  }, [id]);

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-600">
        Loading detail counter...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      {/* ================= POPUP ================= */}
      <Dialog
        visible={visible}
        onHide={() => setVisible(false)}
        className="w-80 md:w-96"
        modal
        closable={false}
      >
        <div className="text-center py-4">
          {/* ICON */}
          <span
            className="pi pi-check-circle"
            style={{ fontSize: "70px", color: "rgb(34 197 94)" }}
          ></span>

          {/* TITLE */}
          <h2 className="text-xl font-bold text-slate-800 mt-3">Berhasil!</h2>

          {/* MESSAGE */}
          <p className="text-slate-500 mt-1">{popupMessage}</p>

          {/* BUTTON KECIL */}
          <div className="flex justify-center">
            <Button
              label="OK"
              className="mt-5 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm"
              onClick={() => setVisible(false)}
            />
          </div>
        </div>
      </Dialog>
      {/* =================================================== */}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-[#004A9F]">
          Detail Counter — {data.name}
        </h2>
        <p className="text-slate-500 mt-1">
          Informasi lengkap mengenai counter pelayanan
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Informasi Layanan
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Nama Layanan:</p>
              <p className="font-semibold text-slate-700">{data.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Kode Counter:</p>
              <p className="font-mono bg-slate-100 inline-block px-3 py-1 rounded-lg text-slate-700">
                {data.counter_code}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Deskripsi:</p>
              <p className="text-slate-700">{data.description}</p>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Jadwal & Kuota
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Kuota per Hari:</p>
              <p className="font-semibold text-slate-700">{data.quota}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Jadwal Operasional:</p>
              <p className="font-semibold text-slate-700">
                {data.schedule_start} - {data.schedule_end}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BUTTON SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Aksi Counter
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            label="Panggil"
            icon="pi pi-volume-up"
            className="h-12 w-full bg-blue-50 border border-blue-300 text-blue-700 rounded-full font-semibold"
            onClick={() => showPopup("Memanggil antrian...")}
          />

          <Button
            label="Panggil Ulang"
            icon="pi pi-refresh"
            className="h-12 w-full bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-full font-semibold"
            onClick={() => showPopup("Memanggil ulang antrian...")}
          />

          <Button
            label="Layani"
            icon="pi pi-user-check"
            className="h-12 w-full bg-green-50 border border-green-300 text-green-700 rounded-full font-semibold"
            onClick={() => showPopup("Mulai melayani warga...")}
          />

          <Button
            label="Selesai"
            icon="pi pi-check-circle"
            className="h-12 w-full bg-teal-50 border border-teal-300 text-teal-700 rounded-full font-semibold"
            onClick={() => showPopup("Pelayanan selesai.")}
          />

          <Button
            label="Batal"
            icon="pi pi-times-circle"
            className="h-12 w-full bg-red-50 border border-red-300 text-red-700 rounded-full font-semibold"
            onClick={() => showPopup("Antrian dibatalkan.")}
          />

          <Button
            label="Selanjutnya"
            icon="pi pi-step-forward"
            className="h-12 w-full bg-purple-50 border border-purple-300 text-purple-700 rounded-full font-semibold"
            onClick={() => showPopup("Masuk ke antrian berikutnya...")}
          />
        </div>
      </div>

      {/* Kembali */}
      <div className="text-center pt-4">
        <Button
          label="Kembali"
          icon="pi pi-arrow-left"
          className="bg-slate-200 text-slate-700 border-slate-300 rounded-xl px-5 py-3"
          onClick={() => navigate("/cs")}
        />
      </div>
    </div>
  );
}
