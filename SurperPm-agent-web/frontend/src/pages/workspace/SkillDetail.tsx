import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Globe, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { skillDetailOptions, skillKeys } from "@/lib/queries/skills";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { useSkillStore } from "@/lib/stores/skill";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";
import { SkillFileTree } from "@/components/skills/skill-file-tree";
import { SkillFileEditor } from "@/components/skills/skill-file-editor";

export default function SkillDetailPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resetStore = useSkillStore((s) => s.reset);

  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const workspaceId = workspaces[0]?.id ?? "";

  const id = Number(skillId);

  useEffect(() => {
    return () => resetStore();
  }, [resetStore]);

  const { data: skill, isLoading, error } = useQuery(
    skillDetailOptions(workspaceId, id)
  );

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${workspaceId}/skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(workspaceId) });
      navigate("/settings");
    },
  });

  if (!workspaceId || !skillId) return null;

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
        <Text className="text-muted-foreground">插件不存在</Text>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          返回列表
        </Button>
      </div>
    );
  }

  const isGithub = skill.source_type === "github_import";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b-2 border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            <ArrowLeft size={16} />
          </Button>
          <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            {isGithub ? <Globe size={18} /> : <Wrench size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <Text as="h2" className="text-xl truncate">{skill.name}</Text>
            {skill.description && (
              <p className="text-sm text-muted-foreground truncate">{skill.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="surface" size="sm">
              {isGithub ? "GitHub" : "手动"}
            </Badge>
            <Badge variant="default" size="sm">
              {skill.file_count} 文件
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("确定要删除这个插件吗？")) {
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

      {/* Two-panel: File Tree + Editor */}
      <div className="flex flex-1 min-h-0">
        {/* Left: File Tree */}
        <aside className="overflow-hidden flex flex-col bg-card border-r-2 border-border" style={{ width: "260px" }}>
          <div className="p-3 border-b border-border shrink-0">
            <p className="text-xs font-head font-bold uppercase tracking-wider text-muted-foreground">
              文件列表
            </p>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
            <SkillFileTree files={skill.files} />
          </div>
        </aside>

        {/* Center: File Viewer / Editor */}
        <main className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
          <SkillFileEditor skill={skill} workspaceId={workspaceId} />
        </main>
      </div>
    </div>
  );
}
