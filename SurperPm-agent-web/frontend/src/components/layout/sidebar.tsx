import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, BookOpen, Settings } from "lucide-react";
import { useUIStore } from "../../lib/stores/ui";

interface SidebarProps {
  workspaceSlug: string;
}

const navItems = [
  { to: "goals", icon: LayoutDashboard, label: "Goals" },
  { to: "discuss", icon: MessageSquare, label: "Discuss" },
  { to: "knowledge", icon: BookOpen, label: "Knowledge" },
  { to: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ workspaceSlug }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const base = `/workspace/${workspaceSlug}`;

  return (
    <aside
      className={`flex flex-col border-r border-border bg-sidebar transition-all ${
        sidebarCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm">SuperPmAgent</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>
      <nav className="flex-1 py-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={`${base}/${to}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm rounded-md mx-2 transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon size={18} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
