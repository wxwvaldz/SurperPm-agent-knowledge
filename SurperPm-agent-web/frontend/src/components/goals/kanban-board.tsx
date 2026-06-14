import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Timer, Clock, Loader2, Eye, CheckCircle, XCircle } from "lucide-react";
import { goalListOptions } from "../../lib/queries/goals";
import { KanbanColumn } from "./kanban-column";

const COLUMNS = [
  { status: "scheduled", title: "Scheduled",    icon: Timer,       iconColor: "text-orange-600", bgBar: "bg-orange-400" },
  { status: "todo",      title: "To Do",        icon: Clock,       iconColor: "text-blue-600",   bgBar: "bg-blue-400" },
  { status: "doing",     title: "In Progress",  icon: Loader2,     iconColor: "text-yellow-600", bgBar: "bg-yellow-400" },
  { status: "review",    title: "Review",       icon: Eye,         iconColor: "text-purple-600", bgBar: "bg-purple-400" },
  { status: "done",      title: "Done",         icon: CheckCircle, iconColor: "text-green-600",  bgBar: "bg-green-400" },
  { status: "failed",    title: "Failed",       icon: XCircle,     iconColor: "text-red-600",    bgBar: "bg-red-400" },
] as const;

function SkeletonColumn({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col border border-border bg-background ${className}`}>
      <div className="h-1.5 w-full bg-accent animate-pulse" />
      <div className="px-2 py-1.5 border-b border-border flex items-center gap-1.5">
        <div className="h-3 w-3 bg-accent animate-pulse" />
        <div className="h-2.5 w-14 bg-accent animate-pulse" />
      </div>
      <div className="p-1.5 space-y-1.5">
        {[1, 2].map((i) => (
          <div key={i} className="border border-border bg-card p-2 space-y-1.5 animate-pulse">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 bg-accent shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 w-3/4 bg-accent" />
                <div className="h-2 w-1/2 bg-accent" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="h-6 flex-1 bg-accent" />
              <div className="h-6 w-6 bg-accent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  search: string;
  topicId?: number;
}

export function KanbanBoard({ search, topicId }: KanbanBoardProps) {
  const { data: goals = [], isLoading } = useQuery(goalListOptions(topicId));

  const filtered = useMemo(() => {
    if (!search.trim()) return goals;
    const q = search.toLowerCase();
    return goals.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
    );
  }, [goals, search]);

  const [focused, setFocused] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex gap-2 h-full overflow-x-auto pb-2">
        {COLUMNS.map((_, i) => (
          <div key={i} className="flex-1 min-w-[120px] h-full">
            <SkeletonColumn />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-2 h-full overflow-x-auto pb-2"
      onClick={(e) => { if (e.target === e.currentTarget) setFocused(null); }}
    >
      {COLUMNS.map(({ status, title, icon, iconColor, bgBar }) => {
        const isFocused = focused === status;
        const isOther = focused !== null && !isFocused;
        return (
          <div
            key={status}
            className="h-full transition-all duration-300 ease-in-out cursor-pointer"
            style={{
              flex: isFocused ? "3 1 0%" : isOther ? "0.5 1 0%" : "1 1 0%",
              minWidth: isOther ? 60 : 120,
            }}
            onClick={(e) => { e.stopPropagation(); setFocused(isFocused ? null : status); }}
          >
            <KanbanColumn
              title={title}
              icon={icon}
              iconColor={iconColor}
              bgBar={bgBar}
              goals={filtered.filter((g) => g.status === status)}
              collapsed={isOther}
              className={isOther ? "opacity-60" : ""}
            />
          </div>
        );
      })}
    </div>
  );
}
