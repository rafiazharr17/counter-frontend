import { useEffect, useRef, useState } from 'react'

export function useWebSocket(url) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const ws = new WebSocket(url)
    ws.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)])
    return () => ws.close()
  }, [url])

  return { messages }
}
