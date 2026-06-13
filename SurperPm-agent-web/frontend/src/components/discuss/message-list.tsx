import { useEffect, useRef, useMemo } from "react";
import { User, Bot, Info, Reply } from "lucide-react";
import { GoalMentionChip } from "./goal-mention-chip";
import { MarkdownContent } from "@/components/business/markdown-content";
import { Badge } from "@/components/retroui/Badge";
import type { Discussion } from "../../lib/schemas/discussion";

interface MessageListProps {
  discussions: Discussion[];
  onReply?: (discussionId: number) => void;
}

const roleMeta: Record<string, { label: string; icon: typeof User; accent: string; avatarBg: string; badge?: string }> = {
  user:   { label: "You",          icon: User, accent: "border-l-blue-500",    avatarBg: "bg-blue-100" },
  agent:  { label: "AI Assistant", icon: Bot,  accent: "border-l-emerald-500", avatarBg: "bg-emerald-100", badge: "AI" },
  system: { label: "System",       icon: Info, accent: "border-l-gray-400",    avatarBg: "bg-gray-100",    badge: "SYS" },
};

function renderContent(content: string) {
  const parts = content.split(/(@goal-\d+)/g);
  return parts.map((part, idx) => {
    if (/^@goal-\d+$/.test(part)) {
      return <GoalMentionChip key={idx} goalRef={part} />;
    }
    return <MarkdownContent key={idx} content={part} />;
  });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentCard({ msg, depth = 0, onReply }: { msg: Discussion; depth?: number; onReply?: (id: number) => void }) {
  const meta = roleMeta[msg.role] ?? roleMeta.system;
  const Icon = meta.icon;

  return (
    <div className="flex gap-3" style={{ marginLeft: `${depth * 32}px` }}>
      {/* Avatar */}
      <div className={`w-8 h-8 shrink-0 border-2 border-border flex items-center justify-center ${meta.avatarBg} shadow-[2px_2px_0_0_#000]`}>
        <Icon size={14} />
      </div>

      {/* Card body */}
      <div className={`flex-1 min-w-0 border-2 border-border border-l-4 ${meta.accent} bg-card shadow-[2px_2px_0_0_#000]`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
          <span className="text-sm font-head font-bold">{meta.label}</span>
          {meta.badge && (
            <Badge size="sm" variant="surface" className="text-[10px] px-1.5 py-0">
              {meta.badge}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{formatTime(msg.created_at)}</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 text-sm break-words leading-relaxed">
          {renderContent(msg.content)}
        </div>

        {/* Reply button */}
        {onReply && depth < 2 && (
          <div className="px-4 pb-2">
            <button
              onClick={() => onReply(msg.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply size={12} />
              回复
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ThreadNode {
  msg: Discussion;
  children: ThreadNode[];
}

function buildThreadTree(discussions: Discussion[]): ThreadNode[] {
  const byId = new Map<number, ThreadNode>();
  const roots: ThreadNode[] = [];

  for (const msg of discussions) {
    byId.set(msg.id, { msg, children: [] });
  }

  for (const msg of discussions) {
    const node = byId.get(msg.id)!;
    if (msg.parent_id && byId.has(msg.parent_id)) {
      byId.get(msg.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function ThreadNodeView({ node, depth, onReply }: { node: ThreadNode; depth: number; onReply?: (id: number) => void }) {
  return (
    <>
      <CommentCard msg={node.msg} depth={depth} onReply={onReply} />
      {node.children.map((child) => (
        <ThreadNodeView key={child.msg.id} node={child} depth={depth + 1} onReply={onReply} />
      ))}
    </>
  );
}

export function MessageList({ discussions, onReply }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => buildThreadTree(discussions), [discussions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussions.length]);

  if (discussions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 p-8">
        <div className="w-16 h-16 border-2 border-border bg-muted/30 flex items-center justify-center shadow-[3px_3px_0_0_#000]">
          <Bot size={32} className="text-muted-foreground/50" />
        </div>
        <p className="font-head text-base">还没有讨论</p>
        <p className="text-xs text-center max-w-xs">
          发送消息开始对话，AI 会自动回复。使用 <code className="px-1 py-0.5 border border-border bg-muted text-xs font-mono">@goal-N</code> 可以触发目标执行。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-4 max-w-2xl">
        {threads.map((node) => (
          <ThreadNodeView key={node.msg.id} node={node} depth={0} onReply={onReply} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
