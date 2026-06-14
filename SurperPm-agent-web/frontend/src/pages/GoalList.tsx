import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check, BookOpen, Play } from "lucide-react";
import { goalListOptions } from "@/lib/queries/goals";
import { KanbanBoard } from "@/components/goals/kanban-board";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { Text } from "@/components/retroui/Text";
import { Input } from "@/components/retroui/Input";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";
import { WSProvider } from "@/providers/ws-provider";
import { api } from "@/lib/api";
import {
  standaloneTopicListOptions,
  standaloneTopicKeys,
} from "@/lib/queries/topics-standalone";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import type { Topic } from "@/lib/schemas/topic";


export default function GoalListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTopicId, setActiveTopicId] = useState<number | undefined>(undefined);
  const [showRecipes, setShowRecipes] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const urlTopicConsumed = useRef(false);

  const queryClient = useQueryClient();
  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const wsId = workspaces[0]?.id ?? "";
  const { data: topics = [] } = useQuery({
    ...standaloneTopicListOptions(),
    enabled: !!wsId,
  });
  const { data: goals = [] } = useQuery(goalListOptions(activeTopicId));

  useEffect(() => {
    if (urlTopicConsumed.current || topics.length === 0) return;
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      const id = Number(topicParam);
      if (topics.some((t) => t.id === id)) {
        setActiveTopicId(id);
        urlTopicConsumed.current = true;
        setSearchParams({}, { replace: true });
      }
    }
  }, [topics, searchParams, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post("/topics", { name }) as Promise<Topic>,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
      setCreatingTopic(false);
      setNewTopicName("");
      setActiveTopicId(created.id);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/topics/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/topics/${id}`),
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: standaloneTopicKeys.all() });
      if (activeTopicId === id) setActiveTopicId(undefined);
    },
  });

  const handleCreateSubmit = () => {
    const name = newTopicName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  const handleRenameSubmit = (id: number) => {
    const name = editName.trim();
    if (!name) return;
    renameMutation.mutate({ id, name });
  };

  const chipBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-head font-bold transition-all cursor-pointer select-none";
  const chipActive = `${chipBase} bg-primary`;
  const chipInactive = `${chipBase} bg-background hover:bg-muted`;

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
        <Text as="h2" className="text-sm font-bold">Goal</Text>
        <div className="flex-1" />
        <CreateGoalDialog defaultTopicId={activeTopicId} />
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          className={activeTopicId === undefined ? chipActive : chipInactive}
          onClick={() => setActiveTopicId(undefined)}
        >
          All
        </button>

        {topics.map((t) =>
          editingId === t.id ? (
            <span key={t.id} className="inline-flex items-center gap-1">
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(t.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 w-32 text-xs"
                autoFocus
              />
              <button onClick={() => handleRenameSubmit(t.id)} className="p-0.5 hover:text-primary">
                <Check size={12} />
              </button>
              <button onClick={() => setEditingId(null)} className="p-0.5 hover:text-destructive">
                <X size={12} />
              </button>
            </span>
          ) : (
            <span key={t.id} className="group inline-flex items-center gap-0">
              <button
                className={activeTopicId === t.id ? chipActive : chipInactive}
                onClick={() => setActiveTopicId(t.id)}
              >
                {t.name}
              </button>
              <span className="hidden group-hover:inline-flex items-center gap-0.5 ml-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(t.id); setEditName(t.name); }}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(t.id); }}
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            </span>
          )
        )}

        {creatingTopic ? (
          <span className="inline-flex items-center gap-1">
            <Input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSubmit();
                if (e.key === "Escape") { setCreatingTopic(false); setNewTopicName(""); }
              }}
              placeholder="Topic name"
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <button onClick={handleCreateSubmit} disabled={createMutation.isPending} className="p-0.5 hover:text-primary">
              <Check size={12} />
            </button>
            <button onClick={() => { setCreatingTopic(false); setNewTopicName(""); }} className="p-0.5 hover:text-destructive">
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            className={chipInactive}
            onClick={() => { setNewTopicName(new Date().toISOString().slice(0, 10)); setCreatingTopic(true); }}
          >
            <Plus size={12} />
          </button>
        )}

        <button
          className={showRecipes ? chipActive : chipInactive}
          onClick={() => { setShowRecipes(!showRecipes); if (!showRecipes) setActiveTopicId(undefined); }}
        >
          <BookOpen size={12} /> Recipes
        </button>
      </div>

      {showRecipes ? (
        <RecipesView />
      ) : goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="border border-border p-5 bg-card">
            <Plus size={48} className="opacity-20" />
          </div>
          <p className="text-sm font-head">No goals yet</p>
          <p className="text-xs text-foreground/40">Create your first goal to get started</p>
          <CreateGoalDialog defaultTopicId={activeTopicId} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <KanbanBoard search="" topicId={activeTopicId} />
        </div>
      )}
      </div>
    </div>
  );

  return wsId ? <WSProvider workspaceId={wsId}>{content}</WSProvider> : content;
}


interface Recipe {
  title: string;
  description: string;
  schedule: string;
  plugins: string[];
  shared_by: string;
  shared_at: string;
}

function RecipesView() {
  const queryClient = useQueryClient();
  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ["goals", "recipes"],
    queryFn: () => api.get("/goals/recipes"),
  });

  const importMut = useMutation({
    mutationFn: (title: string) => api.post(`/goals/recipes/import/${encodeURIComponent(title)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (title: string) => api.delete(`/goals/recipes/${encodeURIComponent(title)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", "recipes"] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading recipes...</p>;

  if (recipes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <BookOpen size={48} className="opacity-20" />
        <p className="text-sm font-head">No shared recipes yet</p>
        <p className="text-xs text-foreground/40">
          Share a scheduled goal as a recipe — it syncs to the knowledge repo for the whole team.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-2">
      <p className="text-xs text-muted-foreground">
        Shared scheduled tasks — synced via knowledge repo. Import to create a local goal.
      </p>
      {recipes.map((r) => (
        <div key={r.title} className="border border-border bg-card p-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{r.title}</p>
            {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <Badge size="sm" variant="outline">every {r.schedule}h</Badge>
              {r.plugins.map((p) => <Badge key={p} size="sm" variant="surface">{p}</Badge>)}
              <span className="text-[10px] text-muted-foreground">by {r.shared_by}</span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" onClick={() => importMut.mutate(r.title)} disabled={importMut.isPending}>
              <Play size={12} /> Use
            </Button>
            <Button size="sm" variant="outline" onClick={() => removeMut.mutate(r.title)} disabled={removeMut.isPending}>
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
