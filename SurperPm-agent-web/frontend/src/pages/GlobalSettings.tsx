import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { globalConfigOptions, globalConfigKeys } from "@/lib/queries/global-config";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { SshKeyDisplay } from "@/components/settings/ssh-key-display";
import { SecretsManager } from "@/components/settings/secrets-manager";
import { AIModelConfig } from "@/components/settings/ai-model-config";
import { ReposManager } from "@/components/settings/repos-manager";
import { LearningSourcesTab } from "@/components/settings/learning-sources";
import { TeamContent } from "@/pages/workspace/Team";
import { SkillsTab, MCPTab, PluginsTab } from "@/pages/workspace/Plugins";
import { Text } from "@/components/retroui/Text";
import { Card } from "@/components/retroui/Card";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Button } from "@/components/retroui/Button";

type Tab = "general" | "secrets" | "learning" | "mcp" | "skill" | "plugin" | "team";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "secrets", label: "Secrets" },
  { id: "learning", label: "Learning" },
  { id: "mcp", label: "MCP" },
  { id: "skill", label: "Skill" },
  { id: "plugin", label: "Plugin" },
  { id: "team", label: "Team" },
];

export default function GlobalSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const defaultWsId = workspaces[0]?.id ?? "";

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b-2 border-border bg-card/50 shrink-0">
        <Text as="h2" className="text-2xl">Settings</Text>
      </div>

      <div className="flex-1 min-h-0 p-6 flex flex-col">
        <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-2 transition-all ${
              activeTab === tab.id
                ? "border-border bg-primary shadow-[3px_3px_0_0_#000] text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:shadow-[2px_2px_0_0_#000]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "general" && (
          <div className="space-y-6">
            <GeneralTab />
            <ReposManager />
            <SshKeyDisplay />
            <AIModelConfig />
          </div>
        )}
        {activeTab === "secrets" && <SecretsManager />}
        {activeTab === "learning" && <LearningSourcesTab />}
        {activeTab === "mcp" && <MCPTab workspaceId={defaultWsId} />}
        {activeTab === "skill" && <SkillsTab workspaceId={defaultWsId} />}
        {activeTab === "plugin" && <PluginsTab />}
        {activeTab === "team" && <TeamPanel />}
      </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { data: config } = useQuery(globalConfigOptions());

  const [knowledgeRepo, setKnowledgeRepo] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const isLocked = !!config?.knowledge_repo_url;

  const resetMutation = useMutation({
    mutationFn: () => api.delete("/global-config"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalConfigKeys.all() });
      refresh();
      navigate("/login");
    },
  });

  useEffect(() => {
    if (config?.knowledge_repo_url) {
      setKnowledgeRepo(config.knowledge_repo_url);
    }
  }, [config?.knowledge_repo_url]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.patch("/global-config", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalConfigKeys.all() });
    },
  });

  const handleSave = () => {
    if (!knowledgeRepo.trim() || isLocked) return;
    updateMutation.mutate({ knowledge_repo_url: knowledgeRepo.trim() });
  };

  return (
    <div className="max-w-lg">
      <Card>
        <Card.Header>
          <Card.Title>Knowledge Repository</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div>
              <Label htmlFor="knowledge-repo" className="mb-1.5 block text-xs">
                Knowledge Repository URL
              </Label>
              <Input
                id="knowledge-repo"
                value={knowledgeRepo}
                onChange={(e) => setKnowledgeRepo(e.target.value)}
                placeholder="https://github.com/org/knowledge"
                disabled={isLocked}
                className="font-mono text-sm"
              />
              {isLocked && (
                <p className="text-xs text-muted-foreground mt-1">
                  知识库 URL 绑定后不可修改。
                </p>
              )}
            </div>

            {updateMutation.isError && (
              <p className="text-xs text-destructive">
                保存失败: {(updateMutation.error as Error).message}
              </p>
            )}
            {updateMutation.isSuccess && (
              <p className="text-xs text-green-600">已保存</p>
            )}

            <Button
              onClick={handleSave}
              disabled={isLocked || !knowledgeRepo.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card.Content>
      </Card>

      {user?.is_founder && (
        <Card className="mt-6">
          <Card.Header>
            <Card.Title>重新初始化</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                清空全局配置（绑定仓库、SSH、AI、密钥)并删除本地知识库克隆，
                下次登录将重新运行首次初始化流程。此操作不可撤销。
              </p>

              {resetMutation.isError && (
                <p className="text-xs text-destructive">
                  重置失败: {(resetMutation.error as Error).message}
                </p>
              )}

              {confirmingReset ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => resetMutation.mutate()}
                    disabled={resetMutation.isPending}
                  >
                    {resetMutation.isPending ? "重置中..." : "确认重置"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmingReset(false)}
                    disabled={resetMutation.isPending}
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setConfirmingReset(true)}>
                  重新初始化
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}

function TeamPanel() {
  const [sub, setSub] = useState<"team" | "profile" | "agent">("team");
  return (
    <div>
      <div className="flex border-2 border-border mb-4">
        {(
          [
            { id: "team", label: "团队画像" },
            { id: "profile", label: "个人画像" },
            { id: "agent", label: "Agent" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              sub === t.id
                ? "bg-primary text-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            } ${t.id !== "team" ? "border-l-2 border-border" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === "team" && <TeamContent />}
      {sub === "profile" && <ProfileContent />}
      {sub === "agent" && <AgentsTab />}
    </div>
  );
}

function ProfileContent() {
  const { user } = useAuth();
  return (
    <div className="max-w-lg">
      <Card>
        <Card.Content>
          <div className="flex items-center gap-3 mb-3">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-10 h-10 border-2 border-border" />
            ) : (
              <div className="w-10 h-10 border-2 border-border bg-muted flex items-center justify-center text-sm font-bold">
                {(user?.username ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{user?.username ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user?.repo ?? "—"}</p>
            </div>
          </div>
          <a href="/profile" className="text-xs text-primary hover:underline">
            编辑个人画像 →
          </a>
        </Card.Content>
      </Card>
    </div>
  );
}

interface Agent {
  name: string;
  cc_api_url: string;
  cc_api_token?: string | null;
  project: string;
  description?: string | null;
  status: string;
}

function AgentsTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [project, setProject] = useState("default");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<Agent[]>("/agents"),
  });

  const registerMut = useMutation({
    mutationFn: () =>
      api.post("/agents", {
        name,
        cc_api_url: url,
        cc_api_token: token || null,
        project,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setName("");
      setUrl("");
      setToken("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (n: string) => api.delete(`/agents/${n}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const pingMut = useMutation({
    mutationFn: (n: string) =>
      api.get<{ ok: boolean }>(`/agents/${n}/ping`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Text as="h3" className="text-base mb-1">远程 Agent</Text>
        <p className="text-xs text-muted-foreground mb-4">
          注册团队成员机器作为 Goal 执行资源（通过 cc-connect）
        </p>
      </div>

      <Card>
        <Card.Content className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-mac" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">cc-connect API URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.100:8765" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Token（可选）</Label>
              <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Project</Label>
              <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="default" />
            </div>
          </div>
          <Button size="sm" onClick={() => registerMut.mutate()} disabled={!name.trim() || !url.trim() || registerMut.isPending}>
            {registerMut.isPending ? "注册中..." : "注册 Agent"}
          </Button>
        </Card.Content>
      </Card>

      {isLoading && <Text className="text-muted-foreground">加载中...</Text>}
      {!isLoading && agents.length === 0 && (
        <Text className="text-muted-foreground text-sm">还没有注册远程 Agent。</Text>
      )}
      {agents.map((a) => (
        <Card key={a.name}>
          <Card.Content>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.name}</span>
                  <Badge variant={a.status === "online" ? "solid" : "outline"} size="sm">{a.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.cc_api_url}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => pingMut.mutate(a.name)}>Ping</Button>
                <Button variant="outline" size="sm" onClick={() => deleteMut.mutate(a.name)}>删除</Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
