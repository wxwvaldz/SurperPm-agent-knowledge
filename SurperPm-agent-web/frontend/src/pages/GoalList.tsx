import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { goalListOptions } from "@/lib/queries/goals";
import { KanbanBoard } from "@/components/goals/kanban-board";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { Text } from "@/components/retroui/Text";
import { Input } from "@/components/retroui/Input";
import { api } from "@/lib/api";
import {
  goalGroupListOptions,
  goalGroupKeys,
} from "@/lib/queries/goal-groups";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import type { GoalGroup } from "@/lib/schemas/goal-group";


export default function GoalListPage() {
  const [activeGroupId, setActiveGroupId] = useState<number | undefined>(undefined);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const queryClient = useQueryClient();
  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const wsId = workspaces[0]?.id ?? "";
  const { data: groups = [] } = useQuery({
    ...goalGroupListOptions(wsId),
    enabled: !!wsId,
  });
  const { data: goals = [] } = useQuery(goalListOptions(activeGroupId));



  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post("/goal-groups", { workspace_id: wsId, name }) as Promise<GoalGroup>,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: goalGroupKeys.all() });
      setCreatingGroup(false);
      setNewGroupName("");
      setActiveGroupId(created.id);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/goal-groups/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalGroupKeys.all() });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/goal-groups/${id}`),
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: goalGroupKeys.all() });
      if (activeGroupId === id) setActiveGroupId(undefined);
    },
  });

  const handleCreateSubmit = () => {
    const name = newGroupName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  const handleRenameSubmit = (id: number) => {
    const name = editName.trim();
    if (!name) return;
    renameMutation.mutate({ id, name });
  };

  const chipBase =
    "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer select-none rounded-sm";
  const chipActive = `${chipBase} bg-primary text-foreground`;
  const chipInactive = `${chipBase} text-muted-foreground hover:bg-muted hover:text-foreground`;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
        <Text as="h2" className="text-sm font-bold">Goal</Text>
        <div className="flex-1" />
        <CreateGoalDialog defaultGroupId={activeGroupId} />
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col">
        {/* group tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          className={activeGroupId === undefined ? chipActive : chipInactive}
          onClick={() => setActiveGroupId(undefined)}
        >
          All
        </button>

        {groups.map((g) =>
          editingId === g.id ? (
            <span key={g.id} className="inline-flex items-center gap-1">
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(g.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 w-32 text-xs"
                autoFocus
              />
              <button
                onClick={() => handleRenameSubmit(g.id)}
                className="p-0.5 hover:text-primary"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="p-0.5 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            <span key={g.id} className="group inline-flex items-center gap-0">
              <button
                className={activeGroupId === g.id ? chipActive : chipInactive}
                onClick={() => setActiveGroupId(g.id)}
              >
                {g.name}
              </button>
              <span className="hidden group-hover:inline-flex items-center gap-0.5 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(g.id);
                    setEditName(g.name);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(g.id);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={10} />
                </button>
              </span>
            </span>
          )
        )}

        {creatingGroup ? (
          <span className="inline-flex items-center gap-1">
            <Input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSubmit();
                if (e.key === "Escape") {
                  setCreatingGroup(false);
                  setNewGroupName("");
                }
              }}
              placeholder="Group name"
              className="h-7 w-32 text-xs"
              autoFocus
            />
            <button
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
              className="p-0.5 hover:text-primary"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => {
                setCreatingGroup(false);
                setNewGroupName("");
              }}
              className="p-0.5 hover:text-destructive"
            >
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            className={chipInactive}
            onClick={() => setCreatingGroup(true)}
          >
            <Plus size={12} />
          </button>
        )}
      </div>


      {/* board */}
      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="border-2 border-border p-5 shadow-[4px_4px_0_0_#000] bg-card">
            <Plus size={48} className="opacity-20" />
          </div>
          <p className="text-sm font-head">No goals yet</p>
          <p className="text-xs text-foreground/40">Create your first goal to get started</p>
          <CreateGoalDialog defaultGroupId={activeGroupId} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <KanbanBoard search="" groupId={activeGroupId} />
        </div>
      )}
      </div>
    </div>
  );
}
