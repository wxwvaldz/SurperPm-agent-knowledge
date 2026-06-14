import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Label } from "@/components/retroui/Label";
import { Alert } from "@/components/retroui/Alert";

interface AIConfig {
  base_url: string;
  api_key_masked: string;
  api_key_set: boolean;
  model: string;
}

const aiConfigQueryKey = ["config", "ai"];

export function AIModelConfig() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<AIConfig>({
    queryKey: aiConfigQueryKey,
    queryFn: () => api.get<AIConfig>("/config/ai"),
  });

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setBaseUrl(data.base_url);
      setApiKey("");
      setModel(data.model);
      setDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api.patch("/config/ai", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiConfigQueryKey });
      setDirty(false);
    },
  });

  const handleSave = () => {
    const body: Record<string, string> = {};
    if (data && baseUrl !== data.base_url) body.base_url = baseUrl;
    if (apiKey) body.api_key = apiKey;
    if (data && model !== data.model) body.model = model;
    if (Object.keys(body).length > 0) {
      saveMutation.mutate(body);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Loading AI config...</div>
    );
  }

  return (
    <div className="max-w-lg space-y-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Model Configuration</p>
      <div className="border border-border p-3 space-y-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="ai-base-url" className="mb-1.5 block text-xs">
              Base URL
            </Label>
            <Input
              id="ai-base-url"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setDirty(true);
              }}
              placeholder="https://api.anthropic.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for default Anthropic endpoint.
            </p>
          </div>

          <div>
            <Label htmlFor="ai-api-key" className="mb-1.5 block text-xs">
              API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="ai-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setDirty(true);
                }}
                placeholder={
                  data?.api_key_set
                    ? data.api_key_masked
                    : "sk-..."
                }
                className="font-mono text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2 border border-border bg-background hover:bg-muted transition-all"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {data?.api_key_set && !apiKey && (
              <p className="text-xs text-muted-foreground mt-1">
                Key is set. Enter a new value to replace it.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="ai-model" className="mb-1.5 block text-xs">
              Model Name
            </Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setDirty(true);
              }}
              placeholder="claude-sonnet-4-20260614"
              className="font-mono text-sm"
            />
          </div>

          {saveMutation.isError && (
            <Alert status="warning">
              <Alert.Description>
                {(saveMutation.error as Error).message}
              </Alert.Description>
            </Alert>
          )}
          {saveMutation.isSuccess && !dirty && (
            <p className="text-xs text-green-600">Saved</p>
          )}

          <Button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
