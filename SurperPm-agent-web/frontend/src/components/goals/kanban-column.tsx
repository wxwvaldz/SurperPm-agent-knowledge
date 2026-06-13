import { GoalCard } from "./goal-card";
import type { Goal } from "../../lib/schemas/goal";

interface KanbanColumnProps {
  title: string;
  color: string;
  goals: Goal[];
  workspaceId: string;
}

export function KanbanColumn({ title, color, goals, workspaceId }: KanbanColumnProps) {
  return (
    <div className={`flex flex-col rounded-lg border-t-2 ${color} bg-muted/30 p-3`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {goals.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} workspaceId={workspaceId} />
        ))}
        {goals.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No goals</p>
        )}
      </div>
    </div>
  );
}
