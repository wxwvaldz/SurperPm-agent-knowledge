import { Outlet, useParams, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Settings, ArrowLeft } from "lucide-react";
import { goalDetailOptions } from "@/lib/queries/goals";
import { GoalWSProvider } from "@/providers/ws-provider";
import { Text } from "@/components/retroui/Text";
import { Badge } from "@/components/retroui/Badge";

const subNav = [
  { to: "execute", icon: Play, label: "Execute" },
  { to: "settings", icon: Settings, label: "Settings" },
];

const statusLabel: Record<string, string> = {
  todo: "To Do",
  doing: "In Progress",
  review: "Review",
  done: "Done",
  failed: "Failed",
};

export function GoalLayout() {
  const { goalId: goalIdStr } = useParams<{ goalId: string }>();
  const goalId = Number(goalIdStr);

  if (!goalIdStr || isNaN(goalId)) return <Navigate to="/" replace />;

  const { data: goal } = useQuery(goalDetailOptions(goalId));

  return (
    <GoalWSProvider goalId={goalId}>
      <div className="flex flex-col h-full">
        <div className="shrink-0 border-b-2 border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <NavLink
              to="/"
              className="p-1 border-2 border-border bg-background hover:bg-accent transition-all"
            >
              <ArrowLeft size={14} />
            </NavLink>
            <Text as="h2" className="text-lg truncate flex-1">
              {goal?.title ?? `Goal #${goalId}`}
            </Text>
            {goal && (
              <Badge size="sm">
                {statusLabel[goal.status] ?? goal.status}
              </Badge>
            )}
          </div>
          <nav className="flex gap-1">
            {subNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-2 transition-all ${
                    isActive
                      ? "border-border bg-primary text-foreground shadow-[2px_2px_0_0_#000]"
                      : "border-transparent text-foreground/50 hover:border-border hover:bg-background"
                  }`
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </GoalWSProvider>
  );
}
