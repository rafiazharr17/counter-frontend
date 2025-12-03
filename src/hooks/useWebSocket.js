import { useEffect, useRef } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

if (typeof window !== "undefined" && !window.Echo) {
  window.Pusher = Pusher;

  window.Echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
    enabledTransports: ["ws", "wss"],
    disableStats: true, 
  });
}

export const useWebSocket = (callback) => {
  // 1. Gunakan useRef untuk menyimpan callback terbaru
  const savedCallback = useRef(callback);

  // 2. Update ref setiap kali callback berubah
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    // Pastikan Echo sudah ada
    if (!window.Echo) return;

    console.log("Menghubungkan ke channel 'queue-channel'...");

    // Subscribe ke channel
    const channel = window.Echo.channel("queue-channel");

    // Listen ke event - debug lebih detail
    const eventHandler = (e) => {
      console.log("WebSocket Event Diterima:", {
        rawEvent: e,
        type: typeof e,
        keys: Object.keys(e || {}),
        queueData: e?.queue,
        hasQueue: !!e?.queue
      });
      
      // Format event sesuai dengan kebutuhan DisplayScreen
      const formattedEvent = {
        // Ambil event dari data queue jika ada
        event: e?.queue?.status ? `queue_${e.queue.status}` : 'queue_updated',
        data: e?.queue || e,
        raw: e // Simpan data raw untuk debugging
      };
      
      console.log("Event yang diformat:", formattedEvent);
      
      // Panggil callback terbaru yang tersimpan di ref
      if (savedCallback.current) {
        savedCallback.current(formattedEvent);
      }
    };

    channel.listen(".QueueUpdated", eventHandler);

    // Tambahkan listener untuk event lainnya jika ada
    channel.listen(".QueueCalled", eventHandler);
    channel.listen(".QueueServed", eventHandler);
    channel.listen(".QueueDone", eventHandler);
    channel.listen(".QueueCreated", eventHandler);

    // Cleanup saat component di-unmount
    return () => {
      console.log("🔌 Meninggalkan channel...");
      channel.stopListening(".QueueUpdated", eventHandler);
      channel.stopListening(".QueueCalled", eventHandler);
      channel.stopListening(".QueueServed", eventHandler);
      channel.stopListening(".QueueDone", eventHandler);
      channel.stopListening(".QueueCreated", eventHandler);
    };
  }, []); 
};