import React from "react";
import { PiMonitorFill, PiHeadphonesFill } from "react-icons/pi";

export default function DisplayScreen() {
  const queues = [
    {
      code: "B",
      number: "004",
      service: "BPJS",
      loket: "Loket 01",
      iconColor: "bg-purple-100 text-purple-600",
    },
    {
      code: "D",
      number: "000",
      service: "Dispenda",
      loket: "Loket 02",
      iconColor: "bg-green-100 text-green-600",
    },
    {
      code: "K",
      number: "000",
      service: "Pembuatan KTP",
      loket: "Loket 03",
      iconColor: "bg-orange-100 text-orange-600",
    },
    {
      code: "I",
      number: "000",
      service: "Perizinan IMB",
      loket: "Loket 04",
      iconColor: "bg-sky-100 text-sky-700",
    },
    {
      code: "S",
      number: "000",
      service: "Samsat",
      loket: "Loket 05",
      iconColor: "bg-sky-100 text-sky-600",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-200 to-white p-10">
      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 justify-center">
        {queues.map((q, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 p-8 select-none"
          >
            {/* ICON + LAYANAN */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${q.iconColor}`}
              >
                <PiMonitorFill size={26} />
              </div>

              <h2 className="text-lg font-semibold text-gray-700 uppercase tracking-wide">
                {q.service}
              </h2>
            </div>

            {/* NOMOR ANTRIAN */}
            <div className="mt-6">
              <span className="text-6xl font-black text-gray-900 tracking-widest">
                {q.code}-{q.number}
              </span>
            </div>

            {/* BADGE LOKET — NEW SOFT + DARK TOUCH */}
            <div className="mt-8 flex flex-wrap gap-3">
              <div
                className="
                flex items-center gap-2 
                bg-sky-200 
                text-sky-900 
                px-4 py-2 
                rounded-full 
                text-sm font-medium 
                border border-sky-900/40 
                shadow-[0_0_10px_rgba(15,40,90,0.25)]
              "
              >
                <PiHeadphonesFill size={16} className="text-sky-700" />
                {q.loket}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
