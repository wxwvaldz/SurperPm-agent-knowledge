import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileText, Save, X } from "lucide-react";
import { api } from "@/lib/api";
import { skillKeys } from "@/lib/queries/skills";
import { useSkillStore } from "@/lib/stores/skill";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Textarea } from "@/components/retroui/Textarea";
import type { SkillDetail, SkillFile } from "@/lib/schemas/skill";

interface SkillFileEditorProps {
  skill: SkillDetail;
  workspaceId: string;
}

export function SkillFileEditor({ skill, workspaceId }: SkillFileEditorProps) {
  const selectedFilePath = useSkillStore((s) => s.selectedFilePath);
  const editingFilePath = useSkillStore((s) => s.editingFilePath);
  const startEdit = useSkillStore((s) => s.startEdit);
  const cancelEdit = useSkillStore((s) => s.cancelEdit);

  if (!selectedFilePath) {
    return <EmptyEditorState />;
  }

  const file = skill.files.find((f) => f.path === selectedFilePath);
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-muted-foreground">文件不存在</Text>
      </div>
    );
  }

  const isEditing = editingFilePath === selectedFilePath;

  if (isEditing) {
    return <FileEditView file={file} skillId={skill.id} workspaceId={workspaceId} onCancel={cancelEdit} />;
  }

  return <FileReadView file={file} onEdit={() => startEdit(file.path)} workspaceId={workspaceId} skillId={skill.id} />;
}

function EmptyEditorState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <div className="w-16 h-16 border-2 border-border bg-background flex items-center justify-center shadow-[3px_3px_0_0_#000]">
        <FileText size={32} className="text-primary" />
      </div>
      <p className="font-head text-sm">选择文件查看内容</p>
      <p className="text-xs text-center max-w-xs">
        从左侧文件列表选择一个文件，内容将在此处显示。
      </p>
    </div>
  );
}

function FileReadView({ file, onEdit, workspaceId }: { file: SkillFile; onEdit: () => void; workspaceId: string; skillId: number }) {
  const [validateResult, setValidateResult] = useState<{ valid: boolean; errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] } | null>(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/workspaces/${workspaceId}/skills/validate`, { content: file.content });
      return res as { valid: boolean; errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] };
    },
    onSuccess: (data) => setValidateResult(data),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-border shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} />
          <span className="text-xs font-mono">{file.path}</span>
          {file.is_main && (
            <span className="text-[10px] bg-primary px-1.5 py-0.5 text-primary-foreground">SKILL.md</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
          >
            <CheckCircle size={14} className="mr-1" />
            {validateMutation.isPending ? "校验中..." : "校验"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            编辑
          </Button>
        </div>
      </div>
      {/* Validation result */}
      {validateResult && (
        <div className={`px-4 py-2 text-xs border-b-2 ${validateResult.valid ? "border-green-600 bg-green-50 text-green-800" : "border-destructive bg-red-50 text-destructive"}`}>
          <p className="font-medium">{validateResult.valid ? "✅ 校验通过" : "❌ 校验未通过"}</p>
          {validateResult.errors.map((e, i) => (
            <p key={`err-${i}`} className="mt-0.5">• [{e.field}] {e.message}</p>
          ))}
          {validateResult.warnings.map((w, i) => (
            <p key={`warn-${i}`} className="mt-0.5 text-muted-foreground">⚠ [{w.field}] {w.message}</p>
          ))}
        </div>
      )}
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm font-mono whitespace-pre-wrap break-words">{file.content}</pre>
      </div>
    </div>
  );
}

function FileEditView({
  file,
  skillId,
  workspaceId,
  onCancel,
}: {
  file: SkillFile;
  skillId: number;
  workspaceId: string;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(file.content);
  const [validateResult, setValidateResult] = useState<{ valid: boolean; errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] } | null>(null);
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/workspaces/${workspaceId}/skills/validate`, { content });
      return res as { valid: boolean; errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] };
    },
    onSuccess: (data) => setValidateResult(data),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/workspaces/${workspaceId}/skills/${skillId}/files/${file.id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: skillKeys.detail(workspaceId, skillId),
      });
      onCancel();
    },
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveMutation.mutate();
      }
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [saveMutation, onCancel]
  );

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-border shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} />
          <span className="text-xs font-mono">{file.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
          >
            <CheckCircle size={14} className="mr-1" />
            {validateMutation.isPending ? "校验中..." : "校验"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X size={14} />
            <span className="ml-1">取消</span>
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={14} />
            <span className="ml-1">{saveMutation.isPending ? "保存中..." : "保存"}</span>
          </Button>
        </div>
      </div>
      {/* Validation result */}
      {validateResult && (
        <div className={`px-4 py-2 text-xs border-b-2 ${validateResult.valid ? "border-green-600 bg-green-50 text-green-800" : "border-destructive bg-red-50 text-destructive"}`}>
          <p className="font-medium">{validateResult.valid ? "✅ 校验通过" : "❌ 校验未通过"}</p>
          {validateResult.errors.map((e, i) => (
            <p key={`err-${i}`} className="mt-0.5">• [{e.field}] {e.message}</p>
          ))}
          {validateResult.warnings.map((w, i) => (
            <p key={`warn-${i}`} className="mt-0.5 text-muted-foreground">⚠ [{w.field}] {w.message}</p>
          ))}
        </div>
      )}
      {/* Editor */}
      <div className="flex-1 overflow-hidden p-4">
        <Textarea
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          className="h-full font-mono text-sm resize-none"
          placeholder="输入文件内容..."
        />
      </div>
    </div>
  );
}
