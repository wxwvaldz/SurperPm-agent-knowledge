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
import { useConfirm } from "@/components/business/confirm-dialog";

export default function SkillDetailPage() {
  const { skillId: slug } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm: confirmDelete } = useConfirm();

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
        <Text className="text-muted-foreground">Loading...</Text>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Text className="text-muted-foreground">Skill not found</Text>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="w-6 h-6 bg-primary flex items-center justify-center rounded-sm">
            <Wrench size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <Text as="h2" className="text-sm font-bold truncate">
              {skill.name}
            </Text>
            {skill.description && (
              <p className="text-[10px] text-muted-foreground truncate">
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
                {skill.files.length} files
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (await confirmDelete({ message: "Delete this skill?", destructive: true })) {
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

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {skill.body ? (
          <MarkdownContent content={skill.body} />
        ) : (
          <Text className="text-muted-foreground">No content</Text>
        )}
      </div>
    </div>
  );
}
