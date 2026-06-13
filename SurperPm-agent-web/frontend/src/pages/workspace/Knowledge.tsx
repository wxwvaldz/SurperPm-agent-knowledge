import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: TreeNode[];
}

export default function KnowledgePage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  if (!slug) return null;

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-border overflow-y-auto p-4">
        <h2 className="text-sm font-semibold mb-3">Knowledge Tree</h2>
        <KnowledgeTree
          slug={slug}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
        />
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {selectedPath ? (
          <FileContent slug={slug} path={selectedPath} />
        ) : (
          <div className="text-muted-foreground text-sm">
            Select a file from the tree to view its content.
          </div>
        )}
      </main>
    </div>
  );
}

function KnowledgeTree({
  slug,
  selectedPath,
  onSelect,
}: {
  slug: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const { data: tree = [], isLoading, error } = useQuery({
    queryKey: ["knowledge-tree", slug],
    queryFn: () =>
      api.get<TreeNode[]>(`/workspaces/${slug}/knowledge/tree`),
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-xs text-destructive">
        Failed to load: {(error as Error).message}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No knowledge files found. Push files to the knowledge repository to get
        started.
      </div>
    );
  }

  return (
    <TreeNodeList
      nodes={tree}
      depth={0}
      selectedPath={selectedPath}
      onSelect={onSelect}
    />
  );
}

function TreeNodeList({
  nodes,
  depth,
  selectedPath,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
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
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.is_dir) {
      setExpanded(!expanded);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <li>
      <button
        onClick={handleClick}
        className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="mr-1.5 text-xs opacity-60">
          {node.is_dir ? (expanded ? "▾" : "▸") : "·"}
        </span>
        {node.name}
      </button>
      {node.is_dir && expanded && node.children && node.children.length > 0 && (
        <TreeNodeList
          nodes={node.children}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      )}
    </li>
  );
}

function FileContent({ slug, path }: { slug: string; path: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge-content", slug, path],
    queryFn: () =>
      api.get<{ content: string; path: string }>(
        `/workspaces/${slug}/knowledge/content?path=${encodeURIComponent(path)}`
      ),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading file...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load file: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-xs text-muted-foreground">{path}</div>
      <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 border border-border rounded-md p-4 overflow-auto max-h-[calc(100vh-200px)]">
        {data?.content ?? ""}
      </pre>
    </div>
  );
}
