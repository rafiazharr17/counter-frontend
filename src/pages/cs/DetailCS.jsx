import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Calendar } from "primereact/calendar";
import { useGetCounterQuery } from "../../features/counters/counterApi";
import {
  useGetQueuesByCounterQuery,
  useCallQueueMutation,
  useServeQueueMutation,
  useDoneQueueMutation,
  useCancelQueueMutation,
  useCallNextQueueMutation,
} from "../../features/queues/queueApi";
import { useWebSocket } from "../../hooks/useWebSocket";

// Helper functions
function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDurationId(seconds) {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "-";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h} jam${m ? ` ${m} menit` : ""}`;
  if (m > 0) return `${m} menit${ss ? ` ${ss} detik` : ""}`;
  return `${ss} detik`;
}

export default function DetailCS() {
  const navigate = useNavigate();
  const { id } = useParams();

  // API calls
  const {
    data: counterData,
    isLoading: counterLoading,
    error: counterError,
  } = useGetCounterQuery({ id });

  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const ymd = useMemo(() => toYMD(selectedDate), [selectedDate]);

  // Queue API hooks
  const {
    data: queuesData = [],
    isLoading: queuesLoading,
    error: queuesError,
    refetch: refetchQueues,
  } = useGetQueuesByCounterQuery(
    { counterId: id, date: ymd },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  // WebSocket
  useWebSocket((eventData) => {
    console.log("🔔 WebSocket Event di DetailCS:", eventData);
    refetchQueues();
  });

  // Queue mutations
  const [callQueue] = useCallQueueMutation();
  const [serveQueue] = useServeQueueMutation();
  const [doneQueue] = useDoneQueueMutation();
  const [cancelQueue] = useCancelQueueMutation();
  const [callNextQueue] = useCallNextQueueMutation();

  // Loading states
  const [isCalling, setIsCalling] = useState(false);
  const [isServing, setIsServing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);

  // State untuk antrian yang sedang diproses
  const [processingQueueId, setProcessingQueueId] = useState(null);

  // POPUP
  const [visible, setVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voices, setVoices] = useState([]);

  // State untuk waktu realtime
  const [currentTime, setCurrentTime] = useState(new Date());

  // Ref untuk force refresh
  const refreshTimeoutRef = useRef(null);

  const [historySortField, setHistorySortField] = useState("endTime");

  const [historySortOrder, setHistorySortOrder] = useState("desc");

  // State untuk menyimpan antrian yang TERAKHIR dipanggil
  const [lastCalledQueue, setLastCalledQueue] = useState(null);

  // State untuk menyimpan antrian yang SEDANG dipanggil (dari API)
  const [currentlyCalledFromApi, setCurrentlyCalledFromApi] = useState(null);

  const showPopup = (msg) => {
    setPopupMessage(msg);
    setVisible(true);
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (counterData) {
      setData(counterData);
      window.scrollTo(0, 0);
    }
  }, [counterData]);

  // Timer untuk update waktu realtime
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      if (availableVoices.length === 0) {
        setTimeout(() => {
          const voicesAfterDelay = window.speechSynthesis.getVoices();
          setVoices(voicesAfterDelay);
        }, 1000);
      }
    };

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    } else {
      console.warn("Speech synthesis not supported");
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Helper function untuk mengurutkan antrian berdasarkan nomor
  const sortQueues = (queues) => {
    return [...queues].sort((a, b) => {
      const getQueueNumber = (queueNum) => {
        if (!queueNum) return 0;
        const parts = queueNum.split("-");
        return parseInt(parts[parts.length - 1]) || 0;
      };

      const numA = getQueueNumber(a.queue_number);
      const numB = getQueueNumber(b.queue_number);

      return numA - numB;
    });
  };

  // Filter queues untuk counter ini
  const filteredQueues = useMemo(() => {
    if (!queuesData) return [];

    let queuesArray = [];

    if (Array.isArray(queuesData)) {
      queuesArray = queuesData;
    } else if (queuesData.data && Array.isArray(queuesData.data)) {
      queuesArray = queuesData.data;
    } else if (queuesData.data) {
      queuesArray = [queuesData.data];
    }

    const filtered = queuesArray.filter((queue) => {
      const queueCounterId = queue.counter_id || queue.counter?.id;
      return queueCounterId == id;
    });

    return sortQueues(filtered);
  }, [queuesData, id]);

  // Effect untuk mencari antrian yang SEDANG dipanggil (status: called) dan update lastCalledQueue
  useEffect(() => {
    if (!filteredQueues || filteredQueues.length === 0) {
      setCurrentlyCalledFromApi(null);
      return;
    }

    // Cari semua antrian dengan status 'called' yang memiliki called_at
    const calledQueues = filteredQueues.filter(
      (queue) => queue.status === "called" && queue.called_at
    );

    if (calledQueues.length > 0) {
      // Urutkan berdasarkan waktu dipanggil (terbaru ke terlama)
      const sortedCalledQueues = [...calledQueues].sort((a, b) => {
        const timeA = new Date(a.called_at);
        const timeB = new Date(b.called_at);
        return timeB - timeA; // Terbaru di atas
      });

      // Ambil yang terbaru untuk ditampilkan
      const newestCalledQueue = sortedCalledQueues[0];
      setCurrentlyCalledFromApi(newestCalledQueue);

      // Update lastCalledQueue dengan yang terbaru
      if (!lastCalledQueue || lastCalledQueue.id !== newestCalledQueue.id) {
        setLastCalledQueue(newestCalledQueue);
      }
    } else {
      // Jika tidak ada yang status called, reset currentlyCalledFromApi
      setCurrentlyCalledFromApi(null);

      // Tapi pertahankan lastCalledQueue jika masih ada dalam filteredQueues
      if (lastCalledQueue) {
        const lastQueueStillExists = filteredQueues.some(
          (q) => q.id === lastCalledQueue.id
        );

        if (!lastQueueStillExists) {
          setLastCalledQueue(null);
        }
      }
    }
  }, [filteredQueues, lastCalledQueue]);

  // Helper function untuk mendapatkan antrian yang SEDANG dipanggil (untuk tampilan)
  const getCurrentlyCalledQueue = () => {
    // Prioritaskan currentlyCalledFromApi (dari API terbaru)
    if (currentlyCalledFromApi) {
      return currentlyCalledFromApi;
    }

    // Fallback ke lastCalledQueue
    return lastCalledQueue;
  };

  // PERUBAHAN: Get queue untuk tombol LAYANI (logika yang diperbaiki)
  const getQueueForServe = () => {
    // 1. Cari antrian dengan status 'called' yang TERBARU berdasarkan waktu dipanggil
    const calledQueues = filteredQueues.filter(
      (queue) => queue.status === "called" && queue.called_at
    );

    if (calledQueues.length > 0) {
      // Urutkan berdasarkan waktu dipanggil (terbaru ke terlama)
      const sortedCalledQueues = [...calledQueues].sort((a, b) => {
        const timeA = new Date(a.called_at);
        const timeB = new Date(b.called_at);
        return timeB - timeA; // Terbaru di atas
      });
      return sortedCalledQueues[0]; // Ambil yang terbaru
    }

    // 2. Jika tidak ada yang 'called', ambil antrian yang terakhir dipanggil (lastCalledQueue)
    if (lastCalledQueue) {
      // Pastikan lastCalledQueue masih dalam filteredQueues dan statusnya bukan 'served' atau 'done'
      const lastQueueInList = filteredQueues.find(
        (q) => q.id === lastCalledQueue.id
      );
      if (
        lastQueueInList &&
        lastQueueInList.status !== "served" &&
        lastQueueInList.status !== "done" &&
        lastQueueInList.status !== "canceled"
      ) {
        return lastQueueInList;
      }
    }

    // 3. Fallback: ambil antrian pertama yang waiting (untuk kasus edge)
    const firstWaiting = filteredQueues.find(
      (queue) => queue.status === "waiting"
    );
    return firstWaiting;
  };

  // PERUBAHAN: Get queue untuk tombol SELESAI
  const getQueueForComplete = () => {
    // Hanya bisa selesaikan antrian yang sedang dilayani (status: served)
    return filteredQueues.find((queue) => queue.status === "served");
  };

  // PERUBAHAN: Get queue untuk tombol BATAL
  const getQueueForCancel = () => {
    // 1. Prioritaskan antrian yang sedang dilayani
    const servingQueue = filteredQueues.find(
      (queue) => queue.status === "served"
    );
    if (servingQueue) {
      return servingQueue;
    }

    // 2. Cari antrian dengan status 'called'
    const calledQueue = filteredQueues.find(
      (queue) => queue.status === "called"
    );
    if (calledQueue) {
      return calledQueue;
    }

    return null;
  };

  // Process queues data untuk tabel riwayat
  const processedQueues = useMemo(() => {
    if (!filteredQueues || !Array.isArray(filteredQueues)) return [];

    return filteredQueues
      .filter((queue) => {
        if (!queue.queue_number) return false;

        try {
          const parts = queue.queue_number.split("-");
          if (parts.length < 3) return false;

          const dateNum = parts[2];
          if (!dateNum || dateNum.length !== 8) return false;

          const extractedYmd =
            dateNum.slice(0, 4) +
            "-" +
            dateNum.slice(4, 6) +
            "-" +
            dateNum.slice(6, 8);

          return extractedYmd === ymd;
        } catch (error) {
          console.error(
            "Error parsing queue number:",
            queue.queue_number,
            error
          );
          return false;
        }
      })
      .map((queue) => {
        return {
          id: queue.id,
          queue_number: queue.queue_number,
          created_at: queue.created_at || null,
          called_at: queue.called_at || null,
          served_at: queue.served_at || null,
          done_at: queue.done_at || null,
          canceled_at: queue.canceled_at || null,
          status: queue.status || null,
          updated_at: queue.updated_at || null,
        };
      })
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at) : new Date(0);
        const timeB = b.created_at ? new Date(b.created_at) : new Date(0);
        return timeA - timeB;
      });
  }, [filteredQueues, ymd]);

  // Status queues untuk bagian operasional
  const waitingQueues = useMemo(() => {
    const waiting = filteredQueues.filter(
      (queue) => queue.status === "waiting" || queue.status === "called"
    );
    return sortQueues(waiting);
  }, [filteredQueues]);

  const currentServingQueue = useMemo(() => {
    return filteredQueues.find((queue) => queue.status === "served");
  }, [filteredQueues]);

  // PERUBAHAN: Get called queue (untuk logika tombol)
  const calledQueue = useMemo(() => {
    return filteredQueues.find((queue) => queue.status === "called");
  }, [filteredQueues]);

  // ==================== STATISTIK HARIAN ====================

  const displayStats = useMemo(() => {
    const total = processedQueues.length;
    const done = processedQueues.filter((q) => q.status === "done").length;
    const canceled = processedQueues.filter(
      (q) => q.status === "canceled"
    ).length;

    let totalDuration = 0;
    let durationCount = 0;

    processedQueues.forEach((queue) => {
      if (queue.status === "done" && queue.called_at && queue.done_at) {
        const calledTime = new Date(queue.called_at);
        const doneTime = new Date(queue.done_at);
        const duration = (doneTime - calledTime) / (1000 * 60);
        totalDuration += duration;
        durationCount++;
      }
    });

    const avgDuration =
      durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return {
      total,
      done,
      canceled,
      avgDuration,
      durationCount,
    };
  }, [processedQueues]);

  // ==================== LOGIKA TOMBOL YANG DIPERBAIKI ====================

  // PERUBAHAN: Kembali ke logika tombol seperti sebelumnya
  const getButtonStates = () => {
    const hasWaitingQueue = waitingQueues.length > 0;
    const hasCalledQueue = !!calledQueue;
    const hasServingQueue = !!currentServingQueue;

    // 1. Skenario: ADA ANTRIAN BARU (menunggu)
    if (hasWaitingQueue && !hasCalledQueue && !hasServingQueue) {
      return {
        call: true, // Tombol Panggil/Panggil Ulang AKTIF
        serve: false, // Layani tidak aktif
        complete: false, // Selesai tidak aktif
        cancel: false, // Batal tidak aktif
        callNext: false, // Selanjutnya tidak aktif
      };
    }

    // 2. Skenario: ANTRIAN SUDAH DIPANGGIL (status: called)
    if (hasCalledQueue && !hasServingQueue) {
      return {
        call: true, // Tombol Panggil Ulang AKTIF
        serve: true, // Layani AKTIF
        complete: false, // Selesai tidak aktif
        cancel: true, // Batal AKTIF
        callNext: true, // Selanjutnya AKTIF
      };
    }

    // 3. Skenario: SEDANG DILAYANI (status: served)
    if (hasServingQueue) {
      return {
        call: false, // Panggil Ulang tidak aktif
        serve: false, // Layani tidak aktif
        complete: true, // Selesai AKTIF
        cancel: true, // Batal AKTIF
        callNext: false, // Selanjutnya tidak aktif
      };
    }

    // 4. Skenario: SETELAH SELESAI/BATAL (tidak ada yang called/served)
    if (!hasCalledQueue && !hasServingQueue && hasWaitingQueue) {
      return {
        call: false, // Panggil tidak aktif
        serve: false, // Layani tidak aktif
        complete: false, // Selesai tidak aktif
        cancel: false, // Batal tidak aktif
        callNext: true, // Selanjutnya AKTIF
      };
    }

    // 5. Default: tidak ada antrian
    return {
      call: false,
      serve: false,
      complete: false,
      cancel: false,
      callNext: false,
    };
  };

  const buttonStates = getButtonStates();

  // ==================== FUNGSI WAKTU ====================

  const calculateServiceDuration = (queue) => {
    if (!queue.served_at) return "00:00:00";

    const startTime = new Date(queue.served_at);
    const now = new Date();
    const diffMs = now - startTime;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateRealtimeWaiting = (queue) => {
    if (!queue.created_at) return "00:00:00";

    const startTime = new Date(queue.created_at);
    const now = new Date();
    const diffMs = now - startTime;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateTotalDuration = (queue) => {
    if (!queue.created_at) return "00:00:00";

    let endTime;
    if (queue.status === "done" && queue.done_at) {
      endTime = new Date(queue.done_at);
    } else if (queue.status === "canceled" && queue.canceled_at) {
      endTime = new Date(queue.canceled_at);
    } else {
      return "00:00:00";
    }

    const startTime = new Date(queue.created_at);
    const diffMs = endTime - startTime;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const completedOrCanceledQueues = useMemo(() => {
    return filteredQueues
      .filter((queue) => queue.status === "done" || queue.status === "canceled")
      .sort((a, b) => {
        if (historySortField === "queueNumber") {
          // Sorting berdasarkan nomor antrian
          const getQueueNumber = (queueNum) => {
            if (!queueNum) return 0;
            const parts = queueNum.split("-");
            return parseInt(parts[parts.length - 1]) || 0;
          };

          const numA = getQueueNumber(a.queue_number);
          const numB = getQueueNumber(b.queue_number);

          if (historySortOrder === "asc") {
            return numA - numB; // Nomor kecil ke besar
          } else {
            return numB - numA; // Nomor besar ke kecil
          }
        } else {
          // Sorting berdasarkan waktu selesai/batal
          const getEndTime = (queue) => {
            if (queue.status === "done" && queue.done_at)
              return new Date(queue.done_at);
            if (queue.status === "canceled" && queue.canceled_at)
              return new Date(queue.canceled_at);
            return new Date(0); // Jika tidak ada waktu, gunakan tanggal default
          };

          const timeA = getEndTime(a);
          const timeB = getEndTime(b);

          if (historySortOrder === "asc") {
            return timeA - timeB; // Lama ke baru
          } else {
            return timeB - timeA; // Baru ke lama
          }
        }
      });
  }, [filteredQueues, historySortField, historySortOrder]);

  const formatEndTime = (queue) => {
    if (queue.status === "done" && queue.done_at) {
      return new Date(queue.done_at).toLocaleTimeString("id-ID");
    } else if (queue.status === "canceled" && queue.canceled_at) {
      return new Date(queue.canceled_at).toLocaleTimeString("id-ID");
    }
    return "-";
  };

  // ==================== FUNGSI UNTUK KLIK ANTRIAN ====================

  const handleCallQueue = async (queue) => {
    if (!queue) return;

    try {
      setProcessingQueueId(queue.id);
      setIsCalling(true);

      await callQueue(queue.id).unwrap();
      // Update lastCalledQueue langsung
      setLastCalledQueue(queue);
      // Juga update currentlyCalledFromApi
      setCurrentlyCalledFromApi(queue);

      await playCallAudio(queue.queue_number, data.name, data.counter_code);

      refreshTimeoutRef.current = setTimeout(() => {
        refetchQueues();
      }, 500);

      showPopup(`Memanggil antrian ${formatQueueNumber(queue.queue_number)}`);
    } catch (error) {
      console.error("Error memanggil antrian:", error);
      showPopup(
        `Gagal memanggil antrian: ${
          error.data?.message || error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setProcessingQueueId(null);
      setIsCalling(false);
    }
  };

  const findFemaleIndonesianVoice = () => {
    if (!voices || voices.length === 0) return null;

    const indoFemale = voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("id") &&
        !voice.name.toLowerCase().includes("male") &&
        !voice.name.toLowerCase().includes("pria") &&
        !voice.name.toLowerCase().includes("laki")
    );

    if (indoFemale) return indoFemale;

    const anyFemale = voices.find(
      (voice) =>
        !voice.name.toLowerCase().includes("male") &&
        !voice.name.toLowerCase().includes("pria") &&
        !voice.name.toLowerCase().includes("laki")
    );

    if (anyFemale) return anyFemale;

    return voices[0];
  };

  const getCounterNumber = (counterCode) => {
    if (!counterCode) return "0";
    const parts = counterCode.split("-");
    return parts.length > 1 ? parts[1] : "0";
  };

  const playCallAudio = async (queueNumber, counterName, counterCode) => {
    try {
      setIsPlayingAudio(true);

      const formatNumberForSpeech = (num) => {
        if (!num || typeof num !== "string") return "nomor tidak diketahui";
        const cleanNum = num.replace(/\s+/g, "");
        let finalNumber = cleanNum;

        if (cleanNum.length > 9) {
          const firstPart = cleanNum.substring(0, 6);
          const lastPart = cleanNum.substring(cleanNum.length - 3);
          finalNumber = firstPart + lastPart;
        }

        return finalNumber.split("").join(" ");
      };

      const formatCounterName = (name) => {
        if (!name) return "loket";
        return name.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ");
      };

      const formattedNumber = formatNumberForSpeech(queueNumber);
      const formattedCounter = formatCounterName(counterName);
      const counterNumber = getCounterNumber(counterCode);

      const textToSpeak = `Nomor antrian ${formattedNumber}, untuk layanan ${formattedCounter}, silakan menuju loket ${counterNumber}`;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "id-ID";
        utterance.rate = 0.7;
        utterance.pitch = 9;
        utterance.volume = 1;

        const selectedVoice = findFemaleIndonesianVoice();
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
          setIsPlayingAudio(false);
        };

        utterance.onerror = (event) => {
          console.error("Error dalam speech synthesis:", event);
          setIsPlayingAudio(false);
          const formattedNumber = formatNumberForSpeech(queueNumber);
          const counterNumber = getCounterNumber(counterCode);
          showPopup(
            `Nomor antrian ${formattedNumber}, untuk layanan ${counterName}, silakan menuju loket ${counterNumber}`
          );
        };

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 200);
      } else {
        throw new Error("Browser tidak mendukung text-to-speech");
      }
    } catch (error) {
      console.error("Error memutar audio:", error);
      setIsPlayingAudio(false);
      const formatNumberForSpeech = (num) => num?.split("").join(" ") || num;
      const formattedNumber = formatNumberForSpeech(queueNumber);
      const counterNumber = getCounterNumber(counterCode);
      showPopup(
        `Nomor antrian ${formattedNumber}, untuk layanan ${counterName}, silakan menuju loket ${counterNumber}`
      );
    }
  };

  // ==================== FUNGSI UTAMA YANG DIPERBAIKI ====================

  const handleCallAction = async () => {
    let queueToCall;

    // Logika sederhana: jika ada antrian yang sudah dipanggil (called), panggil ulang
    // jika tidak, panggil antrian berikutnya
    if (calledQueue) {
      queueToCall = calledQueue;
    } else if (currentServingQueue) {
      queueToCall = currentServingQueue;
    } else if (waitingQueues.length > 0) {
      queueToCall = waitingQueues[0];
    }

    if (!queueToCall) {
      showPopup("Tidak ada antrian yang dapat dipanggil");
      return;
    }

    try {
      setIsCalling(true);

      await callQueue(queueToCall.id).unwrap();

      // Pastikan lastCalledQueue dan currentlyCalledFromApi diupdate
      setLastCalledQueue(queueToCall);
      setCurrentlyCalledFromApi(queueToCall);

      await playCallAudio(
        queueToCall.queue_number,
        data.name,
        data.counter_code
      );

      refreshTimeoutRef.current = setTimeout(() => {
        refetchQueues();
      }, 500);

      showPopup(
        `Memanggil antrian ${formatQueueNumber(queueToCall.queue_number)}`
      );
    } catch (error) {
      console.error("Error memanggil antrian:", error);
      showPopup(
        `Gagal memanggil antrian: ${
          error.data?.message || error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsCalling(false);
    }
  };

  // PERUBAHAN: Fungsi Layani - logika yang diperbaiki
  const handleServeQueue = async () => {
    const queueToServe = getQueueForServe();

    if (!queueToServe) {
      showPopup("Tidak ada antrian yang dapat dilayani");
      return;
    }

    // Validasi tambahan: jika ada antrian yang sedang dilayani, jangan izinkan
    if (currentServingQueue) {
      showPopup(
        `Sudah ada antrian yang sedang dilayani: #${formatQueueNumber(
          currentServingQueue.queue_number
        )}`
      );
      return;
    }

    try {
      setIsServing(true);

      // Jika antrian masih waiting, panggil dulu
      if (queueToServe.status === "waiting") {
        await callQueue(queueToServe.id).unwrap();
        // Update states
        setLastCalledQueue(queueToServe);
        setCurrentlyCalledFromApi(queueToServe);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Refetch untuk memastikan data terbaru
        await refetchQueues();

        // Cari ulang queue setelah dipanggil
        const updatedQueue = filteredQueues.find(
          (q) => q.id === queueToServe.id
        );
        if (updatedQueue && updatedQueue.status === "called") {
          queueToServe.status = "called";
        }
      }

      // Pastikan status sudah 'called' sebelum dilayani
      if (queueToServe.status === "called") {
        // Layani antrian
        await serveQueue(queueToServe.id).unwrap();
        await refetchQueues();

        showPopup(
          `Memulai layanan untuk antrian ${formatQueueNumber(
            queueToServe.queue_number
          )}`
        );
      } else {
        showPopup(
          `Antrian ${formatQueueNumber(
            queueToServe.queue_number
          )} belum dipanggil`
        );
      }
    } catch (error) {
      console.error("Error memulai layanan:", error);
      showPopup(
        `Gagal memulai layanan: ${
          error.data?.message || error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsServing(false);
    }
  };

  // PERUBAHAN: Fungsi Selesai - akan menyelesaikan antrian yang sedang dilayani
  const handleDoneQueue = async () => {
    const queueToComplete = getQueueForComplete();

    if (!queueToComplete) {
      showPopup("Tidak ada antrian yang sedang dilayani");
      return;
    }

    try {
      setIsCompleting(true);
      const queueNumber = formatQueueNumber(queueToComplete.queue_number);

      await doneQueue(queueToComplete.id).unwrap();
      await refetchQueues();

      refreshTimeoutRef.current = setTimeout(async () => {
        await refetchQueues();
      }, 200);

      showPopup(`Menyelesaikan layanan untuk antrian ${queueNumber}`);
    } catch (error) {
      console.error("Error menyelesaikan layanan:", error);
      showPopup(
        `Gagal menyelesaikan layanan: ${
          error.data?.message || error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // PERUBAHAN: Fungsi Batal - akan membatalkan antrian yang sesuai
  const handleCancelQueue = async () => {
    const queueToCancel = getQueueForCancel();

    if (!queueToCancel) {
      showPopup("Tidak ada antrian yang dapat dibatalkan");
      return;
    }

    try {
      setIsCancelling(true);
      await cancelQueue(queueToCancel.id).unwrap();

      refreshTimeoutRef.current = setTimeout(() => {
        refetchQueues();
      }, 500);

      showPopup(
        `Membatalkan antrian ${formatQueueNumber(queueToCancel.queue_number)}`
      );
    } catch (error) {
      console.error("Error membatalkan antrian:", error);
      showPopup(
        `Gagal membatalkan antrian: ${
          error.data?.message || error.message || "Terjadi kesalahan"
        }`
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // PERUBAHAN: Fungsi Call Next Queue - SEDERHANA: Selalu panggil antrian berikutnya dari waitingQueues
  const handleCallNextQueue = async () => {
    try {
      setIsCallingNext(true);

      // Cari antrian berikutnya berdasarkan urutan di waitingQueues
      // waitingQueues sudah diurutkan berdasarkan nomor antrian (terkecil ke terbesar)

      if (waitingQueues.length === 0) {
        showPopup("Tidak ada antrian menunggu");
        return;
      }

      let nextQueueToCall = null;

      // LOGIKA: Cari antrian berikutnya
      // 1. Jika ada lastCalledQueue, cari antrian setelahnya di waitingQueues
      if (lastCalledQueue) {
        // Cari index lastCalledQueue di waitingQueues
        const lastCalledIndex = waitingQueues.findIndex(
          (queue) => queue.id === lastCalledQueue.id
        );

        if (
          lastCalledIndex !== -1 &&
          lastCalledIndex + 1 < waitingQueues.length
        ) {
          // Ambil antrian setelah lastCalledQueue
          nextQueueToCall = waitingQueues[lastCalledIndex + 1];
        } else {
          // Jika lastCalledQueue tidak ditemukan atau sudah yang terakhir,
          // ambil antrian pertama di waitingQueues
          nextQueueToCall = waitingQueues[0];
        }
      } else {
        // Jika tidak ada lastCalledQueue, ambil antrian pertama
        nextQueueToCall = waitingQueues[0];
      }

      if (!nextQueueToCall) {
        showPopup("Tidak ada antrian berikutnya yang dapat dipanggil");
        return;
      }

      // Panggil antrian tersebut
      await callQueue(nextQueueToCall.id).unwrap();

      // Update states
      setLastCalledQueue(nextQueueToCall);
      setCurrentlyCalledFromApi(nextQueueToCall);

      await playCallAudio(
        nextQueueToCall.queue_number,
        data.name,
        data.counter_code
      );

      await refetchQueues();

      showPopup(
        `Memanggil antrian berikutnya: ${formatQueueNumber(
          nextQueueToCall.queue_number
        )}`
      );
    } catch (error) {
      console.error("Error memanggil antrian berikutnya:", error);

      // Fallback: coba panggil antrian waiting pertama
      const firstWaiting = waitingQueues.find(
        (queue) => queue.status === "waiting"
      );

      if (firstWaiting) {
        try {
          await callQueue(firstWaiting.id).unwrap();

          setLastCalledQueue(firstWaiting);
          setCurrentlyCalledFromApi(firstWaiting);

          await playCallAudio(
            firstWaiting.queue_number,
            data.name,
            data.counter_code
          );

          await refetchQueues();

          showPopup(
            `Memanggil antrian ${formatQueueNumber(firstWaiting.queue_number)}`
          );
        } catch (callError) {
          console.error("Error fallback memanggil antrian:", callError);
          showPopup(
            `Gagal memanggil antrian berikutnya: ${
              error.data?.message || error.message || "Terjadi kesalahan"
            }`
          );
        }
      } else {
        showPopup(
          `Gagal memanggil antrian berikutnya: ${
            error.data?.message || error.message || "Terjadi kesalahan"
          }`
        );
      }
    } finally {
      setIsCallingNext(false);
    }
  };

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Helper function untuk format queue number
  const formatQueueNumber = (queueNumber) => {
    if (!queueNumber) return "-";
    const parts = queueNumber.split("-");
    if (parts.length < 4) return queueNumber;
    return `${parts[0]}-${parts[1]}-${parts[3]}`;
  };

  const isLoading = counterLoading || queuesLoading;
  const isAnyActionLoading =
    isCalling ||
    isServing ||
    isCompleting ||
    isCancelling ||
    isCallingNext ||
    isPlayingAudio;

  if (counterError) {
    return (
      <div className="p-6 text-center text-red-600">
        Error:{" "}
        {counterError?.data?.message ||
          counterError.message ||
          "Gagal memuat data counter"}
        <Button
          label="Kembali"
          className="mt-4"
          onClick={() => navigate("/cs")}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-slate-600">
        <i className="pi pi-spin pi-spinner text-2xl"></i>
        <p className="mt-2">Loading detail counter...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-600">
        Data counter tidak ditemukan
        <Button
          label="Kembali"
          className="mt-4"
          onClick={() => navigate("/cs")}
        />
      </div>
    );
  }

  // Dapatkan antrian yang sedang dipanggil untuk tampilan
  const currentlyCalledForDisplay = getCurrentlyCalledQueue();

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-100 min-h-screen">
      {/* ================= POPUP ================= */}
      <Dialog
        visible={visible}
        onHide={() => setVisible(false)}
        className="w-80 md:w-96"
        modal
        closable={false}>
        <div className="text-center py-4">
          <span
            className="pi pi-check-circle"
            style={{ fontSize: "70px", color: "rgb(34 197 94)" }}></span>
          <h2 className="text-xl font-bold text-slate-800 mt-3">Info</h2>
          <p className="text-slate-500 mt-1">{popupMessage}</p>
          <div className="flex justify-center">
            <Button
              label="OK"
              className="mt-5 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm"
              onClick={() => setVisible(false)}
            />
          </div>
        </div>
      </Dialog>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              icon="pi pi-arrow-left"
              className="bg-slate-200 text-slate-700 border-slate-300 rounded-xl px-3 py-2"
              onClick={() => navigate("/cs")}
            />
            <div>
              <h2 className="text-2xl font-bold text-[#004A9F]">
                Detail Counter — {data.name}
              </h2>
              <p className="text-slate-500 mt-1">
                Informasi lengkap mengenai counter pelayanan
              </p>
            </div>
          </div>

          {/* Status Info */}
          <div className="flex items-center gap-4">
            {queuesError && (
              <div className="p-2 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-700 text-xs">
                  Error: {queuesError?.data?.message || queuesError.message}
                </p>
              </div>
            )}

            {currentServingQueue && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-700 text-sm font-semibold">
                  Sedang Melayani: #
                  {formatQueueNumber(currentServingQueue.queue_number)}
                </p>
              </div>
            )}

            {/* Tampilkan antrian TERAKHIR dipanggil */}
            {lastCalledQueue && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-yellow-700 text-sm font-semibold">
                  Terakhir Dipanggil: #
                  {formatQueueNumber(lastCalledQueue.queue_number)}
                </p>
              </div>
            )}

            <Button
              label="Edit Loket"
              icon="pi pi-pencil"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white !py-3 !px-4 sm:!px-6 !rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 font-semibold w-full sm:w-auto justify-center"
              onClick={() => navigate(`/cs/counters/${id}/edit`)}
            />
          </div>
        </div>
      </div>

      {/* ================= GRID 2 KOLOM ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION ANTRIAN SEDANG DIPANGGIL - MENGGUNAKAN currentlyCalledForDisplay */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <i className="pi pi-forward text-blue-500"></i>
            Antrian Sedang Dipanggil
          </h3>

          {/* Tampilkan currentlyCalledForDisplay */}
          {currentlyCalledForDisplay ? (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                #{formatQueueNumber(currentlyCalledForDisplay.queue_number)}
              </div>
              <p className="text-blue-700 text-sm">
                {currentlyCalledForDisplay.status === "called"
                  ? "Sedang dipanggil"
                  : "Terakhir dipanggil"}
              </p>
              <p className="text-blue-500 text-xs mt-1">
                {currentlyCalledForDisplay.status === "called"
                  ? "Waktu Dipanggil: "
                  : "Terakhir dipanggil: "}
                {currentlyCalledForDisplay.called_at
                  ? new Date(
                      currentlyCalledForDisplay.called_at
                    ).toLocaleTimeString("id-ID")
                  : "Baru saja"}
              </p>
            </div>
          ) : (
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <i className="pi pi-inbox text-slate-400 text-2xl mb-2"></i>
              <p className="text-slate-500 text-sm">
                Belum ada antrian dipanggil
              </p>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm text-slate-600 mb-2">
              Total Menunggu:{" "}
              <span className="font-semibold">{waitingQueues.length}</span>
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {waitingQueues.slice(0, 5).map((queue) => (
                <div
                  key={queue.id}
                  className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    processingQueueId === queue.id
                      ? "bg-blue-100 border-blue-300 animate-pulse"
                      : "bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                  }`}
                  onClick={() => handleCallQueue(queue)}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      #{formatQueueNumber(queue.queue_number)}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        queue.status === "called"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                      {queue.status === "called" ? "Dipanggil" : "Menunggu"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-blue-600 font-semibold">
                      {calculateRealtimeWaiting(queue)}
                    </div>
                  </div>
                </div>
              ))}
              {waitingQueues.length > 5 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  +{waitingQueues.length - 5} antrian lainnya
                </p>
              )}
              {waitingQueues.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  Tidak ada antrian
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================= CARD TELAH DILAYANI ================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <i className="pi pi-users text-green-500"></i>
            Dilayani
          </h3>

          {/* Antrian yang sedang Dilayani */}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
            <h4 className="text-md font-semibold text-green-800 mb-2">
              Sedang Dilayani
            </h4>
            {currentServingQueue ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  #{formatQueueNumber(currentServingQueue.queue_number)}
                </div>
                <div className="text-green-700 text-sm font-mono font-semibold">
                  {calculateServiceDuration(currentServingQueue)}
                </div>
                <div className="text-green-600 text-xs">
                  Mulai:{" "}
                  {currentServingQueue.served_at
                    ? new Date(
                        currentServingQueue.served_at
                      ).toLocaleTimeString("id-ID")
                    : "-"}
                </div>
              </div>
            ) : (
              <div className="text-green-500">
                <i className="pi pi-clock text-2xl mb-2"></i>
                <p className="text-sm">
                  Tidak ada antrian yang sedang dilayani
                </p>
              </div>
            )}
          </div>

          {/* Riwayat Terbaru - Antrian Selesai/Batal */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-md font-semibold text-slate-800">
                  Riwayat Terbaru ({completedOrCanceledQueues.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:block">
                  Urutkan:
                </span>
                <div className="flex gap-2">
                  {/* Dropdown untuk memilih field sorting */}
                  <select
                    value={historySortField}
                    onChange={(e) => {
                      setHistorySortField(e.target.value);
                      // Reset order ke desc ketika mengganti field
                      setHistorySortOrder("desc");
                    }}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]">
                    <option value="endTime">Waktu Selesai/Batal</option>
                    <option value="queueNumber">Nomor Antrian</option>
                  </select>

                  {/* Dropdown untuk memilih order sorting */}
                  <select
                    value={historySortOrder}
                    onChange={(e) => setHistorySortOrder(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]">
                    {historySortField === "endTime" ? (
                      <>
                        <option value="desc">Terbaru → Terlama</option>
                        <option value="asc">Terlama → Terbaru</option>
                      </>
                    ) : (
                      <>
                        <option value="desc">Akhir → Awal</option>
                        <option value="asc">Awal → Akhir</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {completedOrCanceledQueues.length > 0 ? (
                completedOrCanceledQueues.slice(0, 10).map((queue) => (
                  <div
                    key={queue.id}
                    className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-200 ${
                      queue.status === "done"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        #{formatQueueNumber(queue.queue_number)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          queue.status === "done"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                        {queue.status === "done" ? "Selesai" : "Batal"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs font-mono font-semibold ${
                          queue.status === "done"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}>
                        {calculateTotalDuration(queue)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatEndTime(queue)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <i className="pi pi-history text-slate-400 text-xl mb-2"></i>
                  <p className="text-slate-500 text-sm">
                    Belum ada riwayat penyelesaian atau pembatalan
                  </p>
                </div>
              )}
              {completedOrCanceledQueues.length > 10 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  +{completedOrCanceledQueues.length - 10} riwayat lainnya
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aksi Counter - LOGIKA TOMBOL YANG DIPERBAIKI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Aksi Counter
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* PERUBAHAN: Tombol Panggil/Panggil Ulang - sesuai dengan logika state */}
          <Button
            label={
              isCalling
                ? "Memanggil..."
                : buttonStates.call
                ? calledQueue || currentServingQueue
                  ? "Panggil Ulang"
                  : "Panggil"
                : "Panggil"
            }
            className={`h-16 w-full rounded-xl font-bold text-lg transition-all duration-300 ${
              buttonStates.call
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-200 border-0"
                : "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 opacity-50 cursor-not-allowed border-0"
            }`}
            onClick={handleCallAction}
            disabled={!buttonStates.call || isAnyActionLoading}
          />

          {/* PERUBAHAN: Tombol Layani - sesuai dengan logika state */}
          <Button
            label={isServing ? "Melayani..." : "Layani"}
            className={`h-16 w-full rounded-xl font-bold text-lg transition-all duration-300 ${
              buttonStates.serve
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-200 border-0"
                : "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 opacity-50 cursor-not-allowed border-0"
            }`}
            onClick={handleServeQueue}
            disabled={!buttonStates.serve || isAnyActionLoading}
          />

          {/* PERUBAHAN: Tombol Selesai - sesuai dengan logika state */}
          <Button
            label={isCompleting ? "Menyelesaikan..." : "Selesai"}
            className={`h-16 w-full rounded-xl font-bold text-lg transition-all duration-300 ${
              buttonStates.complete
                ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-200 border-0"
                : "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 opacity-50 cursor-not-allowed border-0"
            }`}
            onClick={handleDoneQueue}
            disabled={!buttonStates.complete || isAnyActionLoading}
          />

          {/* PERUBAHAN: Tombol Batal - sesuai dengan logika state */}
          <Button
            label={isCancelling ? "Membatalkan..." : "Batal"}
            className={`h-16 w-full rounded-xl font-bold text-lg transition-all duration-300 ${
              buttonStates.cancel
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-200 border-0"
                : "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 opacity-50 cursor-not-allowed border-0"
            }`}
            onClick={handleCancelQueue}
            disabled={!buttonStates.cancel || isAnyActionLoading}
          />

          {/* PERUBAHAN: Tombol Selanjutnya - sesuai dengan logika state */}
          <Button
            label={isCallingNext ? "Memanggil..." : "Selanjutnya"}
            className={`h-16 w-full rounded-xl font-bold text-lg transition-all duration-300 ${
              buttonStates.callNext
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-200 border-0"
                : "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-600 opacity-50 cursor-not-allowed border-0"
            }`}
            onClick={handleCallNextQueue}
            disabled={!buttonStates.callNext || isAnyActionLoading}
          />
        </div>
      </div>

      {/* ================= STATISTIK HARIAN DENGAN INFORMASI LAYANAN ================= */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-lg shadow-slate-200/20 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent drop-shadow-sm">
            Statistik Harian — {data?.name}
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <i className="pi pi-calendar text-slate-400 flex-shrink-0" />
            <Calendar
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              showButtonBar
              className="custom-calendar !border-2 !border-slate-200 !rounded-xl !bg-white/80 backdrop-blur-sm w-full sm:w-48"
              inputClassName="!py-3 !rounded-xl px-4 !font-medium !text-slate-700 !placeholder-slate-400 !bg-white/80 backdrop-blur-sm !border-0"
              panelClassName="!border !border-slate-200 !rounded-xl !shadow-lg"
            />
          </div>
        </div>

        {/* Grid: Informasi Layanan di Kiri, Statistik di Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1: Informasi Layanan */}
          <div className="lg:col-span-2 bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <i className="pi pi-info-circle text-blue-500"></i>
              Informasi Layanan
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Nama Layanan:</span>
                <span className="font-semibold text-slate-700 text-right">
                  {data.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Kode Counter:</span>
                <span className="font-mono bg-slate-100 px-3 py-1 rounded-lg text-slate-700">
                  {data.counter_code}
                </span>
              </div>
              <div className="flex justify-between items-start py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Deskripsi:</span>
                <span className="text-slate-700 text-right max-w-xs">
                  {data.description}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Kuota per Hari:</span>
                <span className="font-semibold text-slate-700">
                  {data.quota} / hari
                </span>
              </div>
            </div>
          </div>

          {/* Kolom 2-4: Statistik */}
          <div className="lg:col-span-1">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
                <div className="text-2xl sm:text-4xl font-bold">
                  {displayStats.total}
                </div>
                <div className="text-blue-100 text-xs sm:text-sm font-medium mt-1">
                  Total Antrian
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
                <div className="text-2xl sm:text-4xl font-bold">
                  {displayStats.done}
                </div>
                <div className="text-green-100 text-xs sm:text-sm font-medium mt-1">
                  Selesai
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg text-center">
                <div className="text-2xl sm:text-4xl font-bold">
                  {displayStats.canceled}
                </div>
                <div className="text-red-100 text-xs sm:text-sm font-medium mt-1">
                  Batal
                </div>
              </div>
            </div>
          </div>
        </div>

        {queuesError && (
          <div className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 flex items-center gap-3">
            <i className="pi pi-info-circle text-amber-500 text-xl" />
            <div>
              <p className="font-semibold">
                Menampilkan statistik dari data antrian
              </p>
              <p className="text-sm">Untuk tanggal {ymd}</p>
            </div>
          </div>
        )}

        {queuesLoading && (
          <div className="mt-4 text-center text-slate-500">
            Memuat statistik...
          </div>
        )}
      </div>

      {/* ================= RIWAYAT AKTIVITAS ================= */}
      <div className="bg-gradient-to-br from-white to-slate-50/80 border-2 border-slate-200/60 rounded-2xl p-4 sm:p-6 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0066CC] bg-clip-text text-transparent mb-4 sm:mb-6">
          Riwayat Aktivitas ({processedQueues.length} antrean)
        </h2>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable
            value={processedQueues}
            paginator
            rows={10}
            stripedRows
            size="small"
            showGridlines
            className="custom-datatable text-center"
            paginatorClassName="!border-t !border-slate-200 !bg-slate-50/50 !p-3 !justify-center sticky-paginator"
            emptyMessage={
              <div className="text-center py-8 text-slate-500">
                <i className="pi pi-inbox text-3xl text-slate-300 mb-2" />
                <p className="font-medium">Tidak ada data aktivitas</p>
                <p className="text-sm">Untuk tanggal {ymd}</p>
              </div>
            }>
            <Column
              field="queue_number"
              header="Nomor Antrian"
              sortable
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!font-bold !text-slate-800 !text-sm !border-r !border-slate-200 text-center"
              style={{ minWidth: "120px" }}
              body={(row) => formatQueueNumber(row.queue_number)}
            />
            <Column
              header="Start"
              body={(row) =>
                row.created_at
                  ? new Date(row.created_at).toLocaleTimeString("id-ID")
                  : "-"
              }
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "80px" }}
            />
            <Column
              header="Dipanggil"
              body={(row) => {
                if (!row.called_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.called_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.called_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Dilayani"
              body={(row) => {
                if (!row.served_at || !row.called_at) return "-";
                const diff =
                  (new Date(row.served_at) - new Date(row.called_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.served_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Selesai"
              body={(row) => {
                if (!row.done_at || !row.served_at) return "-";
                const diff =
                  (new Date(row.done_at) - new Date(row.served_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.done_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 !border-r !border-slate-200 text-center"
              bodyClassName="!border-r !border-slate-200 text-center"
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Batal"
              body={(row) => {
                if (!row.canceled_at || !row.created_at) return "-";
                const diff =
                  (new Date(row.canceled_at) - new Date(row.created_at)) / 1000;
                return (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-xs sm:text-sm">
                      {new Date(row.canceled_at).toLocaleTimeString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDurationId(diff)}
                    </span>
                  </div>
                );
              }}
              headerClassName="!bg-slate-50 !text-slate-700 !font-bold !border-b !border-slate-200 text-center"
              bodyClassName="text-center"
              style={{ minWidth: "100px" }}
            />
          </DataTable>
        </div>

        {queuesLoading && (
          <p className="text-slate-500 mt-3 text-center">
            Memuat riwayat aktivitas...
          </p>
        )}
        {queuesError && (
          <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 flex items-center gap-3">
            <i className="pi pi-exclamation-triangle text-red-500 text-xl" />
            <div>
              <p className="font-semibold">Gagal memuat riwayat aktivitas</p>
              <p className="text-sm">Untuk tanggal {ymd}</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <style>{`
        .custom-calendar .p-calendar .p-inputtext {
          border: none !important;
          background: transparent !important;
        }
        .custom-calendar .p-datepicker {
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
        }
        .custom-calendar .p-datepicker table td > span {
          width: 2rem !important;
          height: 2rem !important;
        }
        .custom-calendar .p-datepicker .p-datepicker-header {
          padding: 0.5rem !important;
        }

        .custom-datatable .p-datatable-tbody > tr > td {
          border-right: 1px solid #e2e8f0 !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        .custom-datatable .p-datatable-thead > tr > th {
          border-right: 1px solid #e2e8f0 !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        .custom-datatable .p-datatable-tbody > tr > td:last-child {
          border-right: none !important;
        }
        .custom-datatable .p-datatable-thead > tr > th:last-child {
          border-right: none !important;
        }
        .custom-datatable .p-datatable-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .custom-datatable .p-datatable-thead > tr > th {
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .custom-datatable .p-column-header-content {
          justify-content: center !important;
          width: 100% !important;
        }
        .custom-datatable .p-datatable-thead > tr > th > .p-column-header-content {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
        }

        .custom-datatable .p-datatable-wrapper {
          overflow-x: auto !important;
        }

        .sticky-paginator {
          position: relative !important;
          z-index: 10 !important;
        }

        .custom-datatable .p-datatable-table {
          min-width: 800px;
        }

        @media (min-width: 640px) {
          .custom-datatable .p-datatable-table {
            min-width: auto;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .custom-datatable .p-datatable-thead > tr > th {
            font-size: 0.75rem !important;
            padding: 0.5rem !important;
          }
          .custom-datatable .p-datatable-tbody > tr > td {
            font-size: 0.75rem !important;
            padding: 0.5rem !important;
          }
          
          .custom-datatable .p-paginator {
            padding: 0.5rem !important;
          }
          
          .custom-datatable .p-paginator .p-paginator-current,
          .custom-datatable .p-paginator .p-paginator-first,
          .custom-datatable .p-paginator .p-paginator-prev,
          .custom-datatable .p-paginator .p-paginator-page,
          .custom-datatable .p-paginator .p-paginator-next,
          .custom-datatable .p-paginator .p-paginator-last {
            min-width: 2rem !important;
            height: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
