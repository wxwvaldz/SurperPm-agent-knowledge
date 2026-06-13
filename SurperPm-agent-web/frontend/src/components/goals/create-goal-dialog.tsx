import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "../../lib/api";
import { goalKeys } from "../../lib/queries/goals";

interface CreateGoalDialogProps {
  workspaceId: string;
}

export function CreateGoalDialog({ workspaceId }: CreateGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/goals`, {
      title,
      description: description || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all(workspaceId) });
      setTitle("");
      setDescription("");
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus size={16} />
        New Goal
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Goal</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              required
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
