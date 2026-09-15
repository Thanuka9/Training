import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/api/admin";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const COLORS = ["#1b365d", "#b08d57", "#3b82f6", "#0f766e", "#b45309", "#be123c"];

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

  const cards = useMemo(
    () => [
      ["Total Active Users", kpis.activeUsers, "/admin/users?status=ACTIVE"],
      ["Pending User Registrations", kpis.pendingRegistrations, "/admin/users?status=PENDING"],
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
            <Button variant="secondary" onClick={() => { setYear(String(new Date().getFullYear())); setFilters({ year: String(new Date().getFullYear()) }); }}>
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>
      <QueryState isLoading={summary.isLoading} error={summary.error}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1b365d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Local vs Foreign">
          <Donut data={distributions.data?.locationScope ?? []} />
        </ChartCard>
        <ChartCard title="Physical vs Online">
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
      </div>
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
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Donut({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarBlock({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" hide={data.length > 6} interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#1b365d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
