import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiRequestError } from "@/api/client";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bankIdNeedsPadding, normalizeBankId } from "@/lib/bankId";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bankId, setBankId] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ kind: "pending" | "imported"; text: string } | null>(null);
  const [padDialog, setPadDialog] = useState<{ before: string; after: string; resumeSubmit: boolean } | null>(null);
  const acknowledgedPadRef = useRef<string | null>(null);

  function applyBankIdPadding(value: string) {
    const before = value.trim();
    const after = normalizeBankId(value);
    if (!before || before === after) return after;
    setBankId(after);
    if (acknowledgedPadRef.current !== after) {
      setPadDialog({ before, after, resumeSubmit: false });
    }
    return after;
  }

  function onBankIdBlur() {
    if (bankIdNeedsPadding(bankId)) {
      applyBankIdPadding(bankId);
    } else {
      setBankId(bankId.trim());
    }
  }

  async function submitLogin(normalizedBankId: string) {
    setStatusMessage(null);
    setPending(true);
    try {
      const user = await login({ bankId: normalizedBankId, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || (user.role === "ADMIN" ? "/admin" : "/app"), { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "ACCOUNT_PENDING") {
        setStatusMessage({ kind: "pending", text: error.message });
      } else if (error instanceof ApiRequestError && error.code === "ACCOUNT_IMPORTED") {
        setStatusMessage({ kind: "imported", text: error.message });
      } else {
        toast.error(error instanceof Error ? error.message : "Login failed");
      }
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const before = bankId.trim();
    const after = normalizeBankId(bankId);
    if (before && before !== after && acknowledgedPadRef.current !== after) {
      setBankId(after);
      setPadDialog({ before, after, resumeSubmit: true });
      return;
    }
    setBankId(after);
    await submitLogin(after);
  }

  function onPadConfirm() {
    if (!padDialog) return;
    acknowledgedPadRef.current = padDialog.after;
    setBankId(padDialog.after);
    const shouldSubmit = padDialog.resumeSubmit;
    setPadDialog(null);
    if (shouldSubmit) {
      void submitLogin(padDialog.after);
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
          {statusMessage ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p>{statusMessage.text}</p>
              {statusMessage.kind === "imported" ? (
                <p className="mt-2">
                  <Link className="font-semibold text-navy underline" to="/register">
                    Register to claim this Bank ID
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="bankId">Bank ID</Label>
              <Input
                id="bankId"
                autoComplete="username"
                value={bankId}
                onChange={(e) => {
                  acknowledgedPadRef.current = null;
                  setBankId(e.target.value);
                }}
                onBlur={onBankIdBlur}
                required
              />
              <p className="mt-1 text-xs text-muted">
                Use at least 4 characters. Shorter IDs are padded with leading zeros (e.g. 12 → 0012).
              </p>
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

      <ConfirmDialog
        open={Boolean(padDialog)}
        title="Bank ID will be padded"
        description={
          padDialog
            ? `Bank IDs are stored as at least 4 characters. Your ID "${padDialog.before}" will be used as "${padDialog.after}".`
            : ""
        }
        confirmLabel="Continue"
        onConfirm={onPadConfirm}
        onClose={() => setPadDialog(null)}
      />
    </main>
  );
}
