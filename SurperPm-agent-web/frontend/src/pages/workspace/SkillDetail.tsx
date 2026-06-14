import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { skillDetailOptions, skillKeys } from "@/lib/queries/skills";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";
import { MarkdownContent } from "@/components/business/markdown-content";

export default function SkillDetailPage() {
  const { skillId: slug } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const workspaceId = workspaces[0]?.id ?? "";

  const { data: skill, isLoading, error } = useQuery(
    skillDetailOptions(workspaceId, slug ?? ""),
  );

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${workspaceId}/skills/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillKeys.list(workspaceId),
      });
      navigate("/settings");
    },
  });

  if (!workspaceId || !slug) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-muted-foreground">加载中...</Text>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Text className="text-muted-foreground">技能不存在</Text>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b-2 border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            <Wrench size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <Text as="h2" className="text-xl truncate">
              {skill.name}
            </Text>
            {skill.description && (
              <p className="text-sm text-muted-foreground truncate">
                {skill.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {skill.tags && (
              <Badge variant="surface" size="sm">
                {skill.tags}
              </Badge>
            )}
            {skill.files && (
              <Badge variant="default" size="sm">
                {skill.files.length} 文件
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("确定要删除这个技能吗？")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {skill.body ? (
          <MarkdownContent content={skill.body} />
        ) : (
          <Text className="text-muted-foreground">暂无内容</Text>
        )}
      </div>
    </div>
  );
}
