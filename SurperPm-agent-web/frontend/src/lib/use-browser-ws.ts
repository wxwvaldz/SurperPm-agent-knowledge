import { useCallback, useEffect, useRef, useState } from "react";

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

  const targetKey = target.type === "goal" ? `goal/${target.goalId}` : target.workspaceId;

  const connect = useCallback(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const base = import.meta.env.VITE_WS_URL ?? `${proto}//${location.host}`;
    const wsPath = target.type === "goal"
      ? `/ws/browser/goal/${target.goalId}`
      : `/ws/browser/${target.workspaceId}`;
    const url = `${base}${wsPath}`;

    const ws = new WebSocket(url);
    ws.binaryType = "blob";
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
      setState((s) => ({ ...s, connected: true, error: null }));
    };

    ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        if (pendingDownload.current) {
          const filename = pendingDownload.current;
          pendingDownload.current = null;
          const url = URL.createObjectURL(ev.data);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
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
            setState((s) => ({
              ...s,
              tabs: msg.tabs ?? [],
              activeTabId: msg.activeTabId ?? null,
            }));
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
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [targetKey]);

  useEffect(() => {
    connect();
    return () => {
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

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
