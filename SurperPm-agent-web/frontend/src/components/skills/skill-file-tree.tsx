import { useSkillStore } from "@/lib/stores/skill";
import { FileText, Folder, FolderOpen } from "lucide-react";
import type { SkillFile } from "@/lib/schemas/skill";

interface SkillFileTreeProps {
  files: SkillFile[];
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: SkillFile;
}

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const existingNode = current.find((n) => n.name === part);

      if (existingNode) {
        if (!isLeaf) {
          current = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLeaf,
          children: [],
          file: isLeaf ? file : undefined,
        };
        current.push(newNode);
        if (!isLeaf) {
          current = newNode.children;
        }
      }
    }
  }

  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);

  return root;
}

export function SkillFileTree({ files }: SkillFileTreeProps) {
  const tree = buildTree(files);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <FileText size={24} className="text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">暂无文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeNodeItem key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const selectedFilePath = useSkillStore((s) => s.selectedFilePath);
  const expandedPaths = useSkillStore((s) => s.expandedPaths);
  const selectFile = useSkillStore((s) => s.selectFile);
  const toggleExpand = useSkillStore((s) => s.toggleExpand);

  const isSelected = selectedFilePath === node.path;
  const isExpanded = expandedPaths.has(node.path);

  if (node.isDir) {
    return (
      <div>
        <button
          className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs hover:bg-muted/50 transition-colors ${
            isSelected ? "bg-primary/10" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleExpand(node.path)}
        >
          {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <button
      className={`flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs transition-colors ${
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted/50"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => selectFile(node.path)}
    >
      <FileText size={14} />
      <span className="truncate">{node.name}</span>
      {node.file?.is_main && (
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">★</span>
      )}
    </button>
  );
}
