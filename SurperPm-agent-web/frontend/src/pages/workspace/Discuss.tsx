import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { discussionListOptions } from "../../lib/queries/discussions";
import { MessageList } from "../../components/discuss/message-list";
import { MessageInput } from "../../components/discuss/message-input";

export default function DiscussPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return <DiscussContent workspaceId={slug} />;
}

function DiscussContent({ workspaceId }: { workspaceId: string }) {
  const { data: discussions = [], isLoading } = useQuery(
    discussionListOptions(workspaceId)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Discuss</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with your AI agent about workspace goals
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading messages...
        </div>
      ) : (
        <MessageList discussions={discussions} />
      )}

      <MessageInput workspaceId={workspaceId} />
    </div>
  );
}
