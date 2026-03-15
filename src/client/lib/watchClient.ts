/**
 * WebSocket client for file watching.
 * Connects to the server's /ws endpoint for real-time file change notifications.
 */

type FileChangeCallback = (path: string, content: string) => void;
type FileDeleteCallback = (path: string) => void;

interface ServerMessage {
  type: "file_changed" | "file_deleted";
  path: string;
  content?: string;
}

export class WatchClient {
  private ws: WebSocket | null = null;
  private watchedPaths = new Set<string>();
  private onChangeCbs: FileChangeCallback[] = [];
  private onDeleteCbs: FileDeleteCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private disposed = false;

  constructor(private url: string = `ws://${location.host}/ws`) {}

  connect() {
    if (this.disposed) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Re-subscribe all watched paths
      for (const path of this.watchedPaths) {
        this.send({ type: "watch", path });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === "file_changed" && msg.content !== undefined) {
          for (const cb of this.onChangeCbs) cb(msg.path, msg.content);
        } else if (msg.type === "file_deleted") {
          for (const cb of this.onDeleteCbs) cb(msg.path);
        }
      } catch { /* ignore malformed messages */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  watchFile(path: string) {
    this.watchedPaths.add(path);
    this.send({ type: "watch", path });
  }

  unwatchFile(path: string) {
    this.watchedPaths.delete(path);
    this.send({ type: "unwatch", path });
  }

  onFileChange(cb: FileChangeCallback) {
    this.onChangeCbs.push(cb);
  }

  onFileDelete(cb: FileDeleteCallback) {
    this.onDeleteCbs.push(cb);
  }

  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private send(msg: { type: string; path: string }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect() {
    if (this.disposed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
}
