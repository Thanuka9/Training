import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiRequestError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bankId, setBankId] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPendingMessage("");
    setPending(true);
    try {
      const user = await login({ bankId, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || (user.role === "ADMIN" ? "/admin" : "/app"), { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "ACCOUNT_PENDING") {
        setPendingMessage(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : "Login failed");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted">Officer / Administrator access</p>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMessage ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              {pendingMessage}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="bankId">Bank ID</Label>
              <Input id="bankId" autoComplete="username" value={bankId} onChange={(e) => setBankId(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Login"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted">
            New officer?{" "}
            <Link className="font-medium text-navy underline" to="/register">
              Register with Full Name and Bank ID
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
