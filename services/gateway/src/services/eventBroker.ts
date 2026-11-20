import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { config } from '../config';

export interface MediConnectEvent<T = any> {
  room?: string; // target room e.g. "user:123", "session:456", "role:DOCTOR"
  event: string; // "transcription_progress", "triage_ready", "note_draft_ready", "urgent_flag", "chat_message"
  payload: T;
  timestamp: string;
  senderId?: string;
}

export class EventBroker {
  private static publisher: Redis | null = null;
  private static subscriber: Redis | null = null;
  private static localEmitter = new EventEmitter();
  private static readonly CHANNEL = 'mediconnect:events';

  public static initialize(): void {
    if (!config.redis.host) return;

    try {
      this.publisher = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      this.subscriber = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      this.publisher.on('error', () => {});
      this.subscriber.on('error', () => {});

      // Subscribe to Redis pub/sub channel
      this.subscriber.subscribe(this.CHANNEL, (err) => {
        if (!err) {
          console.log(`Subscribed to Redis Pub/Sub channel: ${this.CHANNEL}`);
        }
      });

      this.subscriber.on('message', (channel, message) => {
        if (channel === this.CHANNEL) {
          try {
            const parsedEvent: MediConnectEvent = JSON.parse(message);
            this.localEmitter.emit('event', parsedEvent);
          } catch {
            // Malformed event json
          }
        }
      });
    } catch {
      // Redis unavailable; use local emitter
    }
  }

  /**
   * Publish an event to Redis pub/sub for cross-instance fan-out
   */
  public static async publish<T>(
    event: string,
    payload: T,
    room?: string,
    senderId?: string
  ): Promise<void> {
    const message: MediConnectEvent<T> = {
      room,
      event,
      payload,
      timestamp: new Date().toISOString(),
      senderId,
    };

    // Always emit locally first
    this.localEmitter.emit('event', message);

    // Broadcast across cluster via Redis
    if (this.publisher && this.publisher.status === 'ready') {
      try {
        await this.publisher.publish(this.CHANNEL, JSON.stringify(message));
      } catch {
        // Fall back to local emission
      }
    }
  }

  /**
   * Register a listener for all incoming cluster events
   */
  public static onEvent(handler: (event: MediConnectEvent) => void): void {
    this.localEmitter.on('event', handler);
  }
}
