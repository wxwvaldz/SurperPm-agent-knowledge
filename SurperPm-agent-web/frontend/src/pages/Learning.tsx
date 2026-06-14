import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Button } from "@/components/retroui/Button";
import { Select } from "@/components/retroui/Select";
import { useState } from "react";
import { Pin, Archive, Sparkles, RefreshCw } from "lucide-react";

interface Learning {
  slug: string;
  title: string;
  category: string;
  source_type: string;
  importance: number;
  confidence: number;
  score: number;
  pinned: boolean;
  archived: boolean;
  created: string;
  tags: string;
  body: string;
  access_count: number;
}

const CATEGORY_COLORS: Record<string, "default" | "outline" | "solid" | "surface"> = {
  decision: "solid",
  pattern: "surface",
  mistake: "outline",
  insight: "default",
  external: "default",
};

export function LearningRecords() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["learnings", category, showArchived],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (showArchived) params.set("archived", "true");
      const qs = params.toString();
      return api.get<Learning[]>(`/learnings${qs ? `?${qs}` : ""}`);
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ slug, pinned }: { slug: string; pinned: boolean }) =>
      api.patch(`/learnings/${slug}/pin`, { pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learnings"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ slug, archived }: { slug: string; archived: boolean }) =>
      api.patch(`/learnings/${slug}/archive`, { archived }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learnings"] }),
  });

  const distillMutation = useMutation({
    mutationFn: () => api.post("/learnings/distill", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["learnings"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <Select.Trigger className="w-32">
            <Select.Value placeholder="Category" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All</Select.Item>
            <Select.Item value="decision">Decision</Select.Item>
            <Select.Item value="pattern">Pattern</Select.Item>
            <Select.Item value="mistake">Lesson</Select.Item>
            <Select.Item value="insight">Insight</Select.Item>
            <Select.Item value="external">External</Select.Item>
          </Select.Content>
        </Select>

        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          {showArchived ? "Archived" : "Active"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => distillMutation.mutate()}
          disabled={distillMutation.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${distillMutation.isPending ? "animate-spin" : ""}`} />
          Distill
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
          Loading...
        </div>
      )}

      {error && (
        <Card className="max-w-lg">
          <Card.Content>
            <p className="text-sm text-destructive py-4">
              Load failed: {(error as Error).message}
            </p>
          </Card.Content>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card className="max-w-lg">
          <Card.Content>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {showArchived
                  ? "No archived entries."
                  : "No entries yet. Click \"Distill\" to extract knowledge from executions and external sources."}
              </p>
            </div>
          </Card.Content>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 max-w-3xl">
          {data.map((item) => (
            <Card key={item.slug}>
              <Card.Header>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.pinned && <Pin className="h-3.5 w-3.5 text-foreground shrink-0" />}
                    <Card.Title className="text-sm truncate">{item.title}</Card.Title>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={CATEGORY_COLORS[item.category] || "default"}>
                      {item.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card.Header>
              <Card.Content>
                <p className="text-sm whitespace-pre-wrap mb-3">{item.body}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{item.source_type}</span>
                    {item.created && (
                      <span>{new Date(item.created).toLocaleDateString()}</span>
                    )}
                    <span>{item.access_count} views</span>
                    {item.tags && <span>{item.tags}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pinMutation.mutate({ slug: item.slug, pinned: !item.pinned })}
                      title={item.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={`h-3 w-3 ${item.pinned ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate({ slug: item.slug, archived: !item.archived })}
                      title={item.archived ? "Restore" : "Archive"}
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
