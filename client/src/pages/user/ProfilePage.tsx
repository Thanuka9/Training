import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { useAuth } from "@/features/auth/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        description="Account details come from your Bank ID login. Use this page to update your password."
      />
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-navy/10 shadow-sm">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-navy/[0.04] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Signed in as</p>
              <p className="mt-1 text-lg font-semibold text-navy">{user?.fullName ?? "—"}</p>
              <p className="text-sm text-slate-600">Bank ID {user?.bankId ?? "—"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={user?.fullName ?? ""} readOnly disabled />
              </div>
              <div>
                <Label>Bank ID</Label>
                <Input value={user?.bankId ?? ""} readOnly disabled />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-navy/10 shadow-sm">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
