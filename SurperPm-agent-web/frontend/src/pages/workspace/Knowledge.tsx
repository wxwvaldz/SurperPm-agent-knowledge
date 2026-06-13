import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Textarea } from "@/components/retroui/Textarea";
import { Dialog } from "@/components/retroui/Dialog";
import { MarkdownContent } from "@/components/business/markdown-content";
import { Empty } from "@/components/retroui/Empty";
import { LearningRecords } from "@/pages/Learning";
import {
  BookMarked,
  BookOpen,
  FileText,
  Folder,
  FolderOpen,
  Search,
  Pencil,
  X,
  Save,
  Inbox,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function isDir(node: TreeNode): boolean {
  return Array.isArray(node.children);
}

function matchesSearch(node: TreeNode, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  if (node.name.toLowerCase().includes(lower)) return true;
  if (node.children) {
    return node.children.some((c) => matchesSearch(c, lower));
  }
  return false;
}

export default function KnowledgePage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [learningOpen, setLearningOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b-2 border-border bg-card/50">
        <div className="w-11 h-11 border-2 border-border bg-primary flex items-center justify-center shadow-[3px_3px_0_0_#000]">
          <BookMarked size={22} />
        </div>
        <Text as="h2" className="text-2xl">Knowledge Base</Text>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => setLearningOpen(true)}
        >
          <Sparkles size={14} />
          Learning 记录
        </Button>
      </div>

      <Dialog open={learningOpen} onOpenChange={setLearningOpen}>
        <Dialog.Content size="3xl" className="max-h-[85vh] overflow-hidden flex flex-col">
          <Dialog.Header>
            <Text as="h3" className="text-base">Learning 记录</Text>
          </Dialog.Header>
          <div className="flex-1 overflow-auto px-1 py-2 space-y-4">
            <KnowledgeSyncBar />
            <LearningRecords />
          </div>
        </Dialog.Content>
      </Dialog>

      <div className="flex flex-1 min-h-0">
        {/* sidebar */}
        <aside className="w-72 border-r-2 border-border overflow-y-auto p-4 bg-card nb-scrollbar">
          <p className="text-xs font-head font-bold uppercase tracking-wider text-muted-foreground mb-3">
            文件目录
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索文件..."
              className="pl-8 text-xs h-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <KnowledgeTree
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            searchTerm={searchTerm}
          />
        </aside>

        {/* main content */}
        <main className="flex-1 overflow-auto p-6">
          {selectedPath ? (
            <FileContent path={selectedPath} />
          ) : (
            <Empty>
              <Empty.Content>
                <Empty.Icon>
                  <BookOpen size={48} className="text-muted-foreground/30" />
                </Empty.Icon>
                <Empty.Title>暂无内容</Empty.Title>
                <Empty.Separator />
                <Empty.Description>
                  从左侧目录树选择一个文件，内容将在此处显示。
                </Empty.Description>
              </Empty.Content>
            </Empty>
          )}
        </main>
      </div>
    </div>
  );
}

