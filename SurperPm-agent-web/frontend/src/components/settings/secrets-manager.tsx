import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secretListOptions, secretKeys } from "@/lib/queries/secrets";
import { api } from "@/lib/api";
import type { Secret } from "@/lib/schemas/secret";

interface SecretsManagerProps {
  workspaceSlug: string;
}

const CATEGORIES = ["env", "token", "other"] as const;

export function SecretsManager({ workspaceSlug }: SecretsManagerProps) {
  const queryClient = useQueryClient();
  const { data: secrets = [], isLoading } = useQuery(
    secretListOptions(workspaceSlug)
  );

  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<string>("env");

  const addMutation = useMutation({
    mutationFn: (body: { key: string; value: string; category: string }) =>
      api.post(`/workspaces/${workspaceSlug}/secrets`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: secretKeys.all(workspaceSlug),
      });
      setNewKey("");
      setNewValue("");
      setNewCategory("env");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (secretId: number) =>
      api.delete(`/workspaces/${workspaceSlug}/secrets/${secretId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: secretKeys.all(workspaceSlug),
      });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    addMutation.mutate({ key: newKey, value: newValue, category: newCategory });
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Loading secrets...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage secrets (API keys, tokens, environment variables) for this
          workspace.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showForm ? "Cancel" : "Add Secret"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="p-4 border border-border rounded-md space-y-3 bg-muted/30"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="SECRET_NAME"
                className="w-full rounded-md border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Value</label>
              <input
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="secret-value"
                className="w-full rounded-md border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {addMutation.isPending ? "Adding..." : "Save Secret"}
          </button>
          {addMutation.isError && (
            <p className="text-destructive text-xs">
              {(addMutation.error as Error).message}
            </p>
          )}
        </form>
      )}

      {secrets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No secrets configured yet. Click "Add Secret" to get started.
        </p>
      ) : (
        <div className="border border-border rounded-md divide-y divide-border">
          {secrets.map((secret) => (
            <SecretRow
              key={secret.id}
              secret={secret}
              workspaceSlug={workspaceSlug}
              onDelete={() => deleteMutation.mutate(secret.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SecretRowProps {
  secret: Secret;
  workspaceSlug: string;
  onDelete: () => void;
  isDeleting: boolean;
}

function SecretRow({
  secret,
  workspaceSlug,
  onDelete,
  isDeleting,
}: SecretRowProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const handleReveal = async () => {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await api.get<{ value: string }>(
        `/workspaces/${workspaceSlug}/secrets/${secret.id}/reveal`
      );
      setRevealed(res.value);
    } catch {
      setRevealed("[error fetching value]");
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm font-medium">{secret.key}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {secret.category}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {revealed !== null ? revealed : "***"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReveal}
          disabled={revealing}
          className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {revealing ? "..." : revealed !== null ? "Hide" : "Reveal"}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="px-2 py-1 text-xs rounded border border-destructive text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
