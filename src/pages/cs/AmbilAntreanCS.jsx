import React, { useState, useRef, useCallback, useMemo } from "react";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { useGetCountersQuery } from "../../features/counters/counterApi";
import {
  useCreateQueueMutation,
  useGetQueuesQuery,
} from "../../features/queues/queueApi";
import { useWebSocket } from "../../hooks/useWebSocket";

const AmbilAntrean = () => {
  const [visible, setVisible] = useState(false);
  const [selectedLayanan, setSelectedLayanan] = useState(null);
  const [nomorAntrian, setNomorAntrian] = useState(null);
  const [tanggal, setTanggal] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const toast = useRef(null);

  const lastUsedCounterRef = useRef(new Map());
  const serviceDataRef = useRef(new Map());

  // Gunakan useGetCountersQuery yang sudah menggunakan guest endpoint
  const {
    data: counters = [],
    isLoading,
    error: countersError,
  } = useGetCountersQuery();

  // Ambil antrian hari ini
  const { data: todayQueues = [], refetch: refetchQueues } = useGetQueuesQuery({
    date: new Date().toISOString().split("T")[0],
  });

  // WebSocket untuk real-time update
  useWebSocket(() => {
    refetchQueues();
  });

  // Mutation untuk membuat antrian baru
  const [createQueue, { isLoading: isCreatingQueue }] =
    useCreateQueueMutation();

  // Helper function untuk extract nomor loket
  const extractCounterNumber = useCallback((counterCode) => {
    if (!counterCode) return null;
    const parts = counterCode.split("-");
    if (parts.length >= 2) return parseInt(parts[1]) || null;
    return null;
  }, []);

  // Fungsi untuk cek jam operasional
  const checkOperatingHours = useCallback((startTime, endTime, currentTime) => {
    if (!startTime || !endTime) return true;

    try {
      const formatTimeToMinutes = (timeStr) => {
        const parts = timeStr.split(":");
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
      };

      const startMinutes = formatTimeToMinutes(startTime);
      const endMinutes = formatTimeToMinutes(endTime);

      return currentTime >= startMinutes && currentTime <= endMinutes;
    } catch (error) {
      console.error("Error checking operating hours:", error);
      return true;
    }
  }, []);

  // Proses data counters menjadi services - GROUP BY NAME
  const services = useMemo(() => {
    if (!counters || !Array.isArray(counters) || counters.length === 0) {
      console.log("No counters data available or empty array");
      return [];
    }

    console.log(
      `Processing ${counters.length} counters into services (grouped by name)`
    );

    const serviceMap = new Map();

    // Group counters by name (nama layanan)
    counters.forEach((counter) => {
      if (!counter || !counter.id) return;

      const serviceName = counter.name; // Gunakan nama sebagai key

      if (!serviceMap.has(serviceName)) {
        // Buat service baru
        serviceMap.set(serviceName, {
          id: `service-${counter.id}`, // Gunakan counter.id pertama sebagai base
          name: serviceName,
          description: counter.description || "Layanan antrian",
          color_gradient: counter.color_gradient,
          counters: [],
          totalQuota: 0,
        });
      }

      const service = serviceMap.get(serviceName);

      // Tambahkan counter ke service
      const counterData = {
        ...counter,
        counter_number:
          extractCounterNumber(counter.counter_code) || counter.id,
        daily_quota: counter.quota || 1,
        operating_hours_start: counter.schedule_start || "08:00",
        operating_hours_end: counter.schedule_end || "16:00",
        is_active: counter.is_active !== false,
      };

      service.counters.push(counterData);
      service.totalQuota += counter.quota || 1;

      // Update ID dengan format yang lebih baik
      service.id = `service-${serviceName.toLowerCase().replace(/\s+/g, "-")}`;
    });

    // Urutkan counters dalam setiap service berdasarkan counter_code
    serviceMap.forEach((service) => {
      service.counters.sort((a, b) => {
        const numA = extractCounterNumber(a.counter_code) || 0;
        const numB = extractCounterNumber(b.counter_code) || 0;
        return numA - numB;
      });

      // Ambil deskripsi dari counter pertama
      if (service.counters.length > 0 && !service.description) {
        service.description =
          service.counters[0].description || `Layanan ${service.name}`;
      }
    });

    const servicesArray = Array.from(serviceMap.values()).sort((a, b) => {
      return a.name.localeCompare(b.name, "id", { sensitivity: "base" });
    });

    serviceDataRef.current = serviceMap;
    console.log(
      `Created ${servicesArray.length} services (grouped from ${counters.length} counters)`
    );

    // Debug: tampilkan semua services dengan jumlah counters
    servicesArray.forEach((service, index) => {
      console.log(
        `Service ${index + 1}: ${service.name} (${
          service.counters.length
        } counters, total quota: ${service.totalQuota})`
      );
      service.counters.forEach((counter, idx) => {
        console.log(
          `  - Counter ${idx + 1}: ${counter.counter_code} (ID: ${counter.id})`
        );
      });
    });

    return servicesArray;
  }, [counters, extractCounterNumber]);

  // Hitung status dan quota untuk service (gabungan dari semua counters)
  const { serviceStatus, remainingQuotas } = useMemo(() => {
    const statusMap = {};
    const quotaMap = {};

    if (services.length === 0) {
      return { serviceStatus: statusMap, remainingQuotas: quotaMap };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    services.forEach((service) => {
      // Hitung total antrian untuk semua counters dalam service ini
      let totalServiceQueues = 0;

      service.counters.forEach((counter) => {
        const counterQueueCount = Array.isArray(todayQueues)
          ? todayQueues.filter((queue) => queue.counter_id === counter.id)
              .length
          : 0;
        totalServiceQueues += counterQueueCount;
      });

      // Hitung sisa kuota total service
      const remainingQuota = Math.max(
        0,
        service.totalQuota - totalServiceQueues
      );
      quotaMap[service.name] = remainingQuota;

      // Tentukan status service berdasarkan semua counters
      let activeCounters = 0;
      let fullCounters = 0;
      let closedCounters = 0;

      service.counters.forEach((counter) => {
        const isWithinHours = checkOperatingHours(
          counter.operating_hours_start,
          counter.operating_hours_end,
          currentTime
        );

        const counterQueueCount = Array.isArray(todayQueues)
          ? todayQueues.filter((queue) => queue.counter_id === counter.id)
              .length
          : 0;

        const isQuotaExceeded = counterQueueCount >= counter.daily_quota;
        const isCounterActive = counter.is_active;

        if (!isCounterActive) {
          closedCounters++;
        } else if (!isWithinHours) {
          closedCounters++;
        } else if (isQuotaExceeded) {
          fullCounters++;
        } else {
          activeCounters++;
        }
      });

      // Tentukan status service secara keseluruhan
      if (activeCounters === 0 && fullCounters > 0) {
        // Semua counter penuh
        statusMap[service.name] = {
          status: "full",
          reason: `Semua ${service.counters.length} loket sudah penuh`,
        };
      } else if (closedCounters === service.counters.length) {
        // Semua counter tutup
        statusMap[service.name] = {
          status: "closed",
          reason: `Semua ${service.counters.length} loket sedang tutup`,
        };
      } else if (totalServiceQueues >= service.totalQuota) {
        // Kuota total service terpenuhi
        statusMap[service.name] = {
          status: "full",
          reason: `Kuota total layanan sudah terpenuhi (${totalServiceQueues}/${service.totalQuota})`,
        };
      } else if (activeCounters > 0) {
        // Ada counter yang available
        statusMap[service.name] = {
          status: "available",
          reason: `${activeCounters} dari ${service.counters.length} loket tersedia`,
        };
      } else {
        // Default ke tutup
        statusMap[service.name] = {
          status: "closed",
          reason: "Layanan sedang tidak tersedia",
        };
      }
    });

    return { serviceStatus: statusMap, remainingQuotas: quotaMap };
  }, [services, todayQueues, checkOperatingHours]);

  // Fungsi untuk mendapatkan counter optimal dengan round-robin
  const getOptimalCounter = useCallback(
    (serviceName) => {
      const service = serviceDataRef.current.get(serviceName);
      if (!service || !service.counters.length) return null;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Filter counters yang available
      const availableCounters = service.counters.filter((counter) => {
        const isWithinHours = checkOperatingHours(
          counter.operating_hours_start,
          counter.operating_hours_end,
          currentTime
        );

        const counterQueueCount = Array.isArray(todayQueues)
          ? todayQueues.filter((queue) => queue.counter_id === counter.id)
              .length
          : 0;

        const isQuotaExceeded = counterQueueCount >= counter.daily_quota;

        return counter.is_active && isWithinHours && !isQuotaExceeded;
      });

      if (availableCounters.length === 0) return null;

      // Round-robin selection untuk load balancing
      const lastUsed = lastUsedCounterRef.current.get(serviceName);
      let startIndex = 0;

      if (lastUsed !== undefined) {
        const lastIndex = availableCounters.findIndex((c) => c.id === lastUsed);
        startIndex =
          lastIndex !== -1 ? (lastIndex + 1) % availableCounters.length : 0;
      }

      const selectedCounter = availableCounters[startIndex];
      lastUsedCounterRef.current.set(serviceName, selectedCounter.id);

      return selectedCounter;
    },
    [todayQueues, checkOperatingHours]
  );

  // Fungsi untuk menampilkan alert
  const showAlert = useCallback((message, severity = "warn") => {
    if (toast.current) {
      toast.current.show({
        severity: severity,
        summary: "Informasi",
        detail: message,
        life: 5000,
      });
    }
  }, []);

  // Fungsi utama untuk mengambil nomor antrian
  const ambilNomor = useCallback(
    async (service) => {
      try {
        setErrorMessage("");

        const statusInfo = serviceStatus[service.name];

        if (!statusInfo) {
          showAlert(`Status layanan ${service.name} tidak diketahui.`);
          return;
        }

        if (statusInfo.status === "full") {
          showAlert(
            `Layanan ${service.name} sudah penuh. ${statusInfo.reason}`
          );
          return;
        }

        if (statusInfo.status === "closed") {
          showAlert(
            `Layanan ${service.name} sedang tutup. ${statusInfo.reason}`
          );
          return;
        }

        const optimalCounter = getOptimalCounter(service.name);

        if (!optimalCounter) {
          showAlert(
            `Layanan ${service.name} sudah tidak tersedia. Silakan refresh halaman.`
          );
          return;
        }

        const tanggalSekarang = new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        setSelectedLayanan(service.name);
        setTanggal(tanggalSekarang);
        setNomorAntrian(null);
        setVisible(true);

        createQueue({
          counter_id: optimalCounter.id,
          service_name: service.name,
        })
          .unwrap()
          .then((result) => {
            if (result.data && result.data.queue_number) {
              setNomorAntrian(result.data.queue_number);
              setTimeout(() => {
                refetchQueues();
              }, 500);
            } else {
              throw new Error("No queue number received");
            }
          })
          .catch((error) => {
            console.error("Error creating queue:", error);
            setErrorMessage(
              error.data?.message ||
                "Gagal mengambil nomor antrian. Silakan coba lagi."
            );
            setVisible(false);
          });
      } catch (error) {
        console.error("Error in ambilNomor:", error);
        setErrorMessage("Terjadi kesalahan. Silakan coba lagi.");
        setVisible(false);
      }
    },
    [serviceStatus, getOptimalCounter, showAlert, createQueue, refetchQueues]
  );

  // Format nomor antrian
  const formatQueueNumber = useCallback((queueNumber) => {
    if (!queueNumber) return "-";
    const parts = queueNumber.split("-");
    if (parts.length < 4) return queueNumber;
    const first6 = `${parts[0]}-${parts[1]}`;
    const last3 = parts[3];
    return `${first6}-${last3}`;
  }, []);

  // Format waktu display
  const formatTimeDisplay = useCallback((timeStr) => {
    if (!timeStr) return "-";
    return timeStr.substring(0, 5);
  }, []);

  // Get card style berdasarkan status
  const getCardStyle = useCallback(
    (service) => {
      const statusInfo = serviceStatus[service.name];
      if (!statusInfo)
        return {
          borderTop: "4px solid rgba(12,74,110,0.6)",
          cursor: "pointer",
        };

      if (statusInfo.status === "full") {
        return {
          borderTop: "4px solid rgba(239,68,68,0.6)",
          opacity: 0.7,
          cursor: "not-allowed",
        };
      }

      if (statusInfo.status === "closed") {
        return {
          borderTop: "4px solid rgba(156,163,175,0.6)",
          opacity: 0.5,
          cursor: "not-allowed",
        };
      }

      return {
        borderTop: "4px solid rgba(12,74,110,0.6)",
        cursor: "pointer",
      };
    },
    [serviceStatus]
  );

  // Get status badge
  const getStatusBadge = useCallback(
    (service) => {
      const statusInfo = serviceStatus[service.name];
      if (!statusInfo) return null;

      switch (statusInfo.status) {
        case "full":
          return (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Layanan Sudah Penuh
            </span>
          );
        case "closed":
          return (
            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Layanan Sedang Tutup
            </span>
          );
        default:
          return (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Tersedia
            </span>
          );
      }
    },
    [serviceStatus]
  );

  // Get status message untuk overlay
  const getStatusMessage = useCallback(
    (service) => {
      const statusInfo = serviceStatus[service.name];
      if (!statusInfo) return null;

      if (statusInfo.status === "full") {
        return {
          icon: "pi-times-circle",
          color: "red",
          text: `${service.name} - Layanan Sudah Penuh`,
          description: statusInfo.reason,
        };
      }

      if (statusInfo.status === "closed") {
        return {
          icon: "pi-clock",
          color: "gray",
          text: `${service.name} - Layanan Sedang Tutup`,
          description: statusInfo.reason,
        };
      }

      return null;
    },
    [serviceStatus]
  );

  // Jika masih loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <i className="pi pi-spin pi-spinner text-4xl text-sky-900 mb-4"></i>
          <p className="text-gray-600">Memuat data layanan...</p>
        </div>
      </div>
    );
  }

  // Jika ada error
  if (countersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <i className="pi pi-exclamation-circle text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-600">Gagal memuat data layanan</p>
          <p className="text-sm text-gray-500 mt-2">{countersError.message}</p>
          <Button
            label="Coba Lagi"
            icon="pi pi-refresh"
            className="mt-4"
            onClick={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Warna gradient untuk kartu
  const colorGradients = [
    "from-sky-900/60 to-sky-500/70",
    "from-indigo-900/60 to-indigo-500/70",
    "from-blue-900/60 to-blue-500/70",
    "from-cyan-900/60 to-cyan-500/70",
    "from-teal-900/60 to-teal-500/70",
    "from-emerald-900/60 to-emerald-500/70",
    "from-violet-900/60 to-violet-500/70",
    "from-purple-900/60 to-purple-500/70",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 py-10 px-4">
      {/* Toast Notification */}
      <Toast ref={toast} />

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full max-w-5xl mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <i className="pi pi-exclamation-circle mr-2"></i>
              <span>{errorMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Judul */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-sky-900 mb-2 drop-shadow-sm">
          Ambil Nomor Antrian
        </h1>
        <p className="text-lg text-gray-600">
          Pilih layanan yang diinginkan untuk mengambil nomor antrian.
        </p>
      </div>

      {/* Grid Kartu Layanan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        {services.map((service, index) => {
          const statusInfo = serviceStatus[service.name];
          const isDisabled =
            statusInfo &&
            (statusInfo.status === "full" || statusInfo.status === "closed");
          const statusMessage = getStatusMessage(service);
          const remainingQuota = remainingQuotas[service.name] || 0;
          const firstCounter = service.counters[0]; // Counter pertama untuk info dasar

          return (
            <div
              key={service.id}
              onClick={() => !isDisabled && ambilNomor(service)}
              className={`transform transition-all duration-300 ${
                isDisabled ? "" : "hover:-translate-y-1 cursor-pointer"
              }`}>
              <Card
                className={`flex flex-col items-center justify-center p-8 rounded-3xl shadow-md ${
                  isDisabled ? "" : "hover:shadow-xl"
                } bg-white text-center min-h-[200px] relative`}
                style={getCardStyle(service)}>
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(service)}
                </div>

                {/* Ikon */}
                <div
                  className={`flex items-center justify-center bg-gradient-to-br ${
                    service.color_gradient ||
                    colorGradients[index % colorGradients.length]
                  } text-white rounded-2xl w-25 h-25 mb-4 shadow-md mx-auto ${
                    isDisabled ? "opacity-50" : ""
                  }`}>
                  <i
                    className={`pi ${
                      isDisabled
                        ? "pi-clock text-6xl"
                        : service.counters.length > 1
                        ? "pi-building text-6xl" // Ikon berbeda untuk multiple counters
                        : "pi-check-circle text-6xl"
                    }`}></i>
                </div>

                {/* Teks */}
                <div className="text-center w-full">
                  <h2
                    className={`text-3xl font-semibold mb-2 ${
                      isDisabled ? "text-gray-500" : "text-sky-900"
                    }`}>
                    {service.name}
                    {service.counters.length > 1 && (
                      <span className="ml-2 text-sm font-normal text-sky-600">
                        ({service.counters.length} loket)
                      </span>
                    )}
                  </h2>
                  <p
                    className={`text-base ${
                      isDisabled ? "text-gray-400" : "text-gray-500"
                    }`}>
                    {service.description ||
                      "Tekan untuk mengambil nomor antrian"}
                  </p>

                  {/* Info detail */}
                  <div className="text-sm text-gray-400 mt-2 space-y-1">
                    <p>
                      {service.counters.length > 1
                        ? `${service.counters.length} loket tersedia`
                        : `Loket: ${
                            firstCounter?.counter_code ||
                            `#${firstCounter?.counter_number}`
                          }`}
                    </p>
                    <p>
                      Sisa Kuota: {remainingQuota} / {service.totalQuota}{" "}
                      antrian
                    </p>
                    <p>
                      Jam:{" "}
                      {formatTimeDisplay(
                        firstCounter?.operating_hours_start || "08:00"
                      )}{" "}
                      -{" "}
                      {formatTimeDisplay(
                        firstCounter?.operating_hours_end || "16:00"
                      )}
                    </p>
                    {/* Tampilkan info counters jika multiple */}
                    {service.counters.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Loket:{" "}
                          {service.counters
                            .map((c) => c.counter_code)
                            .join(", ")}
                        </p>
                        {statusInfo?.status === "available" && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            {statusInfo.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Overlay untuk disabled state */}
                {isDisabled && statusMessage && (
                  <div className="absolute inset-0 bg-white bg-opacity-95 rounded-3xl flex items-center justify-center p-4">
                    <div className="text-center">
                      <i
                        className={`pi ${statusMessage.icon} text-${statusMessage.color}-500 text-6xl mb-3`}></i>
                      <h3
                        className={`text-3xl font-bold text-${statusMessage.color}-700 mb-2`}>
                        {service.name}
                        {service.counters.length > 1 &&
                          ` (${service.counters.length} loket)`}
                      </h3>
                      <p
                        className={`font-semibold text-${statusMessage.color}-600 text-lg mb-2`}>
                        {statusMessage.text.includes("Layanan Sudah Penuh")
                          ? "Layanan Sudah Penuh"
                          : "Layanan Sedang Tutup"}
                      </p>
                      <p className={`text-${statusMessage.color}-500 text-sm`}>
                        {statusMessage.description}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Jika tidak ada layanan */}
      {services.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <i className="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
          <p className="text-lg text-gray-500">
            Tidak ada layanan yang tersedia saat ini.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Silakan coba refresh halaman atau hubungi administrator.
          </p>
        </div>
      )}

      {/* Dialog Notifikasi */}
      <Dialog
        header="Nomor Antrian Anda"
        visible={visible}
        style={{ width: "90%", maxWidth: "450px", borderRadius: "16px" }}
        closable={false}
        onHide={() => {
          if (nomorAntrian) {
            setVisible(false);
          }
        }}
        className="rounded-3xl text-center">
        <div className="flex flex-col items-center justify-center py-5">
          {/* Ikon */}
          <div className="w-24 h-24 rounded-full bg-sky-900/60 flex items-center justify-center mb-5 shadow-lg">
            <i className="pi pi-ticket text-5xl text-white"></i>
          </div>

          {/* Nama Layanan */}
          <h2 className="text-xl font-semibold text-sky-900 mb-2">
            {selectedLayanan}
          </h2>

          {/* Tanggal */}
          <p className="text-gray-600 text-base mb-5">{tanggal}</p>

          {/* Nomor Antrian */}
          <div className="bg-sky-900/10 border border-sky-900/20 rounded-xl py-4 px-8 mb-6">
            <h3 className="text-6xl font-extrabold text-sky-900">
              {nomorAntrian ? formatQueueNumber(nomorAntrian) : "..."}
            </h3>
            <p className="text-gray-600 text-base mt-2">Nomor Antrian</p>
            {!nomorAntrian && (
              <div className="mt-3">
                <i className="pi pi-spin pi-spinner text-base text-sky-700 mr-2"></i>
                <span className="text-sm text-sky-700">Memproses...</span>
              </div>
            )}
          </div>

          {/* Informasi Tambahan */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 w-full">
            <p className="text-base text-blue-700">
              <i className="pi pi-info-circle mr-2"></i>
              {nomorAntrian
                ? "Simpan nomor ini dan tunggu panggilan di layar monitor"
                : "Sedang memproses nomor antrian Anda..."}
            </p>
          </div>

          {/* Tombol Tutup */}
          {nomorAntrian && (
            <Button
              label="Tutup"
              icon="pi pi-times"
              className="w-36 bg-sky-900 hover:bg-sky-900/60 text-white font-semibold px-6 py-3 rounded-lg border-none focus:outline-none focus:ring-0 shadow-sm transition-all duration-200 text-base"
              onClick={() => setVisible(false)}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default AmbilAntrean;
