import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { discussionListOptions } from "../../lib/queries/discussions";
import { MessageList } from "../../components/discuss/message-list";
import { MessageInput } from "../../components/discuss/message-input";
import { Text } from "@/components/retroui/Text";
import { MessageSquare } from "lucide-react";

export default function DiscussPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return <DiscussContent workspaceId={slug} />;
}

function DiscussContent({ workspaceId }: { workspaceId: string }) {
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const { data: discussions = [], isLoading } = useQuery(
    discussionListOptions(workspaceId)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b-2 border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-border bg-primary flex items-center justify-center shadow-[3px_3px_0_0_#000]">
            <MessageSquare size={20} />
          </div>
          <div>
            <Text as="h2" className="text-xl">Discussion</Text>
            <p className="text-sm text-muted-foreground">
              与 AI 助手对话，使用 @goal-N 触发目标执行
            </p>
          </div>
          <div className="ml-auto text-xs text-muted-foreground border-2 border-border px-2 py-1 font-bold bg-background">
            {discussions.length} 条评论
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent mr-2" />
          加载中...
        </div>
      ) : (
        <MessageList discussions={discussions} onReply={setReplyTo} />
      )}

      {/* Comment input */}
      <MessageInput
        workspaceId={workspaceId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
