import { useEffect, useState, type MutableRefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { topicListOptions } from "@/lib/queries/topics";
import { GroupChat } from "@/components/discuss/group-chat";
import { Text } from "@/components/retroui/Text";

interface ChatPanelProps {
  goalId: number;
  screenshotRef?: MutableRefObject<((dataUri: string) => void) | null>;
}

export function ChatPanel({ goalId, screenshotRef }: ChatPanelProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const { data: topics = [] } = useQuery(topicListOptions(goalId));

  useEffect(() => {
    if (selectedTopicId === null && topics.length > 0) {
      const general = topics.find((t) => t.name === "general");
      setSelectedTopicId(general?.id ?? topics[0].id);
    }
  }, [topics, selectedTopicId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-border px-4 py-2">
        <MessageCircle size={16} className="text-muted-foreground" />
        <Text as="h3" className="text-sm">
          群聊
        </Text>
      </div>

      <div className="min-h-0 flex-1">
        <GroupChat
          goalId={goalId}
          topicId={selectedTopicId}
          screenshotRef={screenshotRef}
        />
      </div>
    </div>
  );
}
