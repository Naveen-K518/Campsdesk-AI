import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return `http://${window.location.hostname}:5000`;
    }
  }
  return envUrl || 'http://localhost:5000';
};

let socket: Socket | null = null;
let activeToken: string | null = null;

export function getSocket(token?: string | null): Socket | null {
  if (!token && !activeToken && !socket) {
    // Cannot establish connection without a valid token
    return null;
  }

  // If a new token is provided that differs from active token, disconnect old connection
  if (token && token !== activeToken) {
    disconnectSocket();
  }

  if (!socket) {
    activeToken = token || activeToken;
    const serverUrl = getBaseUrl();
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: activeToken ? { token: activeToken } : undefined,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to real-time server with secure JWT handshake:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection handshake error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected from real-time server:', reason);
    });
  }

  return socket;
}

export function reconnectSocket(token?: string | null): Socket | null {
  disconnectSocket();
  return getSocket(token);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeToken = null;
  }
}

// Deprecated: Channels are now strictly assigned server-side from verified JWT
export function subscribeToStudentChannel(_studentId?: string): void {
  // No-op: Server automatically assigns student room based on verified JWT
}

export function subscribeToFacultyChannel(): void {
  // No-op: Server automatically assigns mentor/admin room based on verified JWT
}
