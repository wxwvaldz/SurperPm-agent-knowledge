import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { api } from "../../lib/api";
import { goalKeys } from "../../lib/queries/goals";
import type { Goal } from "../../lib/schemas/goal";

interface GoalCardProps {
  goal: Goal;
  workspaceId: string;
}

const statusIcons = {
  todo: Clock,
  doing: Play,
  done: CheckCircle,
  failed: XCircle,
};

export function GoalCard({ goal, workspaceId }: GoalCardProps) {
  const queryClient = useQueryClient();

  const executeMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/goals/${goal.id}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all(workspaceId) });
    },
  });

  const Icon = statusIcons[goal.status] ?? Clock;

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <Icon size={16} className={`mt-0.5 shrink-0 ${
          goal.status === "done" ? "text-green-500" :
          goal.status === "failed" ? "text-red-500" :
          goal.status === "doing" ? "text-yellow-500" :
          "text-muted-foreground"
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{goal.title}</p>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
      </div>
      {goal.status === "todo" && (
        <button
          onClick={() => executeMutation.mutate()}
          disabled={executeMutation.isPending}
          className="mt-2 w-full text-xs py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {executeMutation.isPending ? "Starting..." : "Execute"}
        </button>
      )}
    </div>
  );
}
