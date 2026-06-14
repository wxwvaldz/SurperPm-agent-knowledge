import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Badge } from "@/components/retroui/Badge";

interface ServerConfig {
  server: {
    port: number;
    database_url: string;
    frontend_url: string;
    session_secret_set: boolean;
    encryption_key_set: boolean;
  };
  ai: {
    base_url: string;
    api_key_set: boolean;
    model: string;
  };
  github: {
    oauth_client_id: string;
    oauth_configured: boolean;
    oauth_redirect_uri: string;
  };
  paths: {
    plugin_repo: string;
    knowledge_repo: string;
  };
}

const serverConfigQueryKey = ["config", "server"];

export function ServerConfigPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<ServerConfig>({
    queryKey: serverConfigQueryKey,
    queryFn: () => api.get<ServerConfig>("/config/server"),
  });

  const [pluginRepo, setPluginRepo] = useState("");
  const [knowledgeRepo, setKnowledgeRepo] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setPluginRepo(data.paths.plugin_repo);
      setKnowledgeRepo(data.paths.knowledge_repo);
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch("/config/server", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serverConfigQueryKey });
      setDirty(false);
      setTimeout(() => window.location.reload(), 800);
    },
  });

  const handleSave = () => {
    const paths: Record<string, string> = {};
    if (data && pluginRepo !== data.paths.plugin_repo) paths.plugin_repo = pluginRepo;
    if (data && knowledgeRepo !== data.paths.knowledge_repo) paths.knowledge_repo = knowledgeRepo;
    if (Object.keys(paths).length > 0) {
      saveMutation.mutate({ paths });
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading server config...</div>;
  }

  return (
    <div className="max-w-lg space-y-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Server Configuration
      </p>
      <div className="border border-border p-3 space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={data?.server.session_secret_set ? "solid" : "outline"}>
            Session Secret {data?.server.session_secret_set ? "OK" : "Missing"}
          </Badge>
          <Badge variant={data?.server.encryption_key_set ? "solid" : "outline"}>
            Encryption Key {data?.server.encryption_key_set ? "OK" : "Missing"}
          </Badge>
          <Badge variant={data?.github.oauth_configured ? "solid" : "outline"}>
            GitHub OAuth {data?.github.oauth_configured ? "OK" : "Not Set"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Config file: <code className="bg-muted px-1">backend/config.json</code> (auto-generated on first run)
        </p>

        <div>
          <Label htmlFor="plugin-repo" className="mb-1.5 block text-xs">
            Plugin Repo Path
          </Label>
          <Input
            id="plugin-repo"
            value={pluginRepo}
            onChange={(e) => { setPluginRepo(e.target.value); setDirty(true); }}
            placeholder="/path/to/SuperPmAgent-plugins"
            className="font-mono text-sm"
          />
        </div>

        <div>
          <Label htmlFor="knowledge-repo-path" className="mb-1.5 block text-xs">
            Knowledge Repo Path (local clone)
          </Label>
          <Input
            id="knowledge-repo-path"
            value={knowledgeRepo}
            onChange={(e) => { setKnowledgeRepo(e.target.value); setDirty(true); }}
            placeholder="/tmp/SuperPmAgent-repos/knowledge"
            className="font-mono text-sm"
          />
        </div>

        {saveMutation.isError && (
          <p className="text-xs text-destructive">
            {(saveMutation.error as Error).message}
          </p>
        )}
        {saveMutation.isSuccess && !dirty && (
          <p className="text-xs text-green-600">Saved — reloading...</p>
        )}

        <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
