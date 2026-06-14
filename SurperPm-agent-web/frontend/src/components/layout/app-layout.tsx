import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  MessagesSquare,
  Target,
  Lightbulb,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useUIStore } from "../../lib/stores/ui";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", icon: MessagesSquare, label: "Discuss", end: true },
  { to: "/goals", icon: Target, label: "Goal" },
  { to: "/knowledge", icon: Lightbulb, label: "Learning" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <>
      <div className="md:hidden flex items-center h-12 px-4 border-b-2 border-border bg-card">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 border-2 border-border bg-background hover:bg-primary transition-all"
        >
          <Menu size={18} />
        </button>
        <span className="ml-3 font-head text-sm font-bold">SuperPmAgent</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r-2 border-border flex flex-col">
            <div className="flex h-14 items-center justify-between px-4 border-b-2 border-border">
              <span className="font-head text-base font-bold">SuperPmAgent</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 border-2 border-border bg-background hover:bg-primary transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 py-3 space-y-1 px-2">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-2 transition-all ${
                      isActive
                        ? "border-border bg-primary text-foreground shadow-[3px_3px_0_0_#000]"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-background"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t-2 border-border p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 border-2 border-border bg-muted flex items-center justify-center shadow-[2px_2px_0_0_#000] shrink-0">
                  <User size={14} />
                </div>
                <span className="text-xs font-bold truncate flex-1">
                  {user?.username ?? "User"}
                </span>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  aria-label="登出"
                  title="登出"
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-2 border-transparent hover:border-border shrink-0"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`hidden md:flex flex-col border-r-2 border-border bg-card transition-all ${
        sidebarCollapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b-2 border-border">
        {!sidebarCollapsed && (
          <span className="font-head text-base font-bold tracking-tight">SuperPmAgent</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 border-2 border-border bg-background hover:bg-primary hover:shadow-[2px_2px_0_0_#000] active:shadow-none transition-all text-foreground"
        >
          {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-3 space-y-1 px-2">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-2 transition-all ${
                isActive
                  ? "border-border bg-primary text-foreground shadow-[3px_3px_0_0_#000]"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-background hover:shadow-[2px_2px_0_0_#000]"
              }`
            }
          >
            <Icon size={18} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t-2 border-border p-3">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-border bg-muted flex items-center justify-center shadow-[2px_2px_0_0_#000] overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 border-2 border-border bg-muted flex items-center justify-center shadow-[2px_2px_0_0_#000] overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} />
              )}
            </div>
            <span className="text-xs font-bold truncate flex-1">
              {user?.username ?? "User"}
            </span>
            <button
              onClick={() => logout()}
              aria-label="登出"
              title="登出"
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-2 border-transparent hover:border-border shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AppLayout() {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground">
      <MobileNav />
      <AppSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
