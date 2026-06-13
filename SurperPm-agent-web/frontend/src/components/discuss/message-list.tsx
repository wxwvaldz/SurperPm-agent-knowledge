import { useEffect, useRef } from "react";
import { User, Bot, Info } from "lucide-react";
import { GoalMentionChip } from "./goal-mention-chip";
import type { Discussion } from "../../lib/schemas/discussion";

interface MessageListProps {
  discussions: Discussion[];
}

const roleMeta: Record<string, { label: string; icon: typeof User; color: string }> = {
  user: { label: "You", icon: User, color: "bg-blue-100 text-blue-700" },
  agent: { label: "Agent", icon: Bot, color: "bg-emerald-100 text-emerald-700" },
  system: { label: "System", icon: Info, color: "bg-gray-100 text-gray-600" },
};

function renderContent(content: string) {
  // Split on @goal-N mentions and render them as chips
  const parts = content.split(/(@goal-\d+)/g);
  return parts.map((part, idx) => {
    if (/^@goal-\d+$/.test(part)) {
      return <GoalMentionChip key={idx} goalRef={part} />;
    }
    return <span key={idx}>{part}</span>;
  });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function MessageList({ discussions }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussions.length]);

  if (discussions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-4">
      {discussions.map((msg) => {
        const meta = roleMeta[msg.role] ?? roleMeta.system;
        const Icon = meta.icon;

        return (
          <div key={msg.id} className="flex gap-3 items-start">
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${meta.color}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{meta.label}</span>
                <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
              </div>
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                {renderContent(msg.content)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
