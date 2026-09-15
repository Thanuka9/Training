import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { deliveryLabel, formatDate, formatDateTime, locationLabel } from "@/lib/format";
import { searchParamsRecord } from "@/lib/utils";

export function AdminRecordsPage() {
  const [params, setParams] = useSearchParams();
  const lookups = useQuery({ queryKey: ["admin-lookups"], queryFn: adminApi.lookups });
  const filters = searchParamsRecord(params);
  const query = useQuery({
    queryKey: ["admin-records", filters],
    queryFn: () => adminApi.participations({ ...filters, pageSize: 30 }),
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div>
      <PageHeader title="Participation Records" description="Review, correct and decide submitted training records." />
      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Search</Label>
            <Input defaultValue={params.get("search") ?? ""} placeholder="Officer, Bank ID, programme, institution, venue" onBlur={(e) => setFilter("search", e.target.value)} />
          </div>
          <div>
            <Label>Workflow</Label>
            <Select value={params.get("workflowStatus") ?? ""} onChange={(e) => setFilter("workflowStatus", e.target.value)}>
              <option value="">All</option>
              {["DRAFT", "SUBMITTED", "RETURNED", "APPROVED", "REJECTED"].map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </div>
          <div>
            <Label>Local / Foreign</Label>
            <Select value={params.get("locationScope") ?? ""} onChange={(e) => setFilter("locationScope", e.target.value)}>
              <option value="">All</option>
              <option value="LOCAL">Local</option>
              <option value="FOREIGN">Foreign</option>
            </Select>
          </div>
          <div>
            <Label>Physical / Online</Label>
            <Select value={params.get("deliveryMode") ?? ""} onChange={(e) => setFilter("deliveryMode", e.target.value)}>
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={params.get("participationRoleId") ?? ""} onChange={(e) => setFilter("participationRoleId", e.target.value)}>
              <option value="">All</option>
              {lookups.data?.participationRoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Completion</Label>
            <Select value={params.get("completionStatusId") ?? ""} onChange={(e) => setFilter("completionStatusId", e.target.value)}>
              <option value="">All</option>
              {lookups.data?.completionStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <QueryState isLoading={query.isLoading} error={query.error} empty={!query.data?.items.length}>
            <Table>
              <THead>
                <tr>
                  <Th>Name of the Officer</Th>
                  <Th>Bank ID</Th>
                  <Th>Name of the Training Program</Th>
                  <Th>Local / Foreign</Th>
                  <Th>Physical / Online</Th>
                  <Th>Participating the Training as</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Status of Completion</Th>
                  <Th>Workflow Status</Th>
                  <Th>Submitted At</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {query.data?.items.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.officer.fullName}</Td>
                    <Td>{item.officer.bankId}</Td>
                    <Td>{item.trainingProgram.name}</Td>
                    <Td>{locationLabel(item.trainingProgram.locationScope)}</Td>
                    <Td>{deliveryLabel(item.deliveryMode)}</Td>
                    <Td>{item.participationRole.name}</Td>
                    <Td>{formatDate(item.fromDate)}</Td>
                    <Td>{formatDate(item.toDate)}</Td>
                    <Td><CompletionBadge status={item.completionStatus.name} /></Td>
                    <Td><WorkflowBadge status={item.workflowStatus} /></Td>
                    <Td>{formatDateTime(item.submittedAt)}</Td>
                    <Td>
                      <Link className="text-navy underline" to={`/admin/records/${item.id}`}>View</Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>{query.data?.total} records</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={(query.data?.page ?? 1) <= 1} onClick={() => setFilter("page", String((query.data?.page ?? 1) - 1))}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={(query.data?.page ?? 1) >= (query.data?.totalPages ?? 1)} onClick={() => setFilter("page", String((query.data?.page ?? 1) + 1))}>Next</Button>
              </div>
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
