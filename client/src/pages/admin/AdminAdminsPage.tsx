import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { bankIdNeedsPadding, normalizeBankId } from "@/lib/bankId";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";

export function AdminAdminsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; action: "disable" | "reactivate"; title: string } | null>(null);

  const query = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => adminApi.admins({ page: 1, pageSize: 100 }),
    enabled: Boolean(user?.isSuperAdmin),
  });

  if (!user?.isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  async function run(action: "disable" | "reactivate", id: string) {
    try {
      if (action === "disable") await adminApi.disableUser(id);
      else await adminApi.reactivateUser(id);
      toast.success("Admin account updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update admin");
    }
  }

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Create separate administrator accounts. Only the super admin (from ADMIN_BANK_ID) can manage this list. Officers are never promoted to admin."
        actions={<Button onClick={() => setCreateOpen(true)}>Add admin</Button>}
      />
      <Card>
        <CardContent className="pt-4">
          <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length} emptyMessage="No admin accounts yet.">
            <Table>
              <THead>
                <tr>
                  <Th>Bank ID</Th>
                  <Th>Full Name</Th>
                  <Th>Status</Th>
                  <Th>Registered</Th>
                  <Th>Last Login</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((admin) => (
                  <tr key={admin.id}>
                    <Td>
                      {admin.bankId}
                      {admin.isSuperAdmin ? (
                        <Badge tone="navy" className="ml-2">
                          Super
                        </Badge>
                      ) : null}
                    </Td>
                    <Td>{admin.fullName}</Td>
                    <Td>
                      <Badge tone={admin.status === "ACTIVE" ? "green" : "red"}>{admin.status}</Badge>
                    </Td>
                    <Td>{formatDateTime(admin.createdAt)}</Td>
                    <Td>{formatDateTime(admin.lastLoginAt)}</Td>
                    <Td className="space-x-2 whitespace-nowrap">
                      {admin.isSuperAdmin ? (
                        <span className="text-xs text-muted">Protected</span>
                      ) : admin.status === "ACTIVE" ? (
                        <button
                          className="text-red-700 underline"
                          onClick={() =>
                            setConfirm({ id: admin.id, action: "disable", title: "Disable this admin account?" })
                          }
                        >
                          Disable
                        </button>
                      ) : admin.status === "DISABLED" ? (
                        <button
                          className="text-navy underline"
                          onClick={() =>
                            setConfirm({ id: admin.id, action: "reactivate", title: "Reactivate this admin account?" })
                          }
                        >
                          Reactivate
                        </button>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
      <CreateAdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
        }}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description="This action will be recorded in the audit log."
        danger={confirm?.action === "disable"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void run(confirm.action, confirm.id);
          setConfirm(null);
        }}
      />
    </div>
  );
}

function CreateAdminModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [bankId, setBankId] = useState("");
  const [password, setPassword] = useState("");
  const [padDialog, setPadDialog] = useState<{ before: string; after: string; resumeSubmit: boolean } | null>(null);
  const acknowledgedPadRef = useRef<string | null>(null);

  async function createAdmin(normalizedBankId: string) {
    try {
      await adminApi.createAdmin({ fullName, bankId: normalizedBankId, password });
      toast.success("Admin account created");
      setFullName("");
      setBankId("");
      setPassword("");
      acknowledgedPadRef.current = null;
      await onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create admin");
    }
  }

  return (
    <>
      <Modal open={open} title="Add admin" onClose={onClose}>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const before = bankId.trim();
            const after = normalizeBankId(bankId);
            if (before && before !== after && acknowledgedPadRef.current !== after) {
              setBankId(after);
              setPadDialog({ before, after, resumeSubmit: true });
              return;
            }
            setBankId(after);
            await createAdmin(after);
          }}
        >
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label>Bank ID</Label>
            <Input
              value={bankId}
              onChange={(e) => {
                acknowledgedPadRef.current = null;
                setBankId(e.target.value);
              }}
              onBlur={() => {
                if (bankIdNeedsPadding(bankId)) {
                  const before = bankId.trim();
                  const after = normalizeBankId(bankId);
                  setBankId(after);
                  if (acknowledgedPadRef.current !== after) {
                    setPadDialog({ before, after, resumeSubmit: false });
                  }
                } else {
                  setBankId(bankId.trim());
                }
              }}
              required
            />
            <p className="mt-1 text-xs text-muted">
              Bank ID is the login username. Must not match the reserved super admin ID from ADMIN_BANK_ID.
            </p>
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create admin</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(padDialog)}
        title="Bank ID will be padded"
        description={
          padDialog
            ? `Bank IDs are stored as at least 4 characters. This ID "${padDialog.before}" will be saved as "${padDialog.after}".`
            : ""
        }
        confirmLabel="Continue"
        onConfirm={() => {
          if (!padDialog) return;
          acknowledgedPadRef.current = padDialog.after;
          setBankId(padDialog.after);
          const shouldSubmit = padDialog.resumeSubmit;
          setPadDialog(null);
          if (shouldSubmit) void createAdmin(padDialog.after);
        }}
        onClose={() => setPadDialog(null)}
      />
    </>
  );
}
