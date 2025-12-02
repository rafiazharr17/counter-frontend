import { useEffect, useState } from "react";
import Echo from "laravel-echo";

// Pusher mock untuk fallback
class PusherMock {
  constructor() {
    this.subscribe = () => this;
    this.bind = () => this;
    this.unbind = () => this;
  }
}

export const useWebSocket = (onQueueUpdate) => {
  const [echo, setEcho] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log("Initializing Reverb connection...");
    
    let echoInstance;
    
    try {
      // Konfigurasi Echo dengan fallback
      const config = {
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY || "local",
        wsHost: import.meta.env.VITE_REVERB_HOST || "127.0.0.1",
        wsPort: import.meta.env.VITE_REVERB_PORT || 6001,
        wssPort: import.meta.env.VITE_REVERB_PORT || 6001,
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
      };

      console.log("Echo config:", config);

      // Coba buat Echo instance
      echoInstance = new Echo(config);
      setEcho(echoInstance);

      console.log("Echo instance created");

      // Event listeners untuk koneksi
      if (echoInstance.connector && echoInstance.connector.socket) {
        echoInstance.connector.socket.on('connect', () => {
          console.log('Reverb connected successfully');
          setIsConnected(true);
        });

        echoInstance.connector.socket.on('error', (error) => {
          console.error('Reverb connection error:', error);
          setIsConnected(false);
        });

        echoInstance.connector.socket.on('disconnect', (reason) => {
          console.log('Reverb disconnected:', reason);
          setIsConnected(false);
        });
      }

      // Subscribe ke channel dengan timeout dan retry
      const subscribeWithRetry = (retryCount = 0) => {
        try {
          console.log("Subscribing to queues channel...");
          
          const channel = echoInstance.channel("queues");
          
          channel.listen(".QueueUpdated", (event) => {
            console.log("Realtime event received:", event);
            if (onQueueUpdate && typeof onQueueUpdate === 'function') {
              onQueueUpdate(event.payload || event);
            }
          });

          console.log("Successfully subscribed to queues channel");
          
        } catch (error) {
          console.error("Failed to subscribe:", error);
          
          // Retry logic
          if (retryCount < 3) {
            console.log(`Retrying subscription... (${retryCount + 1}/3)`);
            setTimeout(() => subscribeWithRetry(retryCount + 1), 2000);
          } else {
            console.warn("Max retry attempts reached. Using fallback mode.");
          }
        }
      };

      // Delay subscription untuk memastikan koneksi sudah stabil
      setTimeout(() => {
        subscribeWithRetry();
      }, 1000);

    } catch (error) {
      console.error("Failed to initialize Echo:", error);
      console.warn("WebSocket features will be disabled");
      return;
    }

    return () => {
      console.log("Cleaning up WebSocket connection...");
      try {
        if (echoInstance) {
          echoInstance.leave("queues");
          echoInstance.disconnect();
          setEcho(null);
          setIsConnected(false);
        }
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    };
  }, [onQueueUpdate]);

  return { echo, isConnected };
};

// Fallback hook untuk development tanpa WebSocket
export const useWebSocketFallback = (onQueueUpdate) => {
  useEffect(() => {
    console.warn("WebSocket is disabled. Using fallback mode.");
    
    // Simulate periodic updates for development
    const interval = setInterval(() => {
      console.log("Fallback: Polling for updates...");
      // You can trigger manual refetch here if needed
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [onQueueUpdate]);
};