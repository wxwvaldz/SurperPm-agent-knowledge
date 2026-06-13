import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { skillKeys } from "@/lib/queries/skills";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Textarea } from "@/components/retroui/Textarea";
import { Dialog } from "@/components/retroui/Dialog";
import { Tabs } from "@/components/retroui/Tab";
import { Text } from "@/components/retroui/Text";
import type { ChangeEvent } from "react";

interface CreateSkillDialogProps {
  workspaceId: string;
}

export function CreateSkillDialog({ workspaceId }: CreateSkillDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("manual");
  const queryClient = useQueryClient();

  // Manual form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [skillMd, setSkillMd] = useState("");

  // Import form state
  const [importUrl, setImportUrl] = useState("");

  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      await api.post(`/workspaces/${workspaceId}/skills`, {
        name,
        description: description || null,
        skill_md_content: skillMd || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(workspaceId) });
      resetForm();
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      await api.post(`/workspaces/${workspaceId}/skills/import`, { url: importUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.list(workspaceId) });
      resetForm();
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  function resetForm() {
    setName("");
    setDescription("");
    setSkillMd("");
    setImportUrl("");
    setError(null);
  }

  function handleSubmit() {
    if (tab === "manual") {
      if (!name.trim()) {
        setError("请输入技能名称");
        return;
      }
      createMutation.mutate();
    } else {
      if (!importUrl.trim()) {
        setError("请输入 GitHub URL");
        return;
      }
      importMutation.mutate();
    }
  }

  const isPending = createMutation.isPending || importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <Dialog.Trigger>
        <Button>+ 新建 Skill</Button>
      </Dialog.Trigger>
      <Dialog.Content size="md">
        <Dialog.Header>
          <Text as="h3" className="text-base font-bold">新建 Skill</Text>
        </Dialog.Header>

        <div className="p-4 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger value="manual">手动创建</Tabs.Trigger>
              <Tabs.Trigger value="import">从 GitHub 导入</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="manual">
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">名称 *</label>
                  <Input
                    placeholder="例如: code-review-skill"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">描述</label>
                  <Textarea
                    placeholder="技能的简要描述..."
                    value={description}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">SKILL.md 内容</label>
                  <Textarea
                    placeholder="# My Skill&#10;&#10;描述技能的用途和使用方法..."
                    value={skillMd}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSkillMd(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="import">
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">GitHub URL</label>
                  <Input
                    placeholder="https://github.com/owner/repo/tree/main/.claude/skills/my-skill"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  支持导入 GitHub 仓库或子目录中的技能文件。需要工作区配置 GITHUB_TOKEN。
                </p>
              </div>
            </Tabs.Content>
          </Tabs>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <Dialog.Footer>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "创建中..." : tab === "manual" ? "创建 Skill" : "导入 Skill"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
