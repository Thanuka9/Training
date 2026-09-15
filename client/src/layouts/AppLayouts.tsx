import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  Database,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/training-programs", label: "Training Programs", icon: BookOpen },
  { to: "/admin/records", label: "Participation Records", icon: ClipboardList },
  { to: "/admin/master-data", label: "Master Data", icon: Database },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/audit", label: "Audit", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const userLinks = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/training", label: "My Training", icon: GraduationCap },
  { to: "/app/training/new", label: "Add Training Record", icon: ClipboardList },
  { to: "/app/profile", label: "Profile", icon: UserRound },
];

function TopBar({ home }: { home: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b-2 border-gold bg-navy text-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-5">
        <BrandMark to={home} light compact />
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.fullName}</p>
              <p className="text-xs text-white/70">Bank ID: {user.bankId} · {user.role === "ADMIN" ? "Administrator" : "Officer"}</p>
            </div>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavItems({
  links,
}: {
  links: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[];
}) {
  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                isActive ? "bg-navy text-white shadow-sm" : "text-slate-700 hover:bg-slate-100",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.label}
          </NavLink>
        );
      })}
    </>
  );
}

export function AdminLayout() {
  return (
    <div className="min-h-svh bg-paper">
      <TopBar home="/admin" />
      <div className="flex min-h-[calc(100svh-62px)]">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
          <p className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Administration</p>
          <nav className="flex flex-col gap-0.5 p-3 pt-1">
            <NavItems links={adminLinks} />
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
            <NavItems links={adminLinks} />
          </nav>
          <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function UserLayout() {
  return (
    <div className="min-h-svh bg-paper">
      <TopBar home="/app" />
      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <NavItems links={userLinks} />
        </nav>
        <Outlet />
      </div>
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="min-h-svh bg-paper">
      <header className="border-b-2 border-gold bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <BrandMark to="/" light />
          <div className="flex gap-2">
            <Link to="/login" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-navy">
              Login
            </Link>
            <Link to="/register" className="rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10">
              Register
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
