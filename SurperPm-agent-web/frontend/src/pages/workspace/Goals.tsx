import { useParams } from "react-router-dom";
import { KanbanBoard } from "../../components/goals/kanban-board";
import { CreateGoalDialog } from "../../components/goals/create-goal-dialog";

export default function GoalsPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <CreateGoalDialog workspaceId={slug} />
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard workspaceId={slug} />
      </div>
    </div>
  );
}
