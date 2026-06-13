import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type WheelEvent } from "react";
import { useBrowserWS, type BrowserTarget } from "@/lib/use-browser-ws";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { ArrowLeft, ArrowRight, RotateCw, Globe, Plus, X, Scissors, BookMarked, Pencil, Trash2, Check } from "lucide-react";

const PRESET_BOOKMARKS: { label: string; url: string }[] = [
  { label: "GitHub", url: "https://github.com" },
  { label: "Google", url: "https://www.google.com" },
];

function bookmarkStorageKey(target: BrowserTarget): string {
  return target.type === "goal"
    ? `browser-bookmarks-goal-${target.goalId}`
    : `browser-bookmarks-ws-${target.workspaceId}`;
}

const SERVER_W = 1280;
const SERVER_H = 960;

interface BrowserPanelProps {
  target: BrowserTarget;
  onScreenshotCapture?: (dataUri: string) => void;
}

export function BrowserPanel({ target, onScreenshotCapture }: BrowserPanelProps) {
  const {
    imageUrl, currentUrl, connected, error, send, navigate,
    tabs, activeTabId, newTab, switchTab, closeTab,
  } = useBrowserWS(target);

  const [urlInput, setUrlInput] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Screenshot selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ cx: number; cy: number; sx: number; sy: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ cx: number; cy: number; sx: number; sy: number } | null>(null);

  // Bookmarks
  const storageKey = bookmarkStorageKey(target);
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [showBookmarks, setShowBookmarks] = useState(false);
  const bookmarksRef = useRef<HTMLDivElement>(null);

  const persistBookmarks = useCallback(
    (next: string[]) => {
      setBookmarks(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore quota/serialization errors
      }
    },
    [storageKey],
  );

  const addCurrentBookmark = useCallback(() => {
    if (!currentUrl || bookmarks.includes(currentUrl)) return;
    persistBookmarks([...bookmarks, currentUrl]);
  }, [currentUrl, bookmarks, persistBookmarks]);

  const removeBookmark = useCallback(
    (url: string) => persistBookmarks(bookmarks.filter((b) => b !== url)),
    [bookmarks, persistBookmarks],
  );

  useEffect(() => {
    if (!showBookmarks) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (bookmarksRef.current && !bookmarksRef.current.contains(e.target as Node)) {
        setShowBookmarks(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showBookmarks]);

  // Doodle
  const [isDoodling, setIsDoodling] = useState(false);
  const doodleCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const sizeDoodleCanvas = useCallback(() => {
    const canvas = doodleCanvasRef.current;
    const container = canvasRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
  }, []);

  useEffect(() => {
    if (isDoodling) sizeDoodleCanvas();
  }, [isDoodling, sizeDoodleCanvas]);

  const doodlePoint = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const handleDoodleDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawingRef.current = true;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    },
    [doodlePoint],
  );

  const handleDoodleMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [doodlePoint],
  );

  const stopDoodle = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const clearDoodle = useCallback(() => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const sendDoodle = useCallback(() => {
    const img = imgRef.current;
    const container = canvasRef.current;
    const doodle = doodleCanvasRef.current;
    if (!img || !container || !doodle || !onScreenshotCapture) return;
    const cw = doodle.width;
    const ch = doodle.height;
    if (cw === 0 || ch === 0) return;

    const out = document.createElement("canvas");
    out.width = cw;
    out.height = ch;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    // background matches the canvas letterbox
    ctx.fillStyle = "#171717";
    ctx.fillRect(0, 0, cw, ch);

    // object-contain placement of the browser frame
    const nw = img.naturalWidth || SERVER_W;
    const nh = img.naturalHeight || SERVER_H;
    const scale = Math.min(cw / nw, ch / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.drawImage(doodle, 0, 0);

    onScreenshotCapture(out.toDataURL("image/png"));
    clearDoodle();
    setIsDoodling(false);
  }, [onScreenshotCapture, clearDoodle]);

  const handleGo = useCallback(() => {
    if (!urlInput.trim()) return;
    navigate(urlInput.trim());
    setUrlInput("");
  }, [urlInput, navigate]);

  const toServerCoords = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: Math.round(((e.clientX - rect.left) / rect.width) * SERVER_W),
        y: Math.round(((e.clientY - rect.top) / rect.height) * SERVER_H),
      };
    },
    [],
  );

  const toCoords = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      const container = canvasRef.current;
      if (!container) return null;
      const containerRect = container.getBoundingClientRect();
      const imgRect = e.currentTarget.getBoundingClientRect();
      return {
        cx: e.clientX - containerRect.left,
        cy: e.clientY - containerRect.top,
        sx: Math.round(((e.clientX - imgRect.left) / imgRect.width) * SERVER_W),
        sy: Math.round(((e.clientY - imgRect.top) / imgRect.height) * SERVER_H),
      };
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      if (isSelecting) {
        if (selStart) {
          const coords = toCoords(e);
          if (coords) setSelEnd(coords);
        }
        return;
      }
      const { x, y } = toServerCoords(e);
      send({ type: "mouse", x, y, action: "move" });
    },
    [send, toServerCoords, isSelecting, selStart, toCoords],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      if (!isSelecting) return;
      const coords = toCoords(e);
      if (coords) {
        setSelStart(coords);
        setSelEnd(coords);
      }
    },
    [isSelecting, toCoords],
  );

  const handleMouseUp = useCallback(
    () => {
      if (!isSelecting || !selStart || !selEnd) return;
      const w = Math.abs(selEnd.cx - selStart.cx);
      const h = Math.abs(selEnd.cy - selStart.cy);
      if (w > 10 && h > 10 && imgRef.current && onScreenshotCapture) {
        const img = imgRef.current;
        const rect = img.getBoundingClientRect();
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        const container = canvasRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const cropX = (Math.min(selStart.cx, selEnd.cx) - (rect.left - containerRect.left)) * scaleX;
          const cropY = (Math.min(selStart.cy, selEnd.cy) - (rect.top - containerRect.top)) * scaleY;
          const cropW = Math.abs(selEnd.cx - selStart.cx) * scaleX;
          const cropH = Math.abs(selEnd.cy - selStart.cy) * scaleY;

          const canvas = document.createElement("canvas");
          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            const dataUri = canvas.toDataURL("image/png");
            onScreenshotCapture(dataUri);
          }
        }
      }
      setIsSelecting(false);
      setSelStart(null);
      setSelEnd(null);
    },
    [isSelecting, selStart, selEnd, onScreenshotCapture],
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      if (isSelecting) return;
      const { x, y } = toServerCoords(e);
      const button = e.button === 2 ? "right" : "left";
      send({ type: "mouse", x, y, action: "click", button });
    },
    [send, toServerCoords, isSelecting],
  );

  const handleDblClick = useCallback(
    (e: MouseEvent<HTMLImageElement>) => {
      if (isSelecting) return;
      const { x, y } = toServerCoords(e);
      send({ type: "mouse", x, y, action: "dblclick" });
    },
    [send, toServerCoords, isSelecting],
  );

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLImageElement>) => {
      if (isSelecting) return;
      const { x, y } = toServerCoords(e as unknown as MouseEvent<HTMLImageElement>);
      send({ type: "scroll", x, y, deltaX: e.deltaX, deltaY: e.deltaY });
    },
    [send, toServerCoords, isSelecting],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isSelecting && e.key === "Escape") {
        setIsSelecting(false);
        setSelStart(null);
        setSelEnd(null);
        return;
      }
      e.preventDefault();
      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push("Control");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.altKey) modifiers.push("Alt");
      if (e.metaKey) modifiers.push("Meta");
      send({ type: "key", key: e.key, modifiers });
    },
    [send, isSelecting],
  );

  const handleContextMenu = useCallback((e: MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
  }, []);

  // Compute selection rectangle in client pixels
  const selRect = selStart && selEnd ? {
    left: Math.min(selStart.cx, selEnd.cx),
    top: Math.min(selStart.cy, selEnd.cy),
    width: Math.abs(selEnd.cx - selStart.cx),
    height: Math.abs(selEnd.cy - selStart.cy),
  } : null;

  return (
    <div className="flex flex-col h-full" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex items-end gap-0 px-1 pt-1 border-b-2 border-border bg-muted/30 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-2 border-border border-b-0 -mb-[2px] max-w-[180px] ${
                tab.id === activeTabId
                  ? "bg-background font-semibold"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="truncate">{tab.title || tab.url || "新标签"}</span>
              {tabs.length > 1 && (
                <button
                  className="ml-auto shrink-0 hover:text-red-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button
            className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={newTab}
            title="新标签"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* URL Bar */}
      <div className="flex items-center gap-1 p-2 border-b-2 border-border bg-background shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => send({ type: "key", key: "ArrowLeft", modifiers: ["Alt"] })}
          title="后退"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => send({ type: "key", key: "ArrowRight", modifiers: ["Alt"] })}
          title="前进"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => send({ type: "key", key: "F5", modifiers: [] })}
          title="刷新"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant={isSelecting ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsSelecting(!isSelecting);
            setSelStart(null);
            setSelEnd(null);
          }}
          title="截图问答"
        >
          <Scissors className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant={isDoodling ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const next = !isDoodling;
            setIsDoodling(next);
            if (next) {
              setIsSelecting(false);
              setSelStart(null);
              setSelEnd(null);
            } else {
              clearDoodle();
            }
          }}
          title="涂鸦标注"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        {isDoodling && (
          <>
            <Button size="sm" onClick={sendDoodle} title="添加到对话">
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearDoodle} title="清除涂鸦">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
        <div className="relative" ref={bookmarksRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBookmarks((s) => !s)}
            title="常用网址"
          >
            <BookMarked className="w-3.5 h-3.5" />
          </Button>
          {showBookmarks && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-background border-2 border-border shadow-lg z-50 py-1 text-xs">
              {PRESET_BOOKMARKS.map((bm) => (
                <button
                  key={bm.url}
                  onClick={() => {
                    navigate(bm.url);
                    setShowBookmarks(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50"
                >
                  <Globe size={12} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{bm.label}</span>
                </button>
              ))}
              {bookmarks.length > 0 && (
                <div className="border-t border-border mt-1 pt-1">
                  {bookmarks.map((url) => (
                    <div
                      key={url}
                      className="group flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50"
                    >
                      <button
                        onClick={() => {
                          navigate(url);
                          setShowBookmarks(false);
                        }}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <Globe size={12} className="shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono">{url}</span>
                      </button>
                      <button
                        onClick={() => removeBookmark(url)}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                        title="删除"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={addCurrentBookmark}
                  disabled={!currentUrl || bookmarks.includes(currentUrl)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Plus size={12} />
                  <span className="truncate">加入当前网址</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <form
          className="flex-1 flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleGo();
          }}
        >
          <Input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={currentUrl || "输入网址..."}
            className="flex-1 text-xs font-mono"
          />
          <Button type="submit" size="sm" disabled={!urlInput.trim()}>
            <Globe className="w-3.5 h-3.5" />
          </Button>
        </form>
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            title={connected ? "已连接" : "未连接"}
          />
        </div>
      </div>

      {/* Browser Canvas */}
      <div className="flex-1 relative overflow-hidden bg-neutral-900 min-h-0" ref={canvasRef}>
        {error && (
          <div className="absolute top-2 left-2 right-2 z-10 bg-red-100 border border-red-300 text-red-800 text-xs p-2 rounded">
            {error}
          </div>
        )}
        {isSelecting && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-xs px-3 py-1 rounded">
            拖拽选择截图区域 · 按 ESC 取消
          </div>
        )}
        {isDoodling && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white text-xs px-3 py-1 rounded">
            涂鸦标注 · 点 ✓ 添加到对话
          </div>
        )}
        {imageUrl ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt="shared browser"
            className="w-full h-full object-contain select-none"
            style={{ cursor: isSelecting ? "crosshair" : "default" }}
            draggable={false}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDblClick}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
            {connected ? "等待画面..." : "正在连接共享浏览器..."}
          </div>
        )}
        {selRect && selRect.width > 2 && selRect.height > 2 && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{ left: selRect.left, top: selRect.top, width: selRect.width, height: selRect.height }}
          />
        )}
        <canvas
          ref={doodleCanvasRef}
          className="absolute inset-0 z-10"
          style={{
            cursor: isDoodling ? "crosshair" : "default",
            pointerEvents: isDoodling ? "auto" : "none",
            display: isDoodling ? "block" : "none",
          }}
          onMouseDown={handleDoodleDown}
          onMouseMove={handleDoodleMove}
          onMouseUp={stopDoodle}
          onMouseLeave={stopDoodle}
        />
      </div>

    </div>
  );
}
