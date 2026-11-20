import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;
    const token = localStorage.getItem('mediconnect_access_token');
    const wsUrl = import.meta.env.VITE_WS_URL || '/';

    this.socket = io(wsUrl, {
      path: '/ws',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('Connected to MediConnect WebSocket Gateway:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnecting = false;
      console.warn('WebSocket connection error:', err.message);
    });

    this.socket.on('disconnect', () => {
      this.isConnecting = false;
    });

    return this.socket;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public joinSession(sessionId: string): void {
    const s = this.getSocket();
    s.emit('join_session', sessionId);
  }

  public leaveSession(sessionId: string): void {
    const s = this.getSocket();
    s.emit('leave_session', sessionId);
  }

  public subscribeToProgress(
    sessionId: string,
    callback: (data: { progress: number; status: string; result?: any }) => void
  ): () => void {
    const s = this.getSocket();
    this.joinSession(sessionId);

    const handler = (data: any) => {
      if (data.sessionId === sessionId) {
        callback(data);
      }
    };

    s.on('transcription_progress', handler);

    return () => {
      s.off('transcription_progress', handler);
      this.leaveSession(sessionId);
    };
  }

  public subscribeToUrgentFlag(callback: (alertData: any) => void): () => void {
    const s = this.getSocket();
    s.on('urgent_flag', callback);
    return () => {
      s.off('urgent_flag', callback);
    };
  }

  public sendChatMessage(roomId: string, message: string): void {
    const s = this.getSocket();
    s.emit('chat_message', { roomId, message });
  }

  public subscribeToChat(
    roomId: string,
    callback: (message: any) => void
  ): () => void {
    const s = this.getSocket();
    const handler = (msg: any) => {
      if (msg.roomId === roomId) {
        callback(msg);
      }
    };
    s.on('chat_message', handler);
    return () => {
      s.off('chat_message', handler);
    };
  }
}

export const wsService = new WebSocketService();
