import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, Loader2, RotateCcw,
  Ban, Eye, Pause, Play, Timer, Trash2, MessagesSquare, Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../lib/api";
import { goalKeys } from "../../lib/queries/goals";
import { executionListOptions, executionKeys } from "../../lib/queries/executions";
import { useExecutionStore } from "../../lib/stores/execution";
import type { Goal } from "../../lib/schemas/goal";
import type { Execution } from "../../lib/schemas/execution";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";
import { Dialog } from "@/components/retroui/Dialog";
import { Text } from "@/components/retroui/Text";

/* ─── helpers ─── */

const statusCfg: Record<string, { icon: typeof Clock; label: string; borderL: string; bar: string; iconColor: string; badgeVariant: string }> = {
  scheduled: { icon: Timer,    label: "Scheduled",    borderL: "border-l-orange-400", bar: "bg-orange-400", iconColor: "text-orange-600", badgeVariant: "timeout" },
  todo:   { icon: Clock,       label: "To Do",       borderL: "border-l-blue-400",   bar: "bg-blue-400",   iconColor: "text-blue-600",   badgeVariant: "todo" },
  doing:  { icon: Loader2,     label: "In Progress",  borderL: "border-l-yellow-400", bar: "bg-yellow-400", iconColor: "text-yellow-600", badgeVariant: "running" },
  review: { icon: Eye,         label: "Review",       borderL: "border-l-purple-400", bar: "bg-purple-400", iconColor: "text-purple-600", badgeVariant: "review" },
  done:   { icon: CheckCircle, label: "Done",         borderL: "border-l-green-400",  bar: "bg-green-400",  iconColor: "text-green-600",  badgeVariant: "success" },
  failed: { icon: XCircle,     label: "Failed",       borderL: "border-l-red-400",    bar: "bg-red-400",    iconColor: "text-red-600",    badgeVariant: "failed" },
};

interface GoalCardProps { goal: Goal }

