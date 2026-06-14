import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secretListOptions, secretKeys } from "@/lib/queries/secrets";
import { api } from "@/lib/api";
import type { Secret } from "@/lib/schemas/secret";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Select } from "@/components/retroui/Select";
import { Badge } from "@/components/retroui/Badge";
import { Alert } from "@/components/retroui/Alert";

const CATEGORIES = ["env", "token", "server", "other"] as const;

export function SecretsManager() {
  const queryClient = useQueryClient();
  const { data: secrets = [], isLoading } = useQuery(secretListOptions());

  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<string>("env");

  const addMutation = useMutation({
    mutationFn: (body: { key: string; value: string; category: string }) =>
      api.post("/global-config/secrets", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all() });
      setNewKey("");
      setNewValue("");
      setNewCategory("env");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (secretId: number) =>
      api.delete(`/global-config/secrets/${secretId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.all() });
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
        <Button
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Secret"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="p-3 border border-border bg-muted/30 space-y-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="secret-key" className="mb-1.5 block text-xs">
                Key
              </Label>
              <Input
                id="secret-key"
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="SECRET_NAME"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="secret-value" className="mb-1.5 block text-xs">
                Value
              </Label>
              <Input
                id="secret-value"
                type="password"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="secret-value"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Category</Label>
              <Select value={newCategory} onValueChange={(v) => v && setNewCategory(v)}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {CATEGORIES.map((cat) => (
                    <Select.Item key={cat} value={cat}>
                      {cat}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Save Secret"}
          </Button>
          {addMutation.isError && (
            <Alert status="warning">
              <Alert.Description>
                {(addMutation.error as Error).message}
              </Alert.Description>
            </Alert>
          )}
        </form>
      )}

      {secrets.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          No secrets yet. Add API keys, tokens, or server credentials.
        </p>
      ) : (
        <div className="border border-border divide-y divide-border">
          {secrets.map((secret) => (
            <SecretRow
              key={secret.id}
              secret={secret}
              onDelete={() => deleteMutation.mutate(secret.id)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: secretKeys.all() })}
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
  onDelete: () => void;
  onUpdate: () => void;
  isDeleting: boolean;
}

function SecretRow({ secret, onDelete, onUpdate, isDeleting }: SecretRowProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const handleReveal = async () => {
    if (revealed !== null) { setRevealed(null); return; }
    setRevealing(true);
    try {
      const res = await api.get<{ value: string }>(`/global-config/secrets/${secret.id}/reveal`);
      setRevealed(res.value);
    } catch { setRevealed("[error]"); }
    finally { setRevealing(false); }
  };

  const handleSaveEdit = async () => {
    await api.patch(`/global-config/secrets/${secret.id}`, { key: secret.key, value: editValue, category: secret.category });
    setEditing(false);
    setEditValue("");
    setRevealed(null);
    onUpdate();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-mono text-xs font-medium shrink-0">{secret.key}</span>
        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="New value" type="password" className="flex-1 text-xs h-7" />
        <Button size="sm" onClick={handleSaveEdit} disabled={!editValue.trim()}>Save</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-medium">{secret.key}</span>
        <Badge size="sm">{secret.category}</Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          {revealed !== null ? revealed : "***"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={handleReveal} disabled={revealing} className="p-1 hover:bg-muted transition-colors" title={revealed !== null ? "Hide" : "Show"}>
          {revealing ? <span className="inline-block w-3 h-3 animate-spin rounded-full border border-foreground border-t-transparent" /> : revealed !== null ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button onClick={() => setEditing(true)} className="p-1 hover:bg-muted transition-colors" title="Edit">
          <Pencil size={12} />
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive border-destructive hover:bg-destructive/10"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
