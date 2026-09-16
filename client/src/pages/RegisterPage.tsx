import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiRequestError } from "@/api/client";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bankIdNeedsPadding, normalizeBankId } from "@/lib/bankId";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [bankId, setBankId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState("");
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

  async function submitRegistration(normalizedBankId: string) {
    setPending(true);
    try {
      const result = await authApi.register({
        fullName,
        bankId: normalizedBankId,
        password,
        confirmPassword,
      });
      setDone(result.message);
      toast.success("Registration submitted");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Registration failed");
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
    await submitRegistration(after);
  }

  function onPadConfirm() {
    if (!padDialog) return;
    acknowledgedPadRef.current = padDialog.after;
    setBankId(padDialog.after);
    const shouldSubmit = padDialog.resumeSubmit;
    setPadDialog(null);
    if (shouldSubmit) {
      void submitRegistration(padDialog.after);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted">Officer registration</p>
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-sm text-slate-700">
              <p>{done}</p>
              <Link to="/login" className="font-medium text-navy underline">
                Return to login
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
              </div>
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
                  Permanent identifier (min. 4 characters; shorter IDs are padded with leading zeros, e.g. 12 → 0012). Cannot be changed later.
                </p>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Submitting…" : "Submit for approval"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(padDialog)}
        title="Bank ID will be padded"
        description={
          padDialog
            ? `Bank IDs are stored as at least 4 characters. Your ID "${padDialog.before}" will be saved as "${padDialog.after}".`
            : ""
        }
        confirmLabel="Continue"
        onConfirm={onPadConfirm}
        onClose={() => setPadDialog(null)}
      />
    </main>
  );
}
