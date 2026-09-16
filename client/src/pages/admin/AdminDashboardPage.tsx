import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/admin";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarBlock, ChartCard, Donut } from "@/components/Charts";
import { LINE_COLOR } from "@/lib/chartColors";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [filters, setFilters] = useState<Record<string, string>>({ year: String(new Date().getFullYear()) });
  const lookups = useQuery({ queryKey: ["admin-lookups"], queryFn: adminApi.lookups });
  const summary = useQuery({ queryKey: ["admin-summary", filters], queryFn: () => adminApi.summary(filters) });
  const monthly = useQuery({ queryKey: ["admin-monthly", filters], queryFn: () => adminApi.monthly(filters) });
  const distributions = useQuery({ queryKey: ["admin-dist", filters], queryFn: () => adminApi.distributions(filters) });
  const institutions = useQuery({ queryKey: ["admin-inst", filters], queryFn: () => adminApi.topInstitutions(filters) });
  const officers = useQuery({ queryKey: ["admin-officers", filters], queryFn: () => adminApi.topOfficers(filters) });

  const kpis = (summary.data?.kpis ?? {}) as Record<string, number>;
  const neverAttended =
    (summary.data?.neverAttendedOfficers as Array<{ id: string; fullName: string; bankId: string; status: string }> | undefined) ?? [];

  const cards = useMemo(
    () => [
      ["Total Active Users", kpis.activeUsers, "/admin/users?status=ACTIVE"],
      ["Pending User Registrations", kpis.pendingRegistrations, "/admin/users?status=PENDING"],
      ["Officers with training", kpis.officersWithTraining, "/admin/users?neverAttended=false"],
      ["Officers with no training", kpis.officersNeverAttended, "/admin/users?neverAttended=true"],
      ["Total Training Programs", kpis.totalPrograms, "/admin/training-programs"],
      ["Total Participation Records", kpis.totalSubmittedRecords, "/admin/records"],
      ["Pending Reviews", kpis.pendingReviews, "/admin/records?workflowStatus=SUBMITTED"],
      ["Approved Records", kpis.approvedRecords, "/admin/records?workflowStatus=APPROVED"],
      ["Completed Trainings", kpis.completedTrainings, "/admin/records"],
      ["Completion Rate", kpis.completionRate != null ? `${kpis.completionRate}%` : "—", "/admin/reports"],
      ["Local Trainings", kpis.localTrainings, "/admin/records?locationScope=LOCAL"],
      ["Foreign Trainings", kpis.foreignTrainings, "/admin/records?locationScope=FOREIGN"],
      ["Physical Trainings", kpis.physicalTrainings, "/admin/records?deliveryMode=PHYSICAL"],
      ["Online Trainings", kpis.onlineTrainings, "/admin/records?deliveryMode=ONLINE"],
      ["Hybrid Trainings", kpis.hybridTrainings, "/admin/records?deliveryMode=HYBRID"],
    ],
    [kpis],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Department-wide training activity. Drafts are excluded from submitted metrics."
      />
      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <div>
            <Label>Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onBlur={() => setFilters((current) => ({ ...current, year }))}
            />
          </div>
          <div>
            <Label>Local / Foreign</Label>
            <Select
              value={filters.locationScope ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, locationScope: e.target.value }))}
            >
              <option value="">All</option>
              <option value="LOCAL">Local</option>
              <option value="FOREIGN">Foreign</option>
            </Select>
          </div>
          <div>
            <Label>Physical / Online</Label>
            <Select
              value={filters.deliveryMode ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, deliveryMode: e.target.value }))}
            >
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>
          <div>
            <Label>Training Type</Label>
            <Select
              value={filters.trainingTypeId ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, trainingTypeId: e.target.value }))}
            >
              <option value="">All</option>
              {lookups.data?.trainingTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-4">
            <Button
              variant="secondary"
              onClick={() => {
                setYear(String(new Date().getFullYear()));
                setFilters({ year: String(new Date().getFullYear()) });
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>
      <QueryState isLoading={summary.isLoading} error={summary.error}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(([label, value, href]) => (
            <KpiCard key={String(label)} label={String(label)} value={value ?? "—"} onClick={() => navigate(String(href))} />
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Completion rate = Completed / (Completed + Not Completed). Planned and ongoing records are excluded from the denominator.
        </p>
      </QueryState>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Training participation by month">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly.data?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" name="Participations" dataKey="count" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 3, fill: LINE_COLOR }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Local vs Foreign">
          <Donut data={distributions.data?.locationScope ?? []} />
        </ChartCard>
        <ChartCard title="Physical vs Online vs Hybrid">
          <Donut data={distributions.data?.deliveryMode ?? []} />
        </ChartCard>
        <ChartCard title="Participation role">
          <BarBlock data={distributions.data?.participationRole ?? []} />
        </ChartCard>
        <ChartCard title="Completion status">
          <BarBlock data={distributions.data?.completionStatus ?? []} />
        </ChartCard>
        <ChartCard title="Training type distribution">
          <BarBlock data={distributions.data?.trainingType ?? []} />
        </ChartCard>
        <ChartCard title="Top training institutions">
          <BarBlock data={institutions.data ?? []} />
        </ChartCard>
        <ChartCard title="Officers with highest participations">
          <BarBlock data={(officers.data ?? []).map((item) => ({ name: item.name, count: item.count }))} />
        </ChartCard>
        <ChartCard title="Trainings per officer (coverage)">
          <BarBlock
            data={
              ((summary.data?.attendanceBuckets as Array<{ name: string; count: number }> | undefined) ?? []).map(
                (item) => ({ name: item.name, count: item.count }),
              )
            }
          />
        </ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {((summary.data?.pendingReviewsList as Array<{ id: string; officer: string; program: string }> | undefined) ?? []).map((item) => (
                <li key={item.id}>
                  <button className="text-left text-navy underline" onClick={() => navigate(`/admin/records/${item.id}`)}>
                    {item.officer} — {item.program}
                  </button>
                </li>
              ))}
              {!((summary.data?.pendingReviewsList as unknown[]) ?? []).length ? (
                <li className="text-slate-500">No pending reviews.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Officers who have not attended any training</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {neverAttended.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <button className="text-left text-navy underline" onClick={() => navigate(`/admin/records?bankId=${item.bankId}`)}>
                    {item.fullName} ({item.bankId})
                  </button>
                  <span className="text-xs text-slate-500">{item.status}</span>
                </li>
              ))}
              {!neverAttended.length ? (
                <li className="text-slate-500">Every officer has at least one submitted training record.</li>
              ) : null}
            </ul>
            {neverAttended.length ? (
              <button className="mt-3 text-sm text-navy underline" onClick={() => navigate("/admin/users?neverAttended=true")}>
                View full list
              </button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
