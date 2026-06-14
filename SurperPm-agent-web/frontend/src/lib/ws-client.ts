type EventHandler = (data: unknown) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, EventHandler[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private url: string;
  private _closed = false;

  constructor(channelKey: string) {
    const base = import.meta.env.VITE_WS_URL ?? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
    const path = channelKey.startsWith("goal:")
      ? `/ws/goal/${channelKey.slice(5)}`
      : `/ws/${channelKey}`;
    this.url = `${base}${path}`;
    this.connect();
  }

  private connect() {
    if (this._closed) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const handlers = this.handlers.get(msg.event) ?? [];
        handlers.forEach((h) => h(msg.data));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (this._closed) return;
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  on(event: string, handler: EventHandler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return () => {
      const updated = (this.handlers.get(event) ?? []).filter((h) => h !== handler);
      this.handlers.set(event, updated);
    };
  }

  close() {
    this._closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
