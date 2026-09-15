import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Role } from "@/types";

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Checking session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/app"} replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user?.role === "USER") return <Navigate to="/app" replace />;
  return <Outlet />;
}
