import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, ChevronDown, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { workspaceListOptions } from "@/lib/queries/workspaces";
import { standaloneTopicListOptions } from "@/lib/queries/topics-standalone";
import { useUIStore } from "@/lib/stores/ui";
import { WSProvider } from "@/providers/ws-provider";
import { BrowserPanel } from "@/components/browser/browser-panel";
import { ResizableSplit } from "@/components/browser/resizable-split";
import { GroupChat } from "@/components/discuss/group-chat";
import { CreateTopicDialog } from "@/components/discuss/create-topic-dialog";
import { Text } from "@/components/retroui/Text";
import type { Topic } from "@/lib/schemas/topic";

function ChatWithTopics({
  screenshotRef,
}: {
  screenshotRef: React.MutableRefObject<((dataUri: string) => void) | null>;
}) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: topics = [] } = useQuery(standaloneTopicListOptions());
  const discussTopicId = useUIStore((s) => s.discussTopicId);
  const setDiscussTopicId = useUIStore((s) => s.setDiscussTopicId);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── selectedTopicId — tri-source: URL param (explicit link) > Zustand (across navigation) > default ──
  function resolveTopicId(
    urlTopicParam: string | null,
    storedId: number | null,
  ): number | null {
    // 1. URL param — e.g. from a goal-card link or cross-page navigation
    if (urlTopicParam) {
      const id = Number(urlTopicParam);
      if (topics.some((t) => t.id === id)) return id;
    }
    // 2. Zustand — remembered from last selection in this session
    if (storedId != null && topics.some((t) => t.id === storedId)) return storedId;
    // 3. Default — "general" or first available
    const general = topics.find((t) => t.name === "general");
    return general?.id ?? topics[0]?.id ?? null;
  }

  const topicParam = searchParams.get("topic");
  const selectedTopicId = resolveTopicId(topicParam, discussTopicId);

  // Keep URL in sync with selectedTopicId (side-effect, not in render)
  useEffect(() => {
    if (selectedTopicId == null || topics.length === 0) return;
    const topic = topics.find((t) => t.id === selectedTopicId);
    const currentParam = searchParams.get("topic");
    if (topic && topic.name !== "general" && currentParam !== String(selectedTopicId)) {
      setSearchParams({ topic: String(selectedTopicId) }, { replace: true });
    }
  }, [selectedTopicId, topics, searchParams, setSearchParams]);

  function handleSelectTopic(id: number) {
    setDiscussTopicId(id);
    const topic = topics.find((t) => t.id === id);
    // Keep "general" out of the URL — it's the implicit default.
    if (topic && topic.name === "general") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ topic: String(id) }, { replace: true });
    }
    setShowDropdown(false);
  }

  const renameMut = useMutation({
    mutationFn: (args: { id: number; name: string }) =>
      api.patch(`/topics/${args.id}`, { name: args.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics-standalone"] });
      setEditingId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/topics/${id}`),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["topics-standalone"] });
      if (selectedTopicId === deletedId) {
        setSearchParams({}, { replace: true });
      }
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  return (
    <div className="flex flex-col h-full">
      {/* Topic selector toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0 bg-card">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          >
            <Hash size={14} className="text-muted-foreground" />
            <span
              className="text-sm font-medium"
              title={selectedTopic?.name ?? undefined}
            >
              {selectedTopic?.name ?? "Select topic"}
            </span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border z-50 py-1" style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden' }}>
              {topics.map((topic: Topic) => (
                <div
                  key={topic.id}
                  className={`flex items-center gap-1 px-3 py-2 text-sm hover:bg-muted/50 ${
                    topic.id === selectedTopicId ? "bg-primary/10 font-medium" : ""
                  }`}
                >
                  {editingId === topic.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameMut.mutate({ id: topic.id, name: editName });
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-sm border border-border px-1 bg-background min-w-0"
                        autoFocus
                      />
                      <button onClick={() => renameMut.mutate({ id: topic.id, name: editName })} className="p-1 hover:text-foreground text-muted-foreground shrink-0">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 hover:text-foreground text-muted-foreground shrink-0">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectTopic(topic.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                        title={topic.name}
                      >
                        <Hash size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{topic.name}</span>
                      </button>
                      {topic.name !== "general" && (
                        <div className="flex shrink-0 ml-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(topic.id); setEditName(topic.name); }}
                            className="p-1 hover:text-foreground text-muted-foreground"
                            title="Rename"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMut.mutate(topic.id); }}
                            className="p-1 hover:text-destructive text-muted-foreground"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowCreate(true);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/50"
                >
                  <Plus size={12} />
                  <span>New Topic</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-head uppercase tracking-wider">
          {topics.length} topics
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {topics.length === 0 && selectedTopicId === null ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">Discuss &rarr; Goal &rarr; Learning</p>
              <p className="text-xs text-muted-foreground">Ideas become goals. Goals produce knowledge. Knowledge fuels better ideas.</p>
            </div>
            <button
              className="px-4 py-2 text-sm font-medium bg-primary text-foreground border border-border rounded-sm hover:bg-primary/90 transition-colors"
              onClick={async () => {
                try {
                  const t = await api.post<{ id: number }>("/topics", { name: "general" });
                  handleSelectTopic(t.id);
                  queryClient.invalidateQueries({ queryKey: ["topics-standalone"] });
                  await api.post("/discussions", { role: "user", content: "你好", topic_id: t.id });
                } catch { /* ignore */ }
              }}
            >
              Start Discussing
            </button>
          </div>
        ) : (
          <GroupChat topicId={selectedTopicId} screenshotRef={screenshotRef} />
        )}
      </div>

      <CreateTopicDialog open={showCreate} onOpenChange={setShowCreate} onCreated={(id) => handleSelectTopic(id)} />
    </div>
  );
}

function DiscussContent({ workspaceId }: { workspaceId: string }) {
  const screenshotRef = useRef<((dataUri: string) => void) | null>(null);

  return (
    <ResizableSplit
      left={
        <div className="h-full pb-2">
          <BrowserPanel
            target={{ type: "workspace", workspaceId }}
            onScreenshotCapture={(uri) => screenshotRef.current?.(uri)}
          />
        </div>
      }
      right={<ChatWithTopics screenshotRef={screenshotRef} />}
      defaultLeftPercent={50}
      minLeftPercent={30}
      maxLeftPercent={70}
      initialCollapsed="left"
    />
  );
}

export default function DiscussPage() {
  const { data: workspaces = [] } = useQuery(workspaceListOptions());
  const workspaceId = workspaces[0]?.id;

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-muted-foreground">Loading...</Text>
      </div>
    );
  }

  return (
    <WSProvider workspaceId={workspaceId}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
          <Text as="h2" className="text-sm font-bold">Discuss</Text>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <DiscussContent workspaceId={workspaceId} />
        </div>
      </div>
    </WSProvider>
  );
}
