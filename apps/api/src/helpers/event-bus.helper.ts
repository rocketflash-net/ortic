import { EventEmitter } from "events";
import { NotificationType } from "@@types/entity.type";

type EventMapType = {
  // Notifikasi admin baru (diteruskan ke dashboard lewat SSE).
  notification: [NotificationType];
};

/**
 * Event bus di dalam proses API. Cukup selama API berjalan sebagai satu proses; bila nanti di-scale ke beberapa
 * instance, ganti dengan pub/sub (mis. Redis) tanpa mengubah pemanggilnya.
 */
class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Satu listener per tab dashboard yang terbuka.
    this.emitter.setMaxListeners(200);
  }

  emit<K extends keyof EventMapType>(event: K, ...args: EventMapType[K]): void {
    this.emitter.emit(event, ...args);
  }

  on<K extends keyof EventMapType>(event: K, listener: (...args: EventMapType[K]) => void): () => void {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return () => this.emitter.off(event, listener as (...args: unknown[]) => void);
  }
}

const eventBus = new EventBus();

export { eventBus };
