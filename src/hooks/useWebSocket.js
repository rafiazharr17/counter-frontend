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

    console.log("🔌 Menghubungkan ke channel 'queue-channel'...");

    // Subscribe ke channel
    const channel = window.Echo.channel("queue-channel");

    // Listen ke event
    const eventHandler = (e) => {
      console.log("WebSocket Event Diterima:", e);
      // Panggil callback terbaru yang tersimpan di ref
      if (savedCallback.current) {
        savedCallback.current(e);
      }
    };

    channel.listen(".QueueUpdated", eventHandler);

    // Cleanup saat component di-unmount
    return () => {
      console.log("Meninggalkan channel...");
      channel.stopListening(".QueueUpdated", eventHandler);
    };
  }, []); 
};