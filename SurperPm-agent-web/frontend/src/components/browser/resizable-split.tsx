import { useCallback, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Collapsed = "left" | "right" | null;

interface ResizableSplitProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
}

export function ResizableSplit({
  left,
  right,
  defaultLeftPercent = 70,
  minLeftPercent = 30,
  maxLeftPercent = 80,
}: ResizableSplitProps) {
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const [collapsed, setCollapsed] = useState<Collapsed>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setLeftPercent(Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)));
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [minLeftPercent, maxLeftPercent],
  );

  const leftWidth =
    collapsed === "right" ? "100%" : `${leftPercent}%`;

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div
        className={`flex flex-col min-w-0 overflow-hidden ${collapsed === "left" ? "hidden" : ""}`}
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <div className="flex w-5 shrink-0 flex-col items-center border-x-2 border-border bg-muted/40">
        <div className="flex flex-col gap-1 py-1">
          {collapsed === null ? (
            <>
              <button
                type="button"
                onClick={() => setCollapsed("left")}
                title="折叠左侧面板"
                className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft size={12} />
              </button>
              <button
                type="button"
                onClick={() => setCollapsed("right")}
                title="折叠右侧面板"
                className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(null)}
              title="展开面板"
              className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {collapsed === "left" ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronLeft size={12} />
              )}
            </button>
          )}
        </div>
        {collapsed === null && (
          <div
            className="w-full flex-1 cursor-col-resize hover:bg-primary/40"
            onMouseDown={onMouseDown}
          />
        )}
      </div>

      <div
        className={`flex-1 flex flex-col min-w-0 overflow-hidden ${collapsed === "right" ? "hidden" : ""}`}
      >
        {right}
      </div>
    </div>
  );
}
