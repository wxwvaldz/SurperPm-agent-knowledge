import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { goalKeys } from "@/lib/queries/goals";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { Button } from "@/components/retroui/Button";

export interface GoalProposal {
  title: string;
  description?: string;
  repo_url?: string;
  deadline?: string;
  schedule?: string;
  delay_minutes?: number;
  plugins?: string[];
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

function GoalProposalItem({ proposal, workspaceId, topicId }: { proposal: GoalProposal; workspaceId: string; topicId?: number | null }) {
  const [goalId, setGoalId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.get<{ id: number; status: string; title: string }[]>("/goals")
      .then(goals => {
        const match = goals.find(g => g.title === proposal.title);
        if (match) { setGoalId(match.id); setStatus(match.status); }
      })
      .catch(() => {});
  }, [proposal.title]);

  useEffect(() => {
    if (!goalId) return;
    const interval = setInterval(async () => {
      try {
        const g = await api.get<{ status: string }>(`/goals/${goalId}`);
        setStatus(g.status);
        if (["review", "done", "failed"].includes(g.status)) {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: goalKeys.all() });
          const execs = await api.get<{ output?: string; artifacts?: { url: string }[] }[]>(`/goals/${goalId}/executions`);
          const latest = execs[0];
          if (latest?.output) setOutput(latest.output);
          if (latest?.artifacts?.length) {
            const viewable = latest.artifacts.find(a =>
              /\.(html|svg|png|jpg|pdf)$/i.test(a.url)
            );
            if (viewable) {
              if (!latest?.output) setOutput(`http://${window.location.hostname}:8000${viewable.url}`);
              window.dispatchEvent(new CustomEvent("SuperPmAgent:navigate-browser", { detail: viewable.url }));
            }
          }
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
        ...(topicId != null ? { topic_id: topicId } : {}),
        ...(proposal.repo_url ? { repo_url: proposal.repo_url } : {}),
        ...(proposal.deadline ? { deadline: proposal.deadline } : {}),
        ...(proposal.schedule ? { schedule: proposal.schedule } : {}),
        ...(proposal.delay_minutes ? {
          delay_until: new Date(Date.now() + proposal.delay_minutes * 60000).toISOString(),
        } : {}),
        ...(proposal.plugins?.length ? { plugins: proposal.plugins } : {}),
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

  const handleOutputClick = () => {
    if (!output) return;
    const urlMatch = output.match(/https?:\/\/\S+/);
    if (urlMatch) window.dispatchEvent(new CustomEvent("SuperPmAgent:navigate-browser", { detail: urlMatch[0].replace(/^http:\/\/[^/]+/, "") }));
  };

  return (
    <div className="border border-border bg-card p-2.5 space-y-1">
      {/* Row 1: title + status */}
      <div className="flex items-center gap-2">
        <Target size={12} className="shrink-0 text-foreground/60" />
        <p className="text-xs font-medium flex-1 truncate">{proposal.title}</p>
        {statusInfo ? (
          status === "review" ? (
            <span className="flex items-center gap-1 shrink-0">
              <Button size="sm" className="text-[10px] h-5 px-2" onClick={() => {
                api.post(`/goals/${goalId}/review`, { action: "approve" }).then(() => { setStatus("done"); queryClient.invalidateQueries({ queryKey: goalKeys.all() }); });
              }}>
                <Check size={10} /> Accept
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-5 px-2" onClick={() => {
                api.post(`/goals/${goalId}/review`, { action: "reject" }).then(() => { setStatus("failed"); queryClient.invalidateQueries({ queryKey: goalKeys.all() }); });
              }}>
                Reject
              </Button>
            </span>
          ) : (
          <span className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${statusInfo.color}`}>
            {status === "doing" && <Loader2 size={10} className="animate-spin" />}
            {status === "done" && <Check size={10} />}
            {statusInfo.label}
          </span>
          )
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
      {/* Row 2: params */}
      {(proposal.repo_url || proposal.plugins?.length) && !status && (
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          {proposal.repo_url && (
            <span className="border border-border px-1.5 py-0.5 bg-muted/30">{proposal.repo_url}</span>
          )}
          {proposal.plugins?.map(p => (
            <span key={p} className="border border-border px-1.5 py-0.5 bg-muted/30">{p}</span>
          ))}
          {proposal.schedule && (
            <span className="border border-border px-1.5 py-0.5 bg-muted/30">every {proposal.schedule}h</span>
          )}
        </div>
      )}
      {/* Row 3: result summary (with inline links) */}
      {output && (
        <p className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer hover:text-foreground"
           onClick={handleOutputClick}>
          {output}
        </p>
      )}
    </div>
  );
}

export function GoalProposalCards({ proposals, topicId }: { proposals: GoalProposal[]; topicId?: number | null }) {
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
        <GoalProposalItem key={idx} proposal={p} workspaceId={workspaceId} topicId={topicId} />
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
