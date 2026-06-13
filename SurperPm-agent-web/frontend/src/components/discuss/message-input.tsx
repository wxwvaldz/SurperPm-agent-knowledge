import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { api } from "../../lib/api";
import { discussionKeys } from "../../lib/queries/discussions";
import { Button } from "@/components/retroui/Button";

interface MessageInputProps {
  workspaceId: string;
  replyTo?: number | null;
  onCancelReply?: () => void;
}

export function MessageInput({ workspaceId, replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/discussions`, {
        content,
        ...(replyTo ? { parent_id: replyTo } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.all(workspaceId) });
      setContent("");
      onCancelReply?.();
    },
  });

  function handleSubmit() {
    if (!content.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t-2 border-border p-4 bg-card">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground max-w-2xl">
          <span>回复 #{replyTo}</span>
          <button onClick={onCancelReply} className="hover:text-foreground transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="max-w-2xl"
      >
        <div className="border-2 border-border bg-background shadow-[2px_2px_0_0_#000] focus-within:shadow-[3px_3px_0_0_#000] transition-shadow">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="留下评论... 使用 @goal-N 触发目标执行"
            rows={3}
            className="w-full px-4 py-3 text-sm resize-none focus:outline-none bg-transparent"
          />
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              支持 Markdown · <kbd className="px-1 py-0.5 border border-border bg-muted text-[10px] font-mono">⌘ Enter</kbd> 发送
            </p>
            <Button
              type="submit"
              disabled={!content.trim() || sendMutation.isPending}
              className="text-xs px-3 py-1"
            >
              {sendMutation.isPending ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <Send size={12} />
                  发送
                </>
              )}
            </Button>
          </div>
        </div>
        {sendMutation.isError && (
          <p className="text-xs text-destructive mt-2 font-medium">
            发送失败: {sendMutation.error.message}
          </p>
        )}
      </form>
    </div>
  );
}
