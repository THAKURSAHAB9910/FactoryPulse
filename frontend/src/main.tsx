import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
