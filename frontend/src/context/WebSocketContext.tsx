import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (msg: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {},
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    const wsUrl = import.meta.env.VITE_WS_BASE_URL 
      ? `${import.meta.env.VITE_WS_BASE_URL}/ws/telemetry`
      : `ws://${window.location.host}/ws/telemetry`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setLastMessage(parsed);
        } catch (e) {
          // Plain text message
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket connection error, retrying in 5s...', err);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 5000);
    }
  };

  useEffect(() => {
    connect();
    // Heartbeat ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendMessage = (msg: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
