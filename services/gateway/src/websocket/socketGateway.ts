import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { TokenService, TokenPayload } from '../services/tokenService';
import { EventBroker, MediConnectEvent } from '../services/eventBroker';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: TokenPayload;
  };
}

export class SocketGateway {
  private static io: SocketIOServer | null = null;

  public static initialize(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      path: '/ws',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Initialize Redis Pub/Sub cluster listener
    EventBroker.initialize();
    EventBroker.onEvent((event: MediConnectEvent) => {
      if (!this.io) return;
      if (event.room) {
        this.io.to(event.room).emit(event.event, event.payload);
      } else {
        this.io.emit(event.event, event.payload);
      }
    });

    // Authentication middleware
    this.io.use((socket: Socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const user = TokenService.verifyAccessToken(token);
          socket.data.user = user;
        } catch {
          // Allow connection as guest if token is invalid or expired
        }
      }
      next();
    });

    // Connection handler
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as TokenPayload | undefined;

      // Join user and role specific rooms
      if (user) {
        socket.join(`user:${user.userId}`);
        socket.join(`role:${user.role}`);
        console.log(`Socket ${socket.id} joined rooms: user:${user.userId}, role:${user.role}`);
      }

      // Handle session room joining (for live transcription & triage progress)
      socket.on('join_session', (sessionId: string) => {
        if (sessionId) {
          socket.join(`session:${sessionId}`);
          console.log(`Socket ${socket.id} joined session:${sessionId}`);
          socket.emit('joined_session', { sessionId, success: true });
        }
      });

      socket.on('leave_session', (sessionId: string) => {
        if (sessionId) {
          socket.leave(`session:${sessionId}`);
        }
      });

      // Handle real-time doctor-patient consultation chat
      socket.on(
        'chat_message',
        (data: { roomId: string; message: string; receiverId?: string }) => {
          if (!data.roomId || !data.message) return;

          const chatPayload = {
            roomId: data.roomId,
            senderId: user?.userId || 'guest',
            senderEmail: user?.email || 'guest',
            senderRole: user?.role || 'PATIENT',
            message: data.message,
            timestamp: new Date().toISOString(),
          };

          // Broadcast via Redis Pub/Sub
          EventBroker.publish('chat_message', chatPayload, `room:${data.roomId}`);
        }
      );

      socket.on('disconnect', () => {
        // cleanup handled automatically by Socket.io
      });
    });

    return this.io;
  }

  public static getIO(): SocketIOServer | null {
    return this.io;
  }
}
