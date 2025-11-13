import React, { useState } from "react";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

const AmbilAntrean = () => {
  const [visible, setVisible] = useState(false);
  const [selectedLayanan, setSelectedLayanan] = useState(null);
  const [nomorAntrian, setNomorAntrian] = useState(null);
  const [tanggal, setTanggal] = useState("");

  const layanan = [
    { id: 1, nama: "BPJS", warna: "from-sky-900/60 to-sky-500/70" },
    { id: 2, nama: "Samsat", warna: "from-indigo-900/60 to-indigo-500/70" },
    { id: 3, nama: "Pembayaran PBB", warna: "from-blue-900/60 to-blue-500/70" },
    {
      id: 4,
      nama: "Pelayanan Pajak Bumi dan Bangunan",
      warna: "from-cyan-900/60 to-cyan-500/70",
    },
    {
      id: 5,
      nama: "Kartu Keluarga (KK)",
      warna: "from-teal-900/60 to-teal-500/70",
    },
  ];

  const ambilNomor = (layanan) => {
    const randomNomor = Math.floor(Math.random() * 100) + 1;
    const tanggalSekarang = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    setSelectedLayanan(layanan);
    setNomorAntrian(randomNomor);
    setTanggal(tanggalSekarang);
    setVisible(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10 px-4">
      {/* Judul */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-sky-900 mb-2 drop-shadow-sm">
          Petunjuk Penggunaan
        </h1>
        <p className="text-gray-600">
          Sentuh layanan yang diinginkan untuk mengambil nomor antrian.
        </p>
      </div>

      {/* Grid Kartu Layanan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {layanan.map((item) => (
          <div
            key={item.id}
            onClick={() => ambilNomor(item.nama)}
            className="cursor-pointer transform hover:-translate-y-1 transition-all duration-300"
          >
            <Card
              className="flex items-center p-5 rounded-3xl shadow-md hover:shadow-xl bg-white"
              style={{
                borderTop: "4px solid rgba(12,74,110,0.6)",
              }}
            >
              {/* Ikon */}
              <div
                className={`flex items-center justify-center bg-gradient-to-br ${item.warna} text-white rounded-2xl w-16 h-16 mr-5 shadow-md`}
              >
                <i className="pi pi-check-circle text-3xl"></i>
              </div>

              {/* Teks */}
              <div>
                <h2 className="text-lg font-semibold text-sky-900">
                  {item.nama}
                </h2>
                <p className="text-gray-500 text-sm">
                  Tekan untuk mengambil nomor antrian
                </p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Dialog Notifikasi */}
      <Dialog
        header="Nomor Antrian Anda"
        visible={visible}
        style={{ width: "90%", maxWidth: "400px", borderRadius: "16px" }}
        closable={false} // Hilangkan tombol X di pojok kanan atas
        onHide={() => setVisible(false)}
        className="rounded-3xl text-center"
      >
        <div className="flex flex-col items-center justify-center py-4">
          {/* Ikon */}
          <div className="w-20 h-20 rounded-full bg-sky-900/60 flex items-center justify-center mb-4 shadow-lg">
            <i className="pi pi-ticket text-4xl text-white"></i>
          </div>

          {/* Nama Layanan */}
          <h2 className="text-lg font-semibold text-sky-900 mb-1">
            {selectedLayanan}
          </h2>

          {/* Tanggal */}
          <p className="text-gray-600 text-sm mb-4">{tanggal}</p>

          {/* Nomor Antrian */}
          <div className="bg-sky-900/10 border border-sky-900/20 rounded-xl py-3 px-6 mb-5">
            <h3 className="text-5xl font-extrabold text-sky-900">
              {nomorAntrian}
            </h3>
            <p className="text-gray-600 text-sm mt-1">Nomor Antrian</p>
          </div>

          {/* Tombol Tutup */}
          <Button
            label="Tutup"
            icon="pi pi-times"
            className="w-32 bg-sky-900 hover:bg-sky-900/60 text-white font-semibold px-6 py-2 rounded-lg border-none focus:outline-none focus:ring-0 shadow-sm transition-all duration-200"
            onClick={() => setVisible(false)}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AmbilAntrean;
