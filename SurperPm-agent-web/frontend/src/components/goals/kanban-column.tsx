import type { LucideIcon } from "lucide-react";
import { GoalCard } from "./goal-card";
import type { Goal } from "../../lib/schemas/goal";

interface KanbanColumnProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  bgBar: string;
  goals: Goal[];
  collapsed?: boolean;
  className?: string;
}

export function KanbanColumn({ title, icon: Icon, iconColor, bgBar, goals, collapsed = false, className = "" }: KanbanColumnProps) {
  if (collapsed) {
    return (
      <div className={`flex flex-col items-center border border-border bg-background h-full ${className}`}>
        <div className={`h-1.5 w-full shrink-0 ${bgBar}`} />
        <div className="py-3 flex flex-col items-center gap-1">
          <Icon size={14} className={iconColor} />
          <span className="text-[9px] text-muted-foreground font-bold">{goals.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border border-border bg-background h-full min-h-0 overflow-hidden ${className}`}>
      <div className={`h-1.5 w-full shrink-0 ${bgBar}`} />
      <div className="flex items-center gap-1.5 px-2 py-1.5 shrink-0 border-b border-border">
        <Icon size={13} className={`shrink-0 ${iconColor}`} />
        <h3 className="font-bold text-[10px] font-head uppercase tracking-wide flex-1">{title}</h3>
        <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-head text-secondary-foreground bg-secondary border border-border">
          {goals.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 nb-scrollbar">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {goals.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Icon size={24} className="opacity-15" />
            <p className="text-[10px] uppercase tracking-widest font-head opacity-30">Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
