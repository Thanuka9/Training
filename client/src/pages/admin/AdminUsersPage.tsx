import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { bankIdNeedsPadding, normalizeBankId } from "@/lib/bankId";
import { formatDate, formatDateTime } from "@/lib/format";
import { searchParamsRecord } from "@/lib/utils";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; action: string; title: string; danger?: boolean } | null>(null);

  useEffect(() => {
    setSearch(params.get("search") ?? "");
  }, [params]);

  const query = useQuery({
    queryKey: ["admin-users", params.toString()],
    queryFn: () =>
      adminApi.users({
        search: params.get("search") ?? "",
        status: params.get("status") ?? "",
        role: params.get("role") ?? "",
        neverAttended: params.get("neverAttended") ?? "",
        page: params.get("page") ?? "1",
        pageSize: 25,
      }),
  });

  async function run(action: string, id: string) {
    const map: Record<string, (userId: string) => Promise<unknown>> = {
      approve: adminApi.approveUser,
      reject: adminApi.rejectUser,
      disable: adminApi.disableUser,
      reactivate: adminApi.reactivateUser,
    };
    try {
      await map[action](id);
      toast.success("User updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user");
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Approve registrations, see how many trainings each officer has attended (officers may attend multiple programmes in a year), and export the full list. Admins are created as separate accounts — officers are not promoted."
        actions={
          <div className="flex flex-wrap gap-2">
            <DownloadButtons
              report="users"
              params={{
                search: params.get("search") ?? "",
                status: params.get("status") ?? "",
                role: params.get("role") ?? "",
                neverAttended: params.get("neverAttended") ?? "",
              }}
            />
            <Button onClick={() => setCreateOpen(true)}>Add user</Button>
          </div>
        }
      />
      {params.get("neverAttended") === "true" ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Showing officers who have not submitted any training yet.
          {params.get("search") ? ` Filtered by “${params.get("search")}”.` : ""}{" "}
          <button className="underline" onClick={() => setParams({ ...searchParamsRecord(params), neverAttended: "", search: "", page: "1" })}>
            Clear filter
          </button>
        </div>
      ) : null}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Input
            placeholder="Search name or Bank ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParams({ ...searchParamsRecord(params), search });
            }}
            className="max-w-sm"
          />
          <Select
            value={params.get("status") ?? ""}
            onChange={(e) => setParams({ ...searchParamsRecord(params), status: e.target.value })}
            className="max-w-48"
          >
            <option value="">All statuses</option>
            {["PENDING", "ACTIVE", "DISABLED", "REJECTED"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={params.get("role") ?? ""}
            onChange={(e) => setParams({ ...searchParamsRecord(params), role: e.target.value })}
            className="max-w-40"
          >
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
          <Select
            value={params.get("neverAttended") ?? ""}
            onChange={(e) => setParams({ ...searchParamsRecord(params), neverAttended: e.target.value })}
            className="max-w-56"
          >
            <option value="">All attendance</option>
            <option value="false">Has attended training</option>
            <option value="true">Has not attended any</option>
          </Select>
          <Button variant="secondary" onClick={() => setParams({ ...searchParamsRecord(params), search })}>
            Search
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            empty={!query.data?.items.length}
            emptyMessage={
              params.get("neverAttended") === "true"
                ? "No officers match this filter. Clear Never Attended or search to see more users."
                : "No users found."
            }
          >
            <Table>
              <THead>
                <tr>
                  <Th>Bank ID</Th>
                  <Th>Full Name</Th>
                  <Th>Role</Th>
                  <Th>Account Status</Th>
                  <Th>Attended</Th>
                  <Th>Completed</Th>
                  <Th>Local</Th>
                  <Th>Foreign</Th>
                  <Th>Last Training</Th>
                  <Th>Never Attended</Th>
                  <Th>Registered</Th>
                  <Th>Last Login</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((user) => (
                  <tr key={user.id} className={user.neverAttended && user.role === "USER" ? "bg-amber-50/70" : undefined}>
                    <Td>{user.bankId}</Td>
                    <Td>{user.fullName}</Td>
                    <Td>{user.role}</Td>
                    <Td>
                      <Badge tone={user.status === "ACTIVE" ? "green" : user.status === "PENDING" ? "amber" : "red"}>
                        {user.status}
                      </Badge>
                    </Td>
                    <Td className="font-semibold">{user.attended ?? 0}</Td>
                    <Td>{user.completed ?? 0}</Td>
                    <Td>{user.local ?? 0}</Td>
                    <Td>{user.foreign ?? 0}</Td>
                    <Td>{formatDate(user.lastTrainingDate)}</Td>
                    <Td>
                      {user.role === "USER" ? (
                        <Badge tone={user.neverAttended ? "amber" : "green"}>{user.neverAttended ? "Yes" : "No"}</Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{formatDateTime(user.createdAt)}</Td>
                    <Td>{formatDateTime(user.lastLoginAt)}</Td>
                    <Td className="space-x-2 whitespace-nowrap">
                      {user.status === "PENDING" ? (
                        <>
                          <button className="text-navy underline" onClick={() => setConfirm({ id: user.id, action: "approve", title: "Approve this registration?" })}>Approve</button>
                          <button className="text-red-700 underline" onClick={() => setConfirm({ id: user.id, action: "reject", title: "Reject this registration?", danger: true })}>Reject</button>
                        </>
                      ) : null}
                      {user.status === "ACTIVE" ? (
                        <button className="text-red-700 underline" onClick={() => setConfirm({ id: user.id, action: "disable", title: "Disable this account?", danger: true })}>Disable</button>
                      ) : null}
                      {user.status === "DISABLED" ? (
                        <button className="text-navy underline" onClick={() => setConfirm({ id: user.id, action: "reactivate", title: "Reactivate this account?" })}>Reactivate</button>
                      ) : null}
                      {user.role === "USER" ? (
                        <Link className="text-navy underline" to={`/admin/users/${user.id}/dashboard`}>
                          Dashboard
                        </Link>
                      ) : null}
                      <Link className="text-navy underline" to={`/admin/users?search=${encodeURIComponent(user.bankId)}`}>
                        Open
                      </Link>
                      <Link className="text-navy underline" to={`/admin/records?bankId=${encodeURIComponent(user.bankId)}`}>
                        History
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>
                {query.data?.total} users · page {query.data?.page} of {query.data?.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(query.data?.page ?? 1) <= 1}
                  onClick={() => setParams({ ...searchParamsRecord(params), page: String((query.data?.page ?? 1) - 1) })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(query.data?.page ?? 1) >= (query.data?.totalPages ?? 1)}
                  onClick={() => setParams({ ...searchParamsRecord(params), page: String((query.data?.page ?? 1) + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </QueryState>
        </CardContent>
      </Card>
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description="This action will be recorded in the audit log."
        danger={confirm?.danger}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void run(confirm.action, confirm.id);
          setConfirm(null);
        }}
      />
    </div>
  );
}

function CreateUserModal({
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
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [padDialog, setPadDialog] = useState<{ before: string; after: string; resumeSubmit: boolean } | null>(null);
  const acknowledgedPadRef = useRef<string | null>(null);

  async function createUser(normalizedBankId: string) {
    try {
      await adminApi.createUser({ fullName, bankId: normalizedBankId, password, role, status: "ACTIVE" });
      toast.success(role === "ADMIN" ? "Admin account created" : "User created as active");
      setFullName("");
      setBankId("");
      setPassword("");
      setRole("USER");
      acknowledgedPadRef.current = null;
      await onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user");
    }
  }

  return (
    <>
      <Modal open={open} title="Add user" onClose={onClose}>
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
            await createUser(after);
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
              Min. 4 characters; shorter IDs are padded with leading zeros. Bank ID is the login username.
            </p>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}>
              <option value="USER">USER (officer)</option>
              <option value="ADMIN">ADMIN (separate admin account)</option>
            </Select>
            <p className="mt-1 text-xs text-muted">
              Defaults to officer. Choose ADMIN only to create a separate administrator with their own Bank ID and password — do not convert existing officers.
            </p>
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create</Button>
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
          if (shouldSubmit) void createUser(padDialog.after);
        }}
        onClose={() => setPadDialog(null)}
      />
    </>
  );
}
