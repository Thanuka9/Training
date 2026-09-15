import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { searchParamsRecord } from "@/lib/utils";
import type { PublicUser } from "@/types";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; action: string; title: string; danger?: boolean } | null>(null);
  const [promote, setPromote] = useState<PublicUser | null>(null);

  const query = useQuery({
    queryKey: ["admin-users", params.toString()],
    queryFn: () =>
      adminApi.users({
        search: params.get("search") ?? "",
        status: params.get("status") ?? "",
        pageSize: 50,
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
        description="Approve registrations and manage officer accounts."
        actions={<Button onClick={() => setCreateOpen(true)}>Add user</Button>}
      />
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
          <Button variant="secondary" onClick={() => setParams({ ...searchParamsRecord(params), search })}>
            Search
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
            <Table>
              <THead>
                <tr>
                  <Th>Bank ID</Th>
                  <Th>Full Name</Th>
                  <Th>Role</Th>
                  <Th>Account Status</Th>
                  <Th>Training Count</Th>
                  <Th>Registered</Th>
                  <Th>Last Login</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((user) => (
                  <tr key={user.id}>
                    <Td>{user.bankId}</Td>
                    <Td>{user.fullName}</Td>
                    <Td>{user.role}</Td>
                    <Td>
                      <Badge tone={user.status === "ACTIVE" ? "green" : user.status === "PENDING" ? "amber" : "red"}>
                        {user.status}
                      </Badge>
                    </Td>
                    <Td>{user.trainingCount ?? 0}</Td>
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
                      {user.role === "USER" && user.status === "ACTIVE" ? (
                        <button className="text-navy underline" onClick={() => setPromote(user)}>Promote</button>
                      ) : null}
                      <Link className="text-navy underline" to={`/admin/records?bankId=${user.bankId}`}>History</Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
      <ConfirmDialog
        open={Boolean(promote)}
        title="Promote to Admin"
        description={`Give ${promote?.fullName} administrator access?`}
        confirmLabel="Promote"
        onClose={() => setPromote(null)}
        onConfirm={async () => {
          if (!promote) return;
          try {
            await adminApi.updateUser(promote.id, { role: "ADMIN" });
            toast.success("User promoted");
            await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to promote user");
          }
          setPromote(null);
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

  return (
    <Modal open={open} title="Add user" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await adminApi.createUser({ fullName, bankId, password, role: "USER", status: "ACTIVE" });
            toast.success("User created as active");
            setFullName("");
            setBankId("");
            setPassword("");
            await onCreated();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create user");
          }
        }}
      >
        <div>
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label>Bank ID</Label>
          <Input value={bankId} onChange={(e) => setBankId(e.target.value)} required />
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
  );
}