function KnowledgeSyncBar() {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>("/knowledge/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
    },
  });

  return (
    <div className="border-2 border-border bg-muted/20 p-3 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-head font-bold">知识库同步</p>
        <p className="text-xs text-muted-foreground">
          绑定仓库的只读镜像，每 5 分钟自动拉取。可在此手动触发一次同步。
        </p>
        {syncMutation.isError && (
          <p className="text-xs text-destructive mt-1">
            同步失败: {(syncMutation.error as Error).message}
          </p>
        )}
        {syncMutation.isSuccess && (
          <p className="text-xs text-muted-foreground mt-1">已同步。</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
      >
        <RefreshCw
          size={14}
          className={syncMutation.isPending ? "animate-spin" : ""}
        />
        {syncMutation.isPending ? "同步中..." : "立即同步"}
      </Button>
    </div>
  );
}

function KnowledgeTree({
  selectedPath,
  onSelect,
  searchTerm,
}: {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  searchTerm: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge-tree"],
    queryFn: () => api.get<TreeNode>("/knowledge/tree"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-xs text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        正在加载文件树...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        加载失败: {(error as Error).message}
      </div>
    );
  }

  if (!data || !data.children || data.children.length === 0) {
    return (
      <div className="py-2">
        <Empty className="border-0 rounded-none shadow-none bg-transparent p-0 hover:shadow-none">
          <Empty.Content>
            <Empty.Icon>
              <Inbox size={28} className="text-muted-foreground/30" />
            </Empty.Icon>
            <Empty.Title className="text-sm">暂无知识文件</Empty.Title>
            <Empty.Separator />
            <Empty.Description className="text-xs">
              将文件推送到知识库仓库即可开始使用。
            </Empty.Description>
          </Empty.Content>
        </Empty>
      </div>
    );
  }

  const filtered = searchTerm
    ? data.children.filter((c) => matchesSearch(c, searchTerm))
    : data.children;

  if (searchTerm && filtered.length === 0) {
    return (
      <Empty className="border-0 rounded-none shadow-none bg-transparent p-0 hover:shadow-none">
        <Empty.Content>
          <Empty.Icon>
            <Search size={28} className="text-muted-foreground/30" />
          </Empty.Icon>
          <Empty.Title className="text-sm">无匹配结果</Empty.Title>
        </Empty.Content>
      </Empty>
    );
  }

  return (
    <TreeNodeList
      nodes={filtered}
      depth={0}
      selectedPath={selectedPath}
      onSelect={onSelect}
      searchTerm={searchTerm}
    />
  );
}

function TreeNodeList({
  nodes,
  depth,
  selectedPath,
  onSelect,
  searchTerm,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  searchTerm: string;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={depth}
          selectedPath={selectedPath}
          onSelect={onSelect}
          searchTerm={searchTerm}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  searchTerm,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  searchTerm: string;
}) {
  const forceOpen = !!searchTerm && matchesSearch(node, searchTerm);
  const [expanded, setExpanded] = useState(depth < 1);
  const isOpen = forceOpen || expanded;
  const isSelected = selectedPath === node.path;
  const nodeIsDir = isDir(node);

  const handleClick = () => {
    if (nodeIsDir) {
      setExpanded(!expanded);
    } else {
      onSelect(node.path);
    }
  };

  const filteredChildren =
    searchTerm && node.children
      ? node.children.filter((c) => matchesSearch(c, searchTerm))
      : node.children;

  return (
    <li>
      <button
        onClick={handleClick}
        className={`w-full text-left text-sm px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-100 border-l-[3px] ${
          isSelected
            ? "bg-primary/20 border-l-foreground font-semibold shadow-[2px_2px_0_0_rgba(0,0,0,0.06)]"
            : "hover:bg-muted/60 hover:border-l-primary/40 border-l-transparent"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {nodeIsDir ? (
          isOpen ? (
            <FolderOpen size={14} className="text-primary shrink-0" />
          ) : (
            <Folder size={14} className="text-muted-foreground shrink-0" />
          )
        ) : (
          <FileText size={14} className="text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {nodeIsDir && isOpen && filteredChildren && filteredChildren.length > 0 && (
        <TreeNodeList
          nodes={filteredChildren}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          searchTerm={searchTerm}
        />
      )}
    </li>
  );
}

function FileContent({ path }: { path: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge-content", path],
    queryFn: () =>
      api.get<{ content: string; path: string }>(
        `/knowledge/file?path=${encodeURIComponent(path)}`
      ),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.put("/knowledge/file", { path, content: editContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-content", path] });
      setEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 pt-20 text-sm text-muted-foreground">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        正在加载文件内容...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        加载失败: {(error as Error).message}
      </div>
    );
  }

  const isMarkdown = path.endsWith(".md") || path.endsWith(".mdx");
  const content = data?.content ?? "";

  const startEdit = () => {
    setEditContent(content);
    setEditing(true);
  };

  return (
    <div className="max-w-4xl space-y-3">
      {/* breadcrumb & actions */}
      <div className="flex items-center gap-2 pb-3 border-b-2 border-border">
        <FileText size={16} className="text-muted-foreground shrink-0" />
        <span className="font-mono text-xs text-muted-foreground flex-1 truncate">{path}</span>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saveMutation.isPending}
              >
                <X size={14} />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save size={14} />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            user?.is_founder && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil size={14} />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      {saveMutation.isError && (
        <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          保存失败: {(saveMutation.error as Error).message}
        </div>
      )}

      {editing ? (
        <Textarea
          value={editContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setEditContent(e.target.value)
          }
          className="font-mono text-sm min-h-[calc(100vh-300px)]"
          rows={20}
        />
      ) : isMarkdown ? (
        <div className="border-2 border-border bg-white p-6 overflow-auto max-h-[calc(100vh-280px)] shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
          <MarkdownContent content={content} />
        </div>
      ) : (
        <pre className="aui-md-pre overflow-auto max-h-[calc(100vh-280px)] shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
