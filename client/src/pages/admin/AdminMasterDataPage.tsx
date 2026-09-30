import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { useAuth } from "@/features/auth/AuthProvider";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, Th, Td } from "@/components/ui/table";
import type { NamedEntity } from "@/types";

export function AdminMasterDataPage() {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data"
        description="Add or archive dropdown values used on programmes and the participation form. Job positions (officer designation) are managed by the super administrator."
      />
      {isSuperAdmin ? (
        <MasterSection
          title="Job Positions"
          description="Used on officer registration. Officers cannot change their own position — admins can update it on Users."
          queryKey="job-positions"
          list={() => adminApi.jobPositions({ pageSize: 100 })}
          create={(payload) => adminApi.createJobPosition(payload)}
          update={(id, payload) => adminApi.updateJobPosition(id, payload)}
          extra
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Job Positions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Only the super administrator can add, rename or archive job positions. Admins can still assign a position when
            editing an officer.
          </CardContent>
        </Card>
      )}
      <MasterSection
        title="Training Types"
        queryKey="training-types"
        list={() => adminApi.trainingTypes({ pageSize: 100 })}
        create={(payload) => adminApi.createTrainingType(payload)}
        update={(id, payload) => adminApi.updateTrainingType(id, payload)}
        extra
      />
      <MasterSection
        title="Institutions"
        queryKey="institutions"
        list={() => adminApi.institutions({ pageSize: 100 })}
        create={(payload) => adminApi.createInstitution(payload)}
        update={(id, payload) => adminApi.updateInstitution(id, payload)}
      />
      <MasterSection
        title="Participation Roles"
        queryKey="roles"
        list={() => adminApi.roles({ pageSize: 100 })}
        create={(payload) => adminApi.createRole(payload)}
        update={(id, payload) => adminApi.updateRole(id, payload)}
        extra
      />
      <MasterSection
        title="Completion Statuses"
        queryKey="completion"
        list={() => adminApi.completionStatuses({ pageSize: 100 })}
        create={(payload) => adminApi.createCompletionStatus(payload)}
        update={(id, payload) => adminApi.updateCompletionStatus(id, payload)}
        extra
        final
      />
    </div>
  );
}

function MasterSection({
  title,
  description,
  queryKey,
  list,
  create,
  update,
  extra,
  final,
}: {
  title: string;
  description?: string;
  queryKey: string;
  list: () => Promise<{ items: NamedEntity[] }>;
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  extra?: boolean;
  final?: boolean;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["master", queryKey], queryFn: list });
  const [name, setName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="mt-1 text-sm font-normal text-slate-600">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <form
          className="mb-4 flex flex-wrap items-end gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await create({ name, active: true, sortOrder: (query.data?.items.length ?? 0) + 1 });
              setName("");
              toast.success("Value added");
              await queryClient.invalidateQueries({ queryKey: ["master", queryKey] });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to add value");
            }
          }}
        >
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit">Add</Button>
        </form>
        <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                {extra ? <Th>Sort</Th> : null}
                {final ? <Th>Final</Th> : null}
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {query.data?.items.map((item) => (
                <tr key={item.id}>
                  <Td>{item.name}</Td>
                  {extra ? <Td>{item.sortOrder ?? "—"}</Td> : null}
                  {final ? <Td>{item.isFinal ? "Yes" : "No"}</Td> : null}
                  <Td>
                    <Badge tone={item.active ? "green" : "slate"}>{item.active ? "Active" : "Archived"}</Badge>
                  </Td>
                  <Td>
                    <button
                      className="text-navy underline"
                      onClick={async () => {
                        try {
                          await update(item.id, { active: !item.active });
                          toast.success(item.active ? "Archived" : "Reactivated");
                          await queryClient.invalidateQueries({ queryKey: ["master", queryKey] });
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Unable to update");
                        }
                      }}
                    >
                      {item.active ? "Archive" : "Reactivate"}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  );
}
