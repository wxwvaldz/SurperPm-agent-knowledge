import { useCallback, useEffect, useRef, useState } from "react";

const DEBUG = import.meta.env.DEV;

export interface Tab {
  id: string;
  url: string;
  title: string;
}

interface BrowserWSState {
  imageUrl: string | null;
  currentUrl: string;
  currentTitle: string;
  connected: boolean;
  error: string | null;
  tabs: Tab[];
  activeTabId: string | null;
}

export type BrowserTarget =
  | { type: "goal"; goalId: number }
  | { type: "workspace"; workspaceId: string };

const MAX_QUEUE_SIZE = 500;

export function useBrowserWS(target: BrowserTarget) {
  const [state, setState] = useState<BrowserWSState>({
    imageUrl: null,
    currentUrl: "",
    currentTitle: "",
    connected: false,
    error: null,
    tabs: [],
    activeTabId: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const prevBlobUrl = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const pendingDownload = useRef<string | null>(null);
  const closedRef = useRef(false);
  const messageQueue = useRef<Record<string, unknown>[]>([]);

  const targetKey = target.type === "goal" ? `goal/${target.goalId}` : target.workspaceId;

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const q = messageQueue.current;
    if (q.length === 0) return;
    if (DEBUG) console.debug(`[browser-ws] flushing ${q.length} queued messages`);
    while (q.length > 0) {
      const msg = q.shift()!;
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        q.unshift(msg);
        break;
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (closedRef.current) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const base = import.meta.env.VITE_WS_URL ?? `${proto}//${location.host}`;
    const wsPath = target.type === "goal"
      ? `/ws/browser/goal/${target.goalId}`
      : `/ws/browser/${target.workspaceId}`;
    const url = `${base}${wsPath}`;

    if (DEBUG) console.debug(`[browser-ws] connecting to ${wsPath}`);

    const ws = new WebSocket(url);
    ws.binaryType = "blob";
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
      setState((s) => ({ ...s, connected: true, error: null }));
      if (DEBUG) console.debug("[browser-ws] connected");
      setTimeout(() => flushQueue(), 0);
    };

    ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        if (pendingDownload.current) {
          const filename = pendingDownload.current;
          pendingDownload.current = null;
          const blobUrl = URL.createObjectURL(ev.data);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(blobUrl);
          return;
        }
        const blobUrl = URL.createObjectURL(ev.data);
        if (prevBlobUrl.current) {
          URL.revokeObjectURL(prevBlobUrl.current);
        }
        prevBlobUrl.current = blobUrl;
        setState((s) => ({ ...s, imageUrl: blobUrl }));
      } else {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "browser:navigated") {
            setState((s) => ({
              ...s,
              currentUrl: msg.url ?? s.currentUrl,
              currentTitle: msg.title ?? s.currentTitle,
            }));
          } else if (msg.type === "browser:tabs") {
            const newTabs: Tab[] = msg.tabs ?? [];
            const newActiveId = msg.activeTabId ?? null;
            setState((s) => {
              const activeTab = newTabs.find((t: Tab) => t.id === newActiveId);
              return {
                ...s,
                tabs: newTabs,
                activeTabId: newActiveId,
                currentUrl: activeTab?.url ?? s.currentUrl,
                currentTitle: activeTab?.title ?? s.currentTitle,
              };
            });
          } else if (msg.type === "browser:download") {
            pendingDownload.current = msg.filename ?? "download";
          } else if (msg.type === "browser:error") {
            setState((s) => ({ ...s, error: msg.message }));
          }
        } catch {
          // ignore
        }
      }
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false }));
      if (closedRef.current) return;
      if (DEBUG) console.debug("[browser-ws] disconnected, will reconnect");
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
    };

    ws.onerror = () => {
      if (DEBUG) console.debug("[browser-ws] error, closing");
      ws.close();
    };
  }, [targetKey, flushQueue]);

  useEffect(() => {
    closedRef.current = false;
    connect();
    return () => {
      closedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      if (messageQueue.current.length > 0) flushQueue();
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        if (messageQueue.current.length < MAX_QUEUE_SIZE) {
          messageQueue.current.push(msg);
        }
      }
    } else {
      if (messageQueue.current.length < MAX_QUEUE_SIZE) {
        messageQueue.current.push(msg);
        if (DEBUG && messageQueue.current.length === 1) {
          console.debug("[browser-ws] queuing message (ws not open)");
        }
      }
    }
  }, [flushQueue]);

  const navigate = useCallback(
    (url: string) => send({ type: "navigate", url }),
    [send],
  );

  const newTab = useCallback(() => send({ type: "tab:new" }), [send]);
  const switchTab = useCallback(
    (id: string) => send({ type: "tab:switch", tabId: id }),
    [send],
  );
  const closeTab = useCallback(
    (id: string) => send({ type: "tab:close", tabId: id }),
    [send],
  );

  return { ...state, send, navigate, newTab, switchTab, closeTab };
}
