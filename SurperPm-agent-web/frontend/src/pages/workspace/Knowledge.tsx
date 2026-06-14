import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Textarea } from "@/components/retroui/Textarea";
import { MarkdownContent } from "@/components/business/markdown-content";
import { Empty } from "@/components/retroui/Empty";
import { LearningRecords } from "@/pages/Learning";
import {
  BookOpen,
  FileText,
  Folder,
  RefreshCw,
  FolderOpen,
  Search,
  Pencil,
  X,
  Save,
  Inbox,
  Sparkles,
} from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
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
  const [selectedPath, setSelectedPath] = useState<string | null>("README.md");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"knowledge" | "learning">("knowledge");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
        <Text as="h2" className="text-sm font-bold">Learning</Text>
        <div className="flex-1" />
        <SyncButton />
        <div className="flex border border-border">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === "knowledge"
                ? "bg-primary text-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen size={12} className="inline mr-1" />
            Knowledge
          </button>
          <button
            onClick={() => setActiveTab("learning")}
            className={`px-3 py-1 text-xs font-medium border-l-2 border-border transition-colors ${
              activeTab === "learning"
                ? "bg-primary text-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sparkles size={12} className="inline mr-1" />
            Learning
          </button>
        </div>
      </div>

      {activeTab === "learning" ? (
        <div className="flex-1 overflow-auto p-4">
          <LearningRecords />
        </div>
      ) : (
      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-r border-border overflow-y-auto p-4 bg-card nb-scrollbar">
          <p className="text-xs font-head font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Files
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
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
        <main className="flex-1 overflow-hidden p-4">
          {selectedPath ? (
            <FileContent path={selectedPath} />
          ) : (
            <Empty>
              <Empty.Content>
                <Empty.Icon>
                  <BookOpen size={48} className="text-muted-foreground/30" />
                </Empty.Icon>
                <Empty.Title>No Content</Empty.Title>
                <Empty.Separator />
                <Empty.Description>
                  Select a file from the sidebar to view its content.
                </Empty.Description>
              </Empty.Content>
            </Empty>
          )}
        </main>
      </div>
      )}
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
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-foreground border-t-transparent" />
        Loading file tree...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        Load failed: {(error as Error).message}
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
            <Empty.Title className="text-sm">No Files</Empty.Title>
            <Empty.Separator />
            <Empty.Description className="text-xs">
              Push files to the knowledge repo to get started.
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
          <Empty.Title className="text-sm">No Results</Empty.Title>
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
  const [expanded, setExpanded] = useState(false);
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
            ? "bg-primary/20 border-l-foreground font-semibold"
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
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-foreground border-t-transparent" />
        Loading file...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Load failed: {(error as Error).message}
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
    <div className="max-w-4xl space-y-3 flex flex-col h-full min-h-0">
      {/* breadcrumb & actions */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
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
        <div className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Save failed: {(saveMutation.error as Error).message}
        </div>
      )}

      {editing ? (
        <Textarea
          value={editContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setEditContent(e.target.value)
          }
          className="font-mono text-sm flex-1 min-h-0"
          rows={20}
        />
      ) : isMarkdown ? (
        <div className="border border-border bg-card p-4 overflow-auto flex-1 min-h-0">
          <MarkdownContent content={stripFrontmatter(content)} />
        </div>
      ) : (
        <pre className="border border-border bg-card p-4 overflow-auto flex-1 min-h-0 font-mono text-xs">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}

function SyncButton() {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => api.post("/knowledge/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
      className="text-[10px] h-6 px-2"
    >
      <RefreshCw size={11} className={syncMutation.isPending ? "animate-spin" : ""} />
      Sync
    </Button>
  );
}
