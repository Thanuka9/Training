import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { deliveryLabel, formatDate, locationLabel } from "@/lib/format";
import { useAuth } from "@/features/auth/AuthProvider";

export function UserDashboardPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["user-dashboard"], queryFn: userApi.dashboard });
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Officer"}`}
        description={`Bank ID: ${user?.bankId ?? "—"}. These figures are your own participation records only.`}
        actions={
          <Link to="/app/training/new">
            <Button>Add Training Record</Button>
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Training Records" value={data?.kpis.total ?? "—"} />
        <KpiCard label="Draft" value={data?.kpis.draft ?? "—"} />
        <KpiCard label="Pending Review" value={data?.kpis.pendingReview ?? "—"} />
        <KpiCard label="Approved" value={data?.kpis.approved ?? "—"} />
        <KpiCard label="Completed" value={data?.kpis.completed ?? "—"} />
        <KpiCard label="Local" value={data?.kpis.local ?? "—"} />
        <KpiCard label="Foreign" value={data?.kpis.foreign ?? "—"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Recent Training</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            empty={!data?.recent.length}
            emptyMessage="No training records yet. Add a record to get started."
          >
            <Table>
              <THead>
                <tr>
                  <Th>Name of the Training Program</Th>
                  <Th>Local / Foreign</Th>
                  <Th>Physical / Online</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Status of Completion</Th>
                  <Th>Workflow Status</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {data?.recent.map((item) => (
                  <tr key={item.id}>
                    <Td className="font-medium">{item.trainingProgram.name}</Td>
                    <Td>{locationLabel(item.trainingProgram.locationScope)}</Td>
                    <Td>{deliveryLabel(item.deliveryMode)}</Td>
                    <Td>{formatDate(item.fromDate)}</Td>
                    <Td>{formatDate(item.toDate)}</Td>
                    <Td>
                      <CompletionBadge status={item.completionStatus.name} />
                    </Td>
                    <Td>
                      <WorkflowBadge status={item.workflowStatus} />
                    </Td>
                    <Td>
                      <Link className="font-medium text-navy underline" to={`/app/training/${item.id}`}>
                        View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
