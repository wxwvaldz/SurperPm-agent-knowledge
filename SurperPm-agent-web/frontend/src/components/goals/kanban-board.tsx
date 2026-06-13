import { useQuery } from "@tanstack/react-query";
import { goalListOptions } from "../../lib/queries/goals";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
  workspaceId: string;
}

const COLUMNS = [
  { status: "todo", title: "To Do", color: "border-blue-400" },
  { status: "doing", title: "In Progress", color: "border-yellow-400" },
  { status: "done", title: "Done", color: "border-green-400" },
] as const;

export function KanbanBoard({ workspaceId }: KanbanBoardProps) {
  const { data: goals = [], isLoading } = useQuery(goalListOptions(workspaceId));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading goals...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {COLUMNS.map(({ status, title, color }) => (
        <KanbanColumn
          key={status}
          title={title}
          color={color}
          goals={goals.filter((g) => status === "done" ? g.status === "done" || g.status === "failed" : g.status === status)}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  );
}
