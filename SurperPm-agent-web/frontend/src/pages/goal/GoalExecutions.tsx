import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Pause,
  Play,
  GitBranch,
  ChevronDown,
  TerminalSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { goalKeys, goalDetailOptions } from "@/lib/queries/goals";
import { executionListOptions, executionKeys } from "@/lib/queries/executions";
import type { Execution } from "@/lib/schemas/execution";
import { useExecutionStore, type LogLine } from "@/lib/stores/execution";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";
import { Dialog } from "@/components/retroui/Dialog";
import { GoalConsole } from "@/components/goals/goal-console";

/* ─── helpers ─── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(startedAt?: string | null, finishedAt?: string | null): string | null {
  if (!startedAt) return null;
  const end = finishedAt ? new Date(finishedAt) : new Date();
  const diffSec = Math.max(0, Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const logKind: Record<string, string> = {
  thinking: "text-purple-600",
  tool_use: "text-blue-600",
  tool_result: "text-foreground/50",
  error: "text-red-600",
  text: "text-foreground",
};

function LogLine({ line }: { line: LogLine }) {
  const label = line.kind === "tool_use" && line.tool ? line.tool : line.kind;
  return (
    <div className="whitespace-pre-wrap break-words">
      <span className={`${logKind[line.kind] ?? "text-foreground"} font-bold mr-1`}>[{label}]</span>
      <span>{line.text}</span>
    </div>
  );
}

function LogPanel({ logs, autoScroll }: { logs: LogLine[]; autoScroll: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs.length, autoScroll]);
  return (
    <div
      ref={ref}
      className="border-t border-border max-h-80 overflow-auto bg-background p-3 font-mono text-xs leading-relaxed space-y-1"
    >
      {logs.map((line, i) => (
        <LogLine key={i} line={line} />
      ))}
    </div>
  );
}

/* ─── status config ─── */

const statusCfg: Record<string, { label: string; color: string; bar: string; icon: typeof Loader2; badgeVariant: string }> = {
  pending:  { label: "Pending",  color: "text-foreground/30", bar: "bg-foreground/20", icon: Clock, badgeVariant: "pending" },
  running:  { label: "Running",  color: "text-yellow-600",   bar: "bg-yellow-400", icon: Loader2, badgeVariant: "running" },
  paused:   { label: "Paused",   color: "text-blue-600",     bar: "bg-blue-400",   icon: Pause, badgeVariant: "paused" },
  success:  { label: "Success",  color: "text-green-600",    bar: "bg-green-400",  icon: CheckCircle, badgeVariant: "success" },
  failed:   { label: "Failed",   color: "text-red-600",      bar: "bg-red-400",    icon: XCircle, badgeVariant: "failed" },
  timeout:  { label: "Timeout",  color: "text-orange-600",   bar: "bg-orange-400", icon: Clock, badgeVariant: "timeout" },
};

/* ─── page ─── */

