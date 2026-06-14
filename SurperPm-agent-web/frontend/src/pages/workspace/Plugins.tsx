import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/business/toast";
import { useConfirm } from "@/components/business/confirm-dialog";
import {
  Search, Plug, Cpu, Wrench, Plus, Trash2, RefreshCw,
  Power, PowerOff, CheckCircle, AlertTriangle, Check, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Text } from "@/components/retroui/Text";
import { Textarea } from "@/components/retroui/Textarea";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import { Dialog } from "@/components/retroui/Dialog";
import { Label } from "@/components/retroui/Label";
import { skillKeys, skillListOptions } from "@/lib/queries/skills";
import { mcpListOptions, mcpKeys } from "@/lib/queries/mcp";
import { pluginInstalledOptions, pluginKeys } from "@/lib/queries/plugins";
import { SkillCard } from "@/components/skills/skill-card";
import { CreateSkillDialog } from "@/components/skills/create-skill-dialog";



export function SkillsTab({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();

  if (!workspaceId) {
    return (
      <Card className="max-w-lg">
        <Card.Content>
          <p className="text-sm text-muted-foreground py-4">
            No workspace configured. Please set up a workspace first.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <CreateSkillDialog workspaceId={workspaceId} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <SkillsGrid
          workspaceId={workspaceId}
          onSelect={(slug) => navigate(`/skills/${slug}`)}
        />
      </div>
    </div>
  );
}

function SkillsGrid({
  workspaceId,
  onSelect,
}: {
  workspaceId: string;
  onSelect: (slug: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: skills, isLoading } = useQuery(skillListOptions(workspaceId));
  const { confirm } = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: (slug: string) =>
      api.delete(`/workspaces/${workspaceId}/skills/${slug}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillKeys.list(workspaceId),
      });
    },
  });

  async function handleDelete(skill: { slug: string; name: string }) {
    if (await confirm({ message: `Delete "${skill.name}"?`, confirmLabel: "Delete" })) {
      deleteMutation.mutate(skill.slug);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Text className="text-muted-foreground">Loading...</Text>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Text className="text-muted-foreground">No skills yet</Text>
        <p className="text-sm text-muted-foreground">Create or import your first skill above</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {skills.map((skill) => (
        <SkillCard key={skill.slug} skill={skill} onClick={() => onSelect(skill.slug)} onDelete={handleDelete} />
      ))}
    </div>
  );
}

// ── MCP Tab ─────────────────────────────────────────────────────

export function MCPTab({ workspaceId }: { workspaceId: string }) {
  const { toast: mcpToast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string; status?: number }>>({});
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { confirm: mcpConfirm } = useConfirm();

  const { data: servers = [], isLoading } = useQuery(mcpListOptions(workspaceId));

  const importMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/mcp/import`, { json_text: jsonText }),
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.list(workspaceId) });
      const d = data as { created: number };
      mcpToast(`Imported ${d.created} MCP server(s)`, "success");
      setAddOpen(false);
      setJsonText("");
      setJsonError(null);
    },
    onError: (e: Error) => setJsonError(e.message),
  });

  const updateJsonMutation = useMutation({
    mutationFn: (name: string) => api.patch(`/workspaces/${workspaceId}/mcp/servers/${name}`, { json_text: jsonText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.list(workspaceId) });
      setEditingName(null);
      setJsonText("");
      setJsonError(null);
    },
    onError: (e: Error) => setJsonError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      api.delete(`/workspaces/${workspaceId}/mcp/servers/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.list(workspaceId) });
    },
  });

  const discoverMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/mcp/discover`),
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.list(workspaceId) });
      const d = data as { discovered: number };
      mcpToast(`Discovered ${d.discovered} MCP server(s)`, "success");
    },
    onError: (e: Error) => mcpToast(`Discovery failed: ${e.message}`, "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.patch(`/workspaces/${workspaceId}/mcp/servers/${name}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.list(workspaceId) });
    },
  });

  function serverToJson(srv: {
    name: string;
    transport: string;
    command: string | null;
    args: string | null;
    env: string | null;
    url: string | null;
    headers: string | null;
  }): string {
    const cfg: Record<string, unknown> = {};
    if (srv.transport !== "stdio") cfg.type = srv.transport;
    if (srv.command) cfg.command = srv.command;
    if (srv.args) {
      try { cfg.args = JSON.parse(srv.args); } catch { cfg.args = srv.args; }
    }
    if (srv.env) {
      try { cfg.env = JSON.parse(srv.env); } catch { cfg.env = srv.env; }
    }
    if (srv.url) cfg.url = srv.url;
    if (srv.headers) {
      try { cfg.headers = JSON.parse(srv.headers); } catch { cfg.headers = srv.headers; }
    }
    return JSON.stringify({ mcpServers: { [srv.name]: cfg } }, null, 2);
  }

  function openAdd() {
    setEditingName(null);
    setJsonText("");
    setJsonError(null);
    setAddOpen(true);
  }

  function openEdit(srv: { name: string; transport: string; command: string | null; args: any; env: any; url: string | null; headers: any; enabled: boolean }) {
    setEditingName(srv.name);
    setJsonText(serverToJson(srv));
    setJsonError(null);
  }

  async function testConnection(srvName: string) {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/mcp/servers/${srvName}/test`) as { ok: boolean; error?: string; status?: number };
      setTestResults((prev) => ({ ...prev, [srvName]: res }));
    } catch {
      setTestResults((prev) => ({ ...prev, [srvName]: { ok: false, error: "Request failed" } }));
    }
  }

  if (!workspaceId) {
    return (
      <Card className="max-w-lg">
        <Card.Content>
          <p className="text-sm text-muted-foreground py-4">
            No workspace configured. Please set up a workspace first.
          </p>
        </Card.Content>
      </Card>
    );
  }

  if (isLoading) {
    return <Text className="text-muted-foreground">Loading...</Text>;
  }

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Configure MCP servers to give AI access to external tools
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => discoverMutation.mutate()}
            disabled={discoverMutation.isPending}
          >
            <Search size={14} className="mr-1" />
            {discoverMutation.isPending ? "Scanning..." : "Discover"}
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            Add Server
          </Button>
        </div>
      </div>

      {servers.length === 0 ? (
        <Card className="max-w-lg">
          <Card.Content>
            <p className="text-sm text-muted-foreground py-4">
              No MCP servers configured. Click "Add Server" to paste .mcp.json config, or "Discover" to scan installed plugins.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {servers.map((srv) => {
            const testR = testResults[srv.name] ?? null;
            const isDiscovered = !!srv.plugin_source;
            return (
              <div
                key={srv.name}
                className="border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Cpu size={18} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{srv.name}</p>
                        <Badge variant="surface" size="sm">{srv.transport}</Badge>
                        {isDiscovered && (
                          <Badge variant="default" size="sm" className="text-xs">
                            {srv.plugin_source}
                          </Badge>
                        )}
                        {srv.enabled
                          ? <CheckCircle size={12} className="text-green-600" />
                          : <AlertTriangle size={12} className="text-muted-foreground" />
                        }
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        {srv.transport === "stdio"
                          ? srv.command ?? "(no command)"
                          : srv.url ?? "(no url)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => toggleMutation.mutate({ name: srv.name, enabled: !srv.enabled })}
                          title={srv.enabled ? "Disable" : "Enable"}
                        >
                          {srv.enabled ? <PowerOff size={14} /> : <Power size={14} />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => testConnection(srv.name)}
                          title="Test Connection"
                        >
                          <RefreshCw size={14} />
                        </Button>
                        {!isDiscovered && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(srv)} title="Edit">
                              <Wrench size={14} />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={async () => { if (await mcpConfirm({ message: `Delete ${srv.name}?`, confirmLabel: "Delete" })) deleteMutation.mutate(srv.name); }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                  </div>
                </div>
                {testR && (
                  <div className={`mt-2 text-xs p-2 border ${testR.ok ? "border-green-600 bg-green-50 text-green-800" : "border-destructive bg-red-50 text-destructive"}`}>
                    {testR.ok
                      ? `Connected${testR.status != null ? ` (HTTP ${testR.status})` : ""}`
                      : `Failed: ${testR.error}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog — JSON only */}
      <Dialog open={addOpen || editingName != null} onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditingName(null); setJsonText(""); setJsonError(null); } }}>
        <Dialog.Content size="md">
          <Dialog.Header>
            <Text as="h3" className="text-sm font-bold">
              {editingName != null ? "Edit MCP Server" : "Add MCP Server"}
            </Text>
          </Dialog.Header>

          <div className="p-4 space-y-3">
            <div>
              <Label htmlFor="mcp-json" className="mb-1 block text-xs">
                Paste .mcp.json config
              </Label>
              <Textarea
                id="mcp-json"
                value={jsonText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setJsonText(e.target.value); setJsonError(null); }}
                placeholder={`{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "my-mcp-server"],\n      "env": { "API_KEY": "..." }\n    }\n  }\n}`}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts full .mcp.json format or a single server config. Multiple servers can be imported at once.
            </p>
            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          </div>

          <Dialog.Footer>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditingName(null); setJsonText(""); setJsonError(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!jsonText.trim()) { setJsonError("Please enter JSON config"); return; }
                if (editingName != null) {
                  updateJsonMutation.mutate(editingName);
                } else {
                  importMutation.mutate();
                }
              }}
              disabled={!jsonText.trim() || importMutation.isPending || updateJsonMutation.isPending}
            >
              {importMutation.isPending || updateJsonMutation.isPending ? "Saving..." : editingName != null ? "Update" : "Import"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}

