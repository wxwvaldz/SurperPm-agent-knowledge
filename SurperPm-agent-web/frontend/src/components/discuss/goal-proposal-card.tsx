import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Calendar, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { goalKeys } from "@/lib/queries/goals";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { Button } from "@/components/retroui/Button";

export interface GoalProposal {
  title: string;
  description?: string;
  deadline?: string;
  schedule?: string;
  delay_minutes?: number;
}

export function parseGoalProposals(content: string): { text: string; proposals: GoalProposal[] } {
  const proposals: GoalProposal[] = [];
  const text = content.replace(/```goal-proposal\s*\n([\s\S]*?)```/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (parsed.title) proposals.push(parsed);
    } catch { /* skip malformed */ }
    return "";
  });
  return { text: text.trim(), proposals };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  todo: { label: "Todo", color: "text-muted-foreground" },
  doing: { label: "Executing...", color: "text-blue-600" },
  review: { label: "Review", color: "text-amber-600" },
  done: { label: "Done", color: "text-green-600" },
  failed: { label: "Failed", color: "text-red-600" },
};

function GoalProposalItem({ proposal, workspaceId }: { proposal: GoalProposal; workspaceId: string }) {
  const [goalId, setGoalId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!goalId) return;
    const interval = setInterval(async () => {
      try {
        const g = await api.get<{ status: string }>(`/goals/${goalId}`);
        setStatus(g.status);
        if (g.status === "done" || g.status === "failed") {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: goalKeys.all() });
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [goalId, queryClient]);

  const mutation = useMutation({
    mutationFn: async () => {
      const goal = await api.post<{ id: number }>("/goals", {
        workspace_id: workspaceId,
        title: proposal.title,
        description: proposal.description || null,
        ...(proposal.deadline ? { deadline: proposal.deadline } : {}),
        ...(proposal.schedule ? { schedule: proposal.schedule } : {}),
        ...(proposal.delay_minutes ? {
          delay_until: new Date(Date.now() + proposal.delay_minutes * 60000).toISOString(),
        } : {}),
      });
      setGoalId(goal.id);
      setStatus("todo");
      try {
        await api.post(`/goals/${goal.id}/execute`);
        setStatus("doing");
      } catch { /* execute may fail if no repo */ }
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });

  const statusInfo = status ? STATUS_LABELS[status] ?? { label: status, color: "text-muted-foreground" } : null;

  return (
    <div className="flex items-start gap-2.5 border border-border bg-card p-2.5">
      <Target size={14} className="mt-0.5 shrink-0 text-foreground/60" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{proposal.title}</p>
        {proposal.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{proposal.description}</p>
        )}
        {proposal.deadline && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            <Calendar size={9} />
            <span>{proposal.deadline}</span>
          </div>
        )}
      </div>
      {statusInfo ? (
        <span className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${statusInfo.color}`}>
          {status === "doing" && <Loader2 size={10} className="animate-spin" />}
          {status === "done" && <Check size={10} />}
          {statusInfo.label}
        </span>
      ) : (
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="shrink-0 text-[10px] h-6 px-2"
        >
          {mutation.isPending ? <Loader2 size={10} className="animate-spin" /> : "Create & Run"}
        </Button>
      )}
    </div>
  );
}

export function GoalProposalCards({ proposals }: { proposals: GoalProposal[] }) {
  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const workspaceId = workspaces[0]?.id ?? "";
  const queryClient = useQueryClient();
  const [allCreated, setAllCreated] = useState(false);

  const batchMutation = useMutation({
    mutationFn: () =>
      api.post("/goals/batch", {
        workspace_id: workspaceId,
        goals: proposals.map((p) => ({
          workspace_id: workspaceId,
          title: p.title,
          description: p.description || null,
          ...(p.deadline ? { deadline: p.deadline } : {}),
        })),
      }),
    onSuccess: () => {
      setAllCreated(true);
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });

  if (!workspaceId || proposals.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1.5">
      {proposals.map((p, idx) => (
        <GoalProposalItem key={idx} proposal={p} workspaceId={workspaceId} />
      ))}
      {proposals.length > 1 && (
        <div className="flex justify-end">
          {allCreated ? (
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
              <Check size={10} /> All created
            </span>
          ) : (
            <Button
              size="sm"
              onClick={() => batchMutation.mutate()}
              disabled={batchMutation.isPending}
              className="text-[10px] h-6 px-2"
            >
              {batchMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : "Create All"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
