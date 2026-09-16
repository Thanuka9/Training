import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/api/admin";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { BarBlock, ChartCard, Donut } from "@/components/Charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { LINE_COLOR, GOLD_COLOR } from "@/lib/chartColors";
import { deliveryLabel, formatDate, locationLabel } from "@/lib/format";
import { useAuth } from "@/features/auth/AuthProvider";

export function AdminMePage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-self-dashboard"],
    queryFn: adminApi.selfDashboard,
  });
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My dashboard"
        description={
          data
            ? `Your personal attendance as ${data.user.fullName} (Bank ID ${data.user.bankId}). Department-wide metrics stay on Dashboard.`
            : `Signed in as ${user?.fullName ?? "Admin"} · Bank ID ${user?.bankId ?? "—"}.`
        }
        actions={
          <Link to="/admin">
            <Button variant="secondary">Department dashboard</Button>
          </Link>
        }
      />
      <QueryState isLoading={query.isLoading} error={query.error} empty={!data}>
        {data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                <Badge tone="navy">ADMIN</Badge>
                <Badge tone={data.user.status === "ACTIVE" ? "green" : "amber"}>{data.user.status}</Badge>
                <span className="text-slate-700">
                  <span className="font-medium">{data.user.fullName}</span>
                  {" · Bank ID "}
                  {data.user.bankId}
                </span>
              </CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Trainings attended" value={data.kpis.attended} hint="Excludes drafts" />
              <KpiCard label="Completed" value={data.kpis.completed} />
              <KpiCard label="Local" value={data.kpis.local} />
              <KpiCard label="Foreign" value={data.kpis.foreign} />
              <KpiCard label="Physical" value={data.kpis.physical} />
              <KpiCard label="Online" value={data.kpis.online} />
              <KpiCard label="Hybrid" value={data.kpis.hybrid} />
              <KpiCard label="Pending review" value={data.kpis.pendingReview} />
              <KpiCard label="Approved" value={data.kpis.approved} />
              <KpiCard label="Drafts" value={data.kpis.draft} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Trainings by year">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.yearly.map((item) => ({ ...item, label: String(item.year) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="local" name="Local" fill={LINE_COLOR} />
                    <Bar dataKey="foreign" name="Foreign" fill={GOLD_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Local vs Foreign">
                <Donut data={data.distributions.locationScope} />
              </ChartCard>
              <ChartCard title="Physical vs Online vs Hybrid">
                <Donut data={data.distributions.deliveryMode} />
              </ChartCard>
              <ChartCard title="Completion status">
                <BarBlock data={data.distributions.completionStatus} />
              </ChartCard>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent training records</CardTitle>
              </CardHeader>
              <CardContent>
                <QueryState
                  isLoading={false}
                  empty={!data.recent.length}
                  emptyMessage="No personal participation records yet. Admins are separate accounts; training here is optional."
                >
                  <Table>
                    <THead>
                      <tr>
                        <Th>Programme</Th>
                        <Th>Local / Foreign</Th>
                        <Th>Mode</Th>
                        <Th>From</Th>
                        <Th>To</Th>
                        <Th>Completion</Th>
                        <Th>Workflow</Th>
                        <Th></Th>
                      </tr>
                    </THead>
                    <tbody>
                      {data.recent.map((item) => (
                        <tr key={item.id}>
                          <Td>{item.trainingProgram.name}</Td>
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
                            <Link className="text-navy underline" to={`/admin/records/${item.id}`}>
                              Open
                            </Link>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </QueryState>
              </CardContent>
            </Card>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