// ── Plugins Tab ──────────────────────────────────────────────────

export function PluginsTab() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const { data: installed = [], isLoading: loadingInstalled } = useQuery(pluginInstalledOptions());

  const uninstallMutation = useMutation({
    mutationFn: (name: string) => api.post(`/plugins/${name}/uninstall`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pluginKeys.all() }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, enable }: { name: string; enable: boolean }) =>
      api.post(`/plugins/${name}/${enable ? "enable" : "disable"}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pluginKeys.all() }),
  });

  // ── Sync (multi-repo) ──────────────────────────────────────

  type SyncResult = { repo_url: string; ok: boolean; commit?: string; synced?: string[]; error?: string };
  type SyncConfig = { repo_urls: string[]; last_synced: string | null; results: SyncResult[] };
  const { data: syncConfig } = useQuery({
    queryKey: [...pluginKeys.all(), "sync-config"],
    queryFn: () => api.get<SyncConfig>("/plugins/sync-repo/config"),
  });

  const [newUrl, setNewUrl] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const repoUrls = syncConfig?.repo_urls ?? [];

  const saveUrls = (urls: string[]) => {
    api.post("/plugins/sync-repo/config", { repo_urls: urls })
      .then(() => queryClient.invalidateQueries({ queryKey: [...pluginKeys.all(), "sync-config"] }))
      .catch((e: Error) => toast(`Save failed: ${e.message}`, "error"));
  };

  const syncMutation = useMutation({
    mutationFn: (repo_urls?: string[] | void) =>
      api.post<{ ok: boolean; count: number; results: { ok: boolean }[] }>("/plugins/sync-repo", repo_urls ? { repo_urls } : {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pluginKeys.all() });
      const failed = data.results.filter(r => !r.ok);
      toast(failed.length ? `Synced ${data.count} plugins, ${failed.length} failed` : `Synced ${data.count} plugins`, failed.length ? "error" : "success");
    },
    onError: (e: Error) => toast(`Sync failed: ${e.message}`, "error"),
  });

  const isSyncing = syncMutation.isPending;

  return (
    <div className="flex flex-col h-full max-w-4xl">
      {/* ── Repo list ── */}
      <div className="border border-border bg-card p-2.5 mb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Plugin Repos</p>
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={isSyncing || !repoUrls.length}>
            <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
        </div>
        {repoUrls.map((url, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {editIdx === i ? (
              <>
                <input value={editUrl} onChange={e => setEditUrl(e.target.value)} className="flex-1 text-[11px] font-mono border border-border bg-background px-2 py-1 outline-none focus:border-foreground" />
                <button onClick={() => { const u = [...repoUrls]; u[i] = editUrl.trim(); saveUrls(u.filter(Boolean)); setEditIdx(null); }} className="p-1 hover:bg-muted"><Check size={11} /></button>
                <button onClick={() => setEditIdx(null)} className="p-1 hover:bg-muted"><X size={11} /></button>
              </>
            ) : (
              <>
                <Plug size={11} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-[11px] font-mono text-muted-foreground truncate">{url}</span>
                <button onClick={() => { setEditIdx(i); setEditUrl(url); }} className="p-1 hover:bg-muted" title="Edit"><Wrench size={11} /></button>
                <button onClick={() => saveUrls(repoUrls.filter((_, j) => j !== i))} className="p-1 hover:bg-muted" title="Remove"><Trash2 size={11} /></button>
              </>
            )}
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://github.com/user/plugins-repo"
            className="flex-1 text-[11px] font-mono border border-border bg-background px-2 py-1 outline-none focus:border-foreground"
            onKeyDown={e => { if (e.key === "Enter" && newUrl.trim()) { saveUrls([...repoUrls, newUrl.trim()]); setNewUrl(""); } }}
          />
          <Button variant="outline" size="sm" onClick={() => { if (newUrl.trim()) { saveUrls([...repoUrls, newUrl.trim()]); setNewUrl(""); } }} disabled={!newUrl.trim()}>Add</Button>
        </div>
        {syncConfig?.last_synced && (
          <p className="text-[10px] text-muted-foreground">
            Last synced: {new Date(syncConfig!.last_synced).toLocaleString()}
          </p>
        )}
      </div>

      {/* ── Installed ── */}
      <p className="text-xs text-muted-foreground mb-2">Installed ({installed.length})</p>
      <div className="flex-1 overflow-auto">
        {loadingInstalled ? (
          <Text className="text-muted-foreground text-sm">Loading...</Text>
        ) : installed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No plugins installed. Add repo URLs above and sync.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {installed.map((p) => (
              <div key={p.name} className="border border-border bg-card p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                    {p.enabled ? <CheckCircle size={10} className="text-green-600" /> : <AlertTriangle size={10} className="text-muted-foreground" />}
                  </div>
                  {p.description && <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ name: p.name, enable: !p.enabled })} title={p.enabled ? "Disable" : "Enable"}>
                    {p.enabled ? <PowerOff size={12} /> : <Power size={12} />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => { if (await confirm({ message: `Uninstall ${p.name}?`, confirmLabel: "Uninstall" })) uninstallMutation.mutate(p.name); }} title="Uninstall">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
