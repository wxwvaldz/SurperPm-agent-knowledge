import { Outlet, useParams } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { WSProvider } from "../../providers/ws-provider";

export function WorkspaceLayout() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return <div>Workspace not found</div>;

  // For now use slug as workspace ID — will be resolved via API later
  return (
    <WSProvider workspaceId={slug}>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar workspaceSlug={slug} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </WSProvider>
  );
}