export function GoalCard({ goal }: GoalCardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── optimistic local state ── */
  const [localExecId, setLocalExecId] = useState<string | null>(null);
  const [localPaused, setLocalPaused] = useState<boolean | null>(null);

  const cfg = statusCfg[goal.status] ?? statusCfg.todo;
  const Icon = cfg.icon;

  const progress = useExecutionStore((s) => s.progress);
  // Only trust progress from the global store if it belongs to this goal.
  // Otherwise stale data from a different goal can cause cross-goal 404s.
  const progressExecId = progress?.goal_id === goal.id ? progress.execution_id : undefined;
  const execId = progressExecId ?? localExecId;

  /* ── executions query (background only, not gating buttons) ── */
  const { data: executions = [], isLoading: execsLoading } = useQuery({
    ...executionListOptions(goal.id),
    enabled: goal.status === "doing",
  });

  const runningExecution = executions.find(e => e.status === "pending" || e.status === "running" || e.status === "paused");
  const finalExecId = execId ?? runningExecution?.id;
  const isExecuting = goal.status === "doing" && !!finalExecId;
  // Stuck "doing" goal — no in-flight execution after query settled
  const isStuckDoing = goal.status === "doing" && !execsLoading && !isExecuting;
  // Check paused: local optimistic > live progress > DB-persisted status
  const dbPaused = runningExecution?.status === "paused";
  const isPaused = localPaused ?? ((progress?.goal_id === goal.id && progress?.paused === true) || dbPaused);

  /* ── cache helpers ── */
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    queryClient.invalidateQueries({ queryKey: executionKeys.all(goal.id) });
  }, [queryClient, goal.id]);

  // Prefer live WebSocket progress; fall back to DB-persisted token count
  // (updated by polling) so tokens stay visible during pause/resume.
  const displayTokens: number | undefined =
    (progress?.goal_id === goal.id ? progress?.token_used : undefined) ?? runningExecution?.token_used ?? undefined;

  /* ── mutations with optimistic updates ── */

  const execListKey = executionKeys.list(goal.id);

  const executeMutation = useMutation({
    mutationFn: () => api.post(`/goals/${goal.id}/execute`) as Promise<{ execution_id: string }>,
    onMutate: () => {
      // Optimistic: show doing state immediately
      setLocalExecId("pending"); // placeholder — real ID comes from onSuccess
    },
    onSuccess: (data: { execution_id?: string }) => {
      if (data?.execution_id) setLocalExecId(data.execution_id);
      invalidate();
    },
    onError: () => setLocalExecId(null),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goal.id}/executions/${id}/pause`),
    onMutate: () => {
      setLocalPaused(true);
      // Optimistically update the execution in the query cache so the
      // UI switches immediately — before the refetch from invalidate()
      // completes.
      const prev = queryClient.getQueryData<Execution[]>(execListKey);
      if (prev) {
        queryClient.setQueryData(
          execListKey,
          prev.map((e) =>
            String(e.id) === String(finalExecId)
              ? { ...e, status: "paused" as const }
              : e,
          ),
        );
      }
    },
    onError: (_err, _vars, _ctx) => {
      setLocalPaused(null);
      // Revert optimistic cache update on error
      queryClient.invalidateQueries({ queryKey: execListKey });
    },
    onSuccess: () => {
      const prog = useExecutionStore.getState().progress;
      if (prog) useExecutionStore.getState().updateProgress({ ...prog, paused: true });
      invalidate();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goal.id}/executions/${id}/resume`),
    onMutate: () => {
      setLocalPaused(false);
      // Optimistically update the execution in the query cache so the
      // UI switches immediately — before the refetch from invalidate()
      // completes.
      const prev = queryClient.getQueryData<Execution[]>(execListKey);
      if (prev) {
        queryClient.setQueryData(
          execListKey,
          prev.map((e) =>
            String(e.id) === String(finalExecId)
              ? { ...e, status: "running" as const }
              : e,
          ),
        );
      }
    },
    onError: (_err, _vars, _ctx) => {
      setLocalPaused(null);
      // Revert optimistic cache update on error
      queryClient.invalidateQueries({ queryKey: execListKey });
    },
    onSuccess: () => {
      const prog = useExecutionStore.getState().progress;
      if (prog) useExecutionStore.getState().updateProgress({ ...prog, paused: false });
      invalidate();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goal.id}/executions/${id}/cancel`),
    onMutate: () => {
      setLocalExecId(null);
      // Clear streaming progress immediately — the backend now updates DB
      // on cancel so the next refetch will show "failed" status.
      useExecutionStore.getState().clearProgress();
    },
    onSuccess: () => invalidate(),
    onError: () => setLocalExecId(null),
  });

  const reviewMutation = useMutation({
    mutationFn: (action: string) => api.post(`/goals/${goal.id}/review`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/goals/${goal.id}`),
    onSuccess: () => {
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });

  return (
    <>
      {isExecuting && !isPaused ? (
        <motion.div
          animate={{ boxShadow: ["3px 3px 0 0 #000", "3px 3px 0 0 rgba(250,204,21,0.7)", "3px 3px 0 0 #000"] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`border border-border bg-card cursor-pointer transition-all overflow-hidden ${cfg.borderL} border-l-4`}
          onClick={() => navigate(`/goals/${goal.id}/execute`)}
        >
          <CardContent {...{ goal, cfg, Icon, isExecuting, isPaused, isStuckDoing, displayTokens, finalExecId,
            executeMutation, pauseMutation, resumeMutation, cancelMutation, reviewMutation,
            setConfirmDelete }} />
        </motion.div>
      ) : (
        <div
          className={`border border-border bg-card cursor-pointer transition-all overflow-hidden ${cfg.borderL} border-l-4`}
          onClick={() => navigate(`/goals/${goal.id}/execute`)}
        >
          <CardContent {...{ goal, cfg, Icon, isExecuting, isPaused, isStuckDoing, displayTokens, finalExecId,
            executeMutation, pauseMutation, resumeMutation, cancelMutation, reviewMutation,
            setConfirmDelete }} />
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Dialog.Content size="sm">
          <Dialog.Header><Text as="h3" className="text-sm font-bold">Delete Goal</Text></Dialog.Header>
          <div className="p-4 space-y-4">
            <p className="text-sm text-foreground/70">
              Delete "{goal.title}"? This removes the goal and its execution history and cannot be undone.
            </p>
            {deleteMutation.isError && <p className="text-xs text-red-600">Failed to delete. Try again.</p>}
            <Dialog.Footer>
              <Dialog.Close render={<Button type="button" variant="outline">Cancel</Button>} />
              <Button type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </Dialog.Footer>
          </div>
        </Dialog.Content>
      </Dialog>
    </>
  );
}

/* ─── card body (avoid duplication) ─── */

function CardContent({ goal, cfg, Icon, isExecuting, isPaused, isStuckDoing, displayTokens, finalExecId,
  executeMutation, pauseMutation, resumeMutation, cancelMutation, reviewMutation, setConfirmDelete,
}: any) {
  const navigate = useNavigate();
  return (
    <>
      <div className={`h-1 w-full ${cfg.bar}`} />
      <div className="p-2">
        <div className="flex items-start gap-1.5">
          <Icon size={14} className={`mt-0.5 shrink-0 ${cfg.iconColor} ${isExecuting && !isPaused ? "animate-spin" : ""}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="text-xs font-bold truncate">{goal.title}</p>
              {goal.status !== "doing" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  className="shrink-0 p-1 text-foreground/30 hover:text-destructive transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {goal.description && <p className="text-[10px] text-foreground/60 mt-0.5 line-clamp-1">{goal.description}</p>}
          </div>
        </div>

        {isExecuting && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              {displayTokens != null ? (
                <span className="text-foreground/60">
                  Tokens: <span className="font-bold tabular-nums text-foreground">{displayTokens.toLocaleString()}</span>
                  {goal.token_budget && <> / <span className="font-bold tabular-nums text-foreground">{goal.token_budget.toLocaleString()}</span></>}
                </span>
              ) : (
                <span className="text-foreground/40 italic">Waiting for first token…</span>
              )}
              {isPaused && <Badge size="sm" variant="outline">PAUSED</Badge>}
              {goal.token_budget && displayTokens != null && <span className="font-bold tabular-nums text-foreground">{Math.round((displayTokens / goal.token_budget) * 100)}%</span>}
            </div>
            {goal.token_budget && displayTokens != null && (
              <div className="h-2 w-full border border-border bg-background">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (displayTokens / goal.token_budget) * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
          {isStuckDoing && (
            <Button size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending} className="flex-1">
              <Play size={14} /> {executeMutation.isPending ? "..." : "Re-run"}
            </Button>
          )}

          {(goal.status === "todo" || goal.status === "scheduled" || goal.status === "failed") && (
            <>
              <Button size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending} className="flex-1">
                {goal.status === "failed" ? <RotateCcw size={14} /> : <Play size={14} />}
                {executeMutation.isPending ? "..." : goal.status === "failed" ? "Retry" : "Execute"}
              </Button>
              {goal.schedule && (
                <Button size="sm" variant="outline" onClick={async () => {
                  try { await api.post(`/goals/recipes/from-goal/${goal.id}`); } catch { /* already shared */ }
                }} title="Share as recipe">
                  <Upload size={12} />
                </Button>
              )}
            </>
          )}

          {goal.status === "doing" && !isStuckDoing && (
            <>
              {isPaused ? (
                <Button size="sm" variant="outline" onClick={() => finalExecId && resumeMutation.mutate(finalExecId)} disabled={!finalExecId || resumeMutation.isPending} className="flex-1">
                  <Play size={14} /> {resumeMutation.isPending ? "..." : "Resume"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => finalExecId && pauseMutation.mutate(finalExecId)} disabled={!finalExecId || pauseMutation.isPending} className="flex-1">
                  <Pause size={14} /> {pauseMutation.isPending ? "..." : "Pause"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => finalExecId && cancelMutation.mutate(finalExecId)} disabled={!finalExecId || cancelMutation.isPending} className="flex-1">
                <Ban size={14} /> {cancelMutation.isPending ? "..." : "Cancel"}
              </Button>
            </>
          )}

          {goal.status === "review" && <>
            <Button size="sm" onClick={() => reviewMutation.mutate("approve")} disabled={reviewMutation.isPending} className="flex-1 text-xs">
              <CheckCircle size={12} /> {reviewMutation.isPending ? "..." : "Accept"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate("reject")} disabled={reviewMutation.isPending} className="flex-1 text-xs">
              <XCircle size={12} /> {reviewMutation.isPending ? "..." : "Reject"}
            </Button>
          </>}

          {(goal.status === "done" || goal.status === "failed") && (
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const topicName = `Goal: ${goal.title.slice(0, 36)}`;
                const t = await api.post<{ id: number }>("/topics", { name: topicName });
                const msg = `Let's discuss goal "${goal.title}" (status: ${goal.status}).${goal.description ? `\n\nDescription: ${goal.description}` : ""}`;
                await api.post("/discussions", { role: "user", content: msg, topic_id: t.id });
                navigate(`/?topic=${t.id}`);
              } catch { /* stay on current page */ }
            }} className="flex-1 text-xs">
              <MessagesSquare size={12} /> Discuss
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
