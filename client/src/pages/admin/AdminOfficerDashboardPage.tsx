import { Link, useParams } from "react-router-dom";
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

export function AdminOfficerDashboardPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["admin-officer-dashboard", id],
    queryFn: () => adminApi.userDashboard(id!),
    enabled: Boolean(id),
  });
  const data = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data ? data.user.fullName : "Officer dashboard"}
        description={
          data
            ? `Bank ID ${data.user.bankId} · ${data.user.status}. Same personal stats the officer sees, plus year-wise attendance.`
            : "Loading officer statistics…"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/analytics/compare">
              <Button variant="secondary">Compare officers</Button>
            </Link>
            {data ? (
              <Link to={`/admin/records?bankId=${encodeURIComponent(data.user.bankId)}`}>
                <Button variant="secondary">Training history</Button>
              </Link>
            ) : null}
            <Link to="/admin/users">
              <Button variant="secondary">Back to users</Button>
            </Link>
          </div>
        }
      />
      <QueryState isLoading={query.isLoading} error={query.error} empty={!data}>
        {data ? (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone={data.user.status === "ACTIVE" ? "green" : "amber"}>{data.user.status}</Badge>
              <Badge tone="navy">{data.kpis.attended} trainings attended</Badge>
            </div>
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
                <QueryState isLoading={false} empty={!data.recent.length} emptyMessage="No participation records yet.">
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
