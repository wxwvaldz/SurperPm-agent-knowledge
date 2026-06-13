import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { api } from "../../lib/api";
import { discussionKeys } from "../../lib/queries/discussions";

interface MessageInputProps {
  workspaceId: string;
}

export function MessageInput({ workspaceId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/discussions`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discussionKeys.all(workspaceId) });
      setContent("");
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
    <div className="border-t border-border p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex gap-2 items-end"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Ctrl+Enter to send)"
          rows={2}
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMutation.isPending}
          className="shrink-0 p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
      {sendMutation.isError && (
        <p className="text-xs text-red-500 mt-1">
          Failed to send: {sendMutation.error.message}
        </p>
      )}
    </div>
  );
}
