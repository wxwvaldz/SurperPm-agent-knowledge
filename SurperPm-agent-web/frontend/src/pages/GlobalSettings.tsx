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
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
        <Text as="h2" className="text-sm font-bold">Settings</Text>
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col">
        <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-all rounded-sm ${
              activeTab === tab.id
                ? "bg-primary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "general" && (
          <div className="space-y-6">
            <SshKeyDisplay />
            <GeneralTab />
            <ReposManager />
            <AIModelConfig />
            <ResetSection />
          </div>
        )}
        {activeTab === "secrets" && <SecretsManager />}
        {activeTab === "learning" && <LearningSourcesTab />}
        {activeTab === "mcp" && <MCPTab workspaceId={defaultWsId} />}
        {activeTab === "skill" && <SkillsTab workspaceId={defaultWsId} />}
        {activeTab === "plugin" && <PluginsTab />}
        {activeTab === "team" && <TeamContent />}
      </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery(globalConfigOptions());

  const [knowledgeRepo, setKnowledgeRepo] = useState("");
  const isLocked = !!config?.knowledge_repo_url;

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
                  Knowledge repo URL is locked after initial setup.
                </p>
              )}
            </div>

            {updateMutation.isError && (
              <p className="text-xs text-destructive">
                Save failed: {(updateMutation.error as Error).message}
              </p>
            )}
            {updateMutation.isSuccess && (
              <p className="text-xs text-green-600">Saved</p>
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

    </div>
  );
}

function ResetSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const resetMut = useMutation({
    mutationFn: () => api.delete("/global-config"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: globalConfigKeys.all() }); refresh(); navigate("/login"); },
  });
  if (!user?.is_founder) return null;
  return (
    <Card>
      <Card.Header><Card.Title>Reinitialize</Card.Title></Card.Header>
      <Card.Content>
        <p className="text-sm text-muted-foreground mb-3">
          Clear all config and delete local knowledge clone. Next login will reinitialize. Irreversible.
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
              {resetMut.isPending ? "Resetting..." : "Confirm Reset"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>Reinitialize</Button>
        )}
      </Card.Content>
    </Card>
  );
}
