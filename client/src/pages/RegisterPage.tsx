import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { ApiRequestError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [bankId, setBankId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await authApi.register({ fullName, bankId, password, confirmPassword });
      setDone(result.message);
      toast.success("Registration submitted");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Registration failed");
    } finally {
      setPending(false);
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
                <Input id="bankId" autoComplete="username" value={bankId} onChange={(e) => setBankId(e.target.value)} required />
                <p className="mt-1 text-xs text-muted">This is your permanent identifier. It cannot be changed later.</p>
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
    </main>
  );
}
