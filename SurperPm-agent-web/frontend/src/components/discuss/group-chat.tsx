import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Send, ImagePlus, X, Bot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDiscussionChat, type ChatMessage } from "@/lib/use-discussion-chat";
import { Textarea } from "@/components/retroui/Textarea";
import { parseGoalProposals, GoalProposalCards } from "@/components/discuss/goal-proposal-card";
import { parseInteractiveCards, InteractiveCardView } from "@/components/discuss/interactive-card";
import type { CardResponse } from "@/lib/schemas/interactive-card";
import { MarkdownContent } from "@/components/business/markdown-content";

interface GroupChatProps {
  topicId?: number | null;
  goalId?: number;
  screenshotRef?: MutableRefObject<((dataUri: string) => void) | null>;
}

function Avatar({
  isAI,
  name,
  avatarUrl,
}: {
  isAI: boolean;
  name: string;
  avatarUrl?: string;
}) {
  if (isAI) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-primary">
        <Bot size={16} />
      </div>
    );
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 shrink-0 border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-card text-xs font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MessageRow({
  message,
  selfName,
  selfAvatar,
  topicId,
  onCardSubmit,
}: {
  message: ChatMessage;
  selfName?: string;
  selfAvatar?: string;
  topicId?: number | null;
  onCardSubmit?: (summary: string, response: CardResponse) => void;
}) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const isAI = message.role === "agent";
  const isSelf = !isAI && !!message.author && !!selfName && message.author === selfName;
  const name = isAI ? "AI" : message.author || "用户";

  const { displayText, proposals, cards } = (() => {
    if (!isAI || message.streaming) {
      return { displayText: message.content, proposals: [] as ReturnType<typeof parseGoalProposals>["proposals"], cards: [] as ReturnType<typeof parseInteractiveCards>["cards"] };
    }
    const { text: stripped, proposals: p } = parseGoalProposals(message.content);
    const { text: finalText, cards: c } = parseInteractiveCards(stripped);
    return { displayText: finalText, proposals: p, cards: c };
  })();

  return (
    <div className={`flex gap-2 min-w-0 overflow-hidden ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar isAI={isAI} name={name} avatarUrl={isSelf ? selfAvatar : undefined} />
      <div className={`flex max-w-[75%] flex-col overflow-hidden min-w-0 ${isSelf ? "items-end" : "items-start"}`}>
        <span className="mb-0.5 px-1 text-[11px] text-muted-foreground">
          {isSelf ? "我" : name}
        </span>
        <div
          className={`break-words border border-border px-3 py-2 text-sm overflow-hidden min-w-0 w-full ${
            isSelf ? "bg-primary whitespace-pre-wrap" : isAI ? "bg-background" : "bg-card whitespace-pre-wrap"
          }`}
        >
          {message.imageDataUri && (
            <img
              src={message.imageDataUri}
              alt="uploaded"
              className="mb-2 max-h-64 w-auto border border-border"
            />
          )}
          {isAI ? (
            // 流式输出中不渲染 Markdown，避免不完整语法导致格式混乱
            message.streaming ? (
              displayText
            ) : (
              <MarkdownContent content={displayText} />
            )
          ) : (
            displayText
          )}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-foreground align-middle" />
          )}
        </div>
        {cards.length > 0 && (
          <div className="mt-1.5 space-y-2 w-full">
            {cards.map((card, idx) => (
              <InteractiveCardView
                key={idx}
                card={card}
                disabled={!!message.cardResponse}
                initialResponse={message.cardResponse}
                onSubmit={(response: CardResponse) => {
                  let summary: string;
                  if (response.type === "text" && response.values && card.type === "text") {
                    const labelMap = Object.fromEntries(
                      card.fields.map((f) => [f.key, f.label]),
                    );
                    const parts = Object.entries(response.values)
                      .map(([k, v]) => `${labelMap[k] ?? k}: ${v}`);
                    summary = `已填写: ${card.title}\n${parts.join("; ")}`;
                  } else {
                    summary = `已选: ${Array.isArray(response.selected) ? response.selected.join(", ") : response.selected}`;
                  }
                  onCardSubmit?.(summary, response);
                }}
              />
            ))}
          </div>
        )}
        {proposals.length > 0 && <GoalProposalCards proposals={proposals} topicId={topicId} />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-primary">
        <Bot size={16} />
      </div>
      <div className="flex items-center gap-1 border border-border bg-background px-3 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground [animation-delay:0.3s]" />
      </div>
    </div>
  );
}

export function GroupChat({ topicId, goalId, screenshotRef }: GroupChatProps) {
  const { user } = useAuth();
  const { messages, isRunning, send } = useDiscussionChat({ topicId, goalId });

  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!screenshotRef) return;
    screenshotRef.current = (dataUri: string) => setPendingImage(dataUri);
    return () => {
      screenshotRef.current = null;
    };
  }, [screenshotRef]);

  const lastContent = messages[messages.length - 1]?.content;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isRunning, lastContent]);

  const handleSend = async () => {
    if (sending) return;
    const text = input;
    if (!text.trim() && !pendingImage) return;
    setSending(true);
    try {
      await send(text, pendingImage ?? undefined);
      setInput("");
      setPendingImage(null);
    } finally {
      setSending(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const showTyping = isRunning && !messages.some((m) => m.streaming);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 min-w-0 space-y-4 overflow-y-auto overflow-x-hidden bg-muted/20 px-4 py-4"
      >
        {messages.length === 0 && !showTyping ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">
              开始讨论吧！发送消息后 AI 会自动回复。
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                selfName={user?.username}
                selfAvatar={user?.avatar_url}
                topicId={topicId}
                onCardSubmit={(summary, response) => {
                  send(summary, undefined, response);
                }}
              />
            ))}
            {showTyping && <TypingIndicator />}
          </>
        )}
      </div>

      {pendingImage && (
        <div className="shrink-0 border-t border-border bg-background px-3 pt-2">
          <div className="relative inline-block">
            <img
              src={pendingImage}
              alt="待发送"
              className="h-16 w-auto border border-border"
            />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background transition-all hover:bg-muted"
          title="添加图片"
        >
          <ImagePlus size={18} />
        </button>

        <Textarea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          rows={1}
          className="max-h-32 flex-1 resize-none text-sm shadow-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || (!input.trim() && !pendingImage)}
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-primary transition-all disabled:cursor-not-allowed disabled:opacity-50"
          title="发送"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