export default function GoalExecutionsPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const valid = !!goalId;
  const queryClient = useQueryClient();
  const [consoleOpen, setConsoleOpen] = useState(false);

  const { data: goal } = useQuery({ ...goalDetailOptions(goalId!), enabled: valid });
  const { data: executions = [], isLoading } = useQuery({ ...executionListOptions(goalId!), enabled: valid });
  const canRun =
    goal?.status === "todo" ||
    goal?.status === "scheduled" ||
    goal?.status === "failed" ||
    (goal?.status === "doing" && !executions.find(e => e.status === "running" || e.status === "paused"));

  useEffect(() => {
    if (!valid) return;
    useExecutionStore.getState().setActiveGoal(goalId!);
    return () => {
      useExecutionStore.getState().setActiveGoal(null);
      queryClient.removeQueries({ queryKey: executionKeys.list(goalId!) });
    };
  }, [goalId, valid, queryClient]);

  const execMutation = useMutation({
    mutationFn: () => api.post(`/goals/${goalId}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
    },
  });

  // In-flight execution: running or paused — show control buttons.
  const inFlight = executions.find(e => e.status === "running" || e.status === "paused");
  const isPaused = inFlight?.status === "paused";

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goalId}/executions/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
    },
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goalId}/executions/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${goalId}/executions/${id}/cancel`),
    onMutate: () => {
      useExecutionStore.getState().clearProgress();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: executionKeys.all(goalId) });
      queryClient.invalidateQueries({ queryKey: goalKeys.all() });
    },
  });

  if (!valid) return null;

  return (
    <div className="flex flex-col h-full p-4">
      {/* header */}
      <div className="flex items-center justify-between shrink-0 mb-3">
        <div>
          <Text as="h3" className="text-sm font-bold">Executions</Text>
          <p className="text-[10px] text-foreground/40">{executions.length} runs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConsoleOpen(true)}>
            <TerminalSquare size={14} />
            Console
          </Button>
          {inFlight ? (
            <>
              {isPaused ? (
                <Button onClick={() => resumeMutation.mutate(inFlight.id)} disabled={resumeMutation.isPending}>
                  <Play size={14} />
                  {resumeMutation.isPending ? "..." : "Resume"}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => pauseMutation.mutate(inFlight.id)} disabled={pauseMutation.isPending}>
                  <Pause size={14} />
                  {pauseMutation.isPending ? "..." : "Pause"}
                </Button>
              )}
              <Button variant="outline" onClick={() => cancelMutation.mutate(inFlight.id)} disabled={cancelMutation.isPending}>
                <Ban size={14} />
                {cancelMutation.isPending ? "..." : "Cancel"}
              </Button>
            </>
          ) : canRun ? (
            <Button onClick={() => execMutation.mutate()} disabled={execMutation.isPending}>
              <Play size={14} />
              {execMutation.isPending ? "Starting..." : "Run"}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={consoleOpen} onOpenChange={setConsoleOpen}>
        <Dialog.Content size="4xl" className="h-[80vh]">
          <Dialog.Header>
            <Text as="h3" className="text-sm font-bold">Goal #{goalId} Console</Text>
          </Dialog.Header>
          <div className="h-[calc(80vh-3rem)]">
            {consoleOpen && <GoalConsole goalId={goalId} />}
          </div>
        </Dialog.Content>
      </Dialog>
      <div className="flex-1 min-h-0 overflow-auto">
      {/* loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border border-border bg-card p-3 space-y-2 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-accent" />
                <div className="h-4 w-24 bg-accent" />
                <div className="h-3 w-16 bg-accent ml-auto" />
              </div>
              <div className="h-3 w-3/4 bg-accent" />
            </div>
          ))}
        </div>
      )}

      {/* empty */}
      {!isLoading && executions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="border border-border p-3 bg-card">
            <Play size={48} className="opacity-10" />
          </div>
          <p className="text-sm font-head text-foreground/30">No executions yet</p>
          {canRun && (
            <Button onClick={() => execMutation.mutate()} variant="outline" size="sm">
              <Play size={12} /> Run now
            </Button>
          )}
        </div>
      )}

      {/* list */}
      {!isLoading && executions.length > 0 && (
        <div className="space-y-3">
          {executions
            .filter((exec) => String(exec.goal_id) === String(goalId))
            .map((exec) => (
            <ExecutionCard key={exec.id} exec={exec} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/* ─── single execution card ─── */

function ExecutionCard({ exec }: { exec: Execution }) {
  const c = statusCfg[exec.status] ?? statusCfg.pending;
  const StatusIcon = c.icon;
  const isRunning = exec.status === "running";

  const liveLogs = useExecutionStore((s) => s.logsByExec[exec.id]);
  // Prefer live WebSocket logs while running; fall back to DB-persisted logs.
  const baseLogs: LogLine[] = isRunning
    ? (liveLogs ?? [])
    : ((exec.logs as LogLine[] | null | undefined) ?? liveLogs ?? []);
  // Always show the error line if present (even when logs are empty)
  const logs: LogLine[] = exec.error && !baseLogs.some(l => l.kind === "error")
    ? [...baseLogs, { kind: "error" as const, text: exec.error }]
    : baseLogs;

  const isFailed = exec.status === "failed" || exec.status === "timeout";
  // Always open logs for running or failed; remember user choice otherwise
  const [logOpen, setLogOpen] = useState(isRunning || isFailed);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    setLogOpen(true);
    const t = setInterval(() => tick((c) => c + 1), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  const duration = formatDuration(
    exec.started_at,
    exec.status === "paused" ? (exec.paused_at ?? exec.finished_at) : exec.finished_at,
  );

  return (
    <div className="border border-border bg-card">
      {/* top bar + header */}
      <div className={`h-1 w-full ${c.bar}`} />
      <div className="flex items-center gap-3 px-4 py-3">
        {/* status icon */}
        <StatusIcon size={16} className={`shrink-0 ${c.color} ${isRunning ? "animate-spin" : ""}`} />

        <Badge size="sm" variant={c.badgeVariant as any}>{c.label}</Badge>

        {duration && (
          <span className="text-xs text-foreground/40 font-mono tabular-nums">{duration}</span>
        )}

        {Array.isArray(exec.artifacts) && exec.artifacts.length > 0 && (
          <span className="text-[10px] text-foreground font-medium border border-border px-1.5 py-0.5 rounded-sm">
            {exec.artifacts.length} artifact{exec.artifacts.length > 1 ? "s" : ""}
          </span>
        )}
        <span className="text-xs text-foreground/40 ml-auto">{formatDate(exec.created_at)}</span>
      </div>

      {/* body */}
      {(exec.summary || exec.token_used != null || exec.branch || exec.pr_url || exec.error || (Array.isArray(exec.artifacts) && exec.artifacts.length > 0)) && (
        <div className="px-4 pb-3 space-y-2">
          {exec.summary && (
            <p className="text-sm text-foreground/70">{exec.summary}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
            {exec.token_used != null && (
              <span>
                Tokens: <span className="font-bold tabular-nums text-foreground">{exec.token_used.toLocaleString()}</span>
              </span>
            )}
            {exec.branch && (
              <span className="flex items-center gap-1">
                <GitBranch size={10} /> {exec.branch}
              </span>
            )}
            {exec.pr_url && (
              <a href={exec.pr_url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1 text-primary hover:underline font-bold">
                <ExternalLink size={10} /> PR
              </a>
            )}
            {exec.error && (
              <span className="text-destructive font-bold">{exec.error}</span>
            )}
            {Array.isArray(exec.artifacts) && exec.artifacts.length > 0 && (
              <div className="w-full pt-1">
                <p className="text-[10px] text-foreground/40 mb-1">Artifacts:</p>
                <div className="flex flex-wrap gap-1.5">
                  {exec.artifacts.map((a: { name: string; url: string }) => (
                    <a
                      key={a.url}
                      href={a.url}
                      download
                      className="text-[10px] text-foreground hover:underline font-medium px-1.5 py-0.5 border border-border bg-muted/30 rounded-sm"
                    >
                      {a.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {exec.status === "failed" && (
              <a
                href="/"
                className="flex items-center gap-1 text-primary hover:underline font-bold"
                title="Discuss this failure"
              >
                <ExternalLink size={10} /> Discuss
              </a>
            )}
          </div>
        </div>
      )}

      {/* logs toggle */}
      {(logs.length > 0 || isFailed) && (
        <>
          <button
            onClick={() => setLogOpen(!logOpen)}
            className="flex items-center gap-1.5 w-full border-t border-border px-4 py-2 text-xs font-head text-foreground/50 hover:bg-accent transition-colors cursor-pointer"
          >
            <ChevronDown size={12} className={`transition-transform ${logOpen ? "rotate-180" : ""}`} />
            Logs ({logs.length})
          </button>
          {logOpen && logs.length === 0 && isRunning && (
            <div className="border-t border-border px-4 py-3 text-xs text-foreground/40 font-mono">
              Waiting for agent output…
            </div>
          )}
          {logOpen && logs.length > 0 && (
            <LogPanel logs={logs} autoScroll={isRunning} />
          )}
        </>
      )}
    </div>
  );
}
