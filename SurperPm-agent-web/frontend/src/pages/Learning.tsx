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
            <Select.Value placeholder="分类" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">全部</Select.Item>
            <Select.Item value="decision">决策</Select.Item>
            <Select.Item value="pattern">模式</Select.Item>
            <Select.Item value="mistake">教训</Select.Item>
            <Select.Item value="insight">洞察</Select.Item>
            <Select.Item value="external">外部</Select.Item>
          </Select.Content>
        </Select>

        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          {showArchived ? "已归档" : "活跃"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => distillMutation.mutate()}
          disabled={distillMutation.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${distillMutation.isPending ? "animate-spin" : ""}`} />
          蒸馏
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          加载中...
        </div>
      )}

      {error && (
        <Card className="max-w-lg">
          <Card.Content>
            <p className="text-sm text-destructive py-4">
              加载失败: {(error as Error).message}
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
                  ? "没有已归档的知识条目。"
                  : "暂无知识条目。点击「蒸馏」从执行记录和外部源中提取知识。"}
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
                    <span>访问 {item.access_count}次</span>
                    {item.tags && <span>{item.tags}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pinMutation.mutate({ slug: item.slug, pinned: !item.pinned })}
                      title={item.pinned ? "取消置顶" : "置顶"}
                    >
                      <Pin className={`h-3 w-3 ${item.pinned ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate({ slug: item.slug, archived: !item.archived })}
                      title={item.archived ? "恢复" : "归档"}
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
