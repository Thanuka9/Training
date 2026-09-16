import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/api/admin";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { BarBlock, ChartCard, Donut } from "@/components/Charts";
import { GOLD_COLOR, LINE_COLOR } from "@/lib/chartColors";
import { Badge } from "@/components/ui/badge";

const YEAR_OPTIONS = ["2022", "2023", "2024", "2025", "2026"];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({ year: String(new Date().getFullYear()) });
  const [yearlyFilters, setYearlyFilters] = useState({
    fromYear: "2022",
    toYear: String(new Date().getFullYear()),
    locationScope: "",
    deliveryMode: "",
  });
  const [rankFilters, setRankFilters] = useState({
    fromYear: "2022",
    toYear: String(new Date().getFullYear()),
    locationScope: "",
    deliveryMode: "",
    sortBy: "total",
  });

  const applyYear = (year: string) => {
    setFilters((current) => ({ ...current, year }));
    setYearlyFilters((current) => ({
      ...current,
      fromYear: String(Math.min(Number(current.fromYear) || 2022, Number(year))),
      toYear: String(Math.max(Number(current.toYear) || Number(year), Number(year))),
    }));
    setRankFilters((current) => ({
      ...current,
      fromYear: String(Math.min(Number(current.fromYear) || 2022, Number(year))),
      toYear: String(Math.max(Number(current.toYear) || Number(year), Number(year))),
    }));
  };

  const lookups = useQuery({ queryKey: ["admin-lookups"], queryFn: adminApi.lookups });
  const summary = useQuery({
    queryKey: ["admin-summary", filters],
    queryFn: () => adminApi.summary(filters),
  });
  const monthly = useQuery({
    queryKey: ["admin-monthly", filters],
    queryFn: () => adminApi.monthly(filters),
  });
  const distributions = useQuery({
    queryKey: ["admin-dist", filters],
    queryFn: () => adminApi.distributions(filters),
  });
  const institutions = useQuery({
    queryKey: ["admin-inst", filters],
    queryFn: () => adminApi.topInstitutions(filters),
  });
  const officers = useQuery({
    queryKey: ["admin-officers", filters],
    queryFn: () => adminApi.topOfficers(filters),
  });
  const yearly = useQuery({ queryKey: ["admin-yearly", yearlyFilters], queryFn: () => adminApi.yearly(yearlyFilters) });
  const rankings = useQuery({ queryKey: ["admin-rankings", rankFilters], queryFn: () => adminApi.rankings(rankFilters) });

  const refreshing =
    summary.isFetching ||
    monthly.isFetching ||
    distributions.isFetching ||
    institutions.isFetching ||
    officers.isFetching;

  const kpis = (summary.data?.kpis ?? {}) as Record<string, number>;
  const neverAttended =
    (summary.data?.neverAttendedOfficers as Array<{ id: string; fullName: string; bankId: string; status: string }> | undefined) ?? [];
  const yearScopedEmpty =
    Boolean(summary.data) && !refreshing && Number(kpis.totalSubmittedRecords ?? 0) === 0;

  const cards = useMemo(
    () => [
      ["Total Active Users", kpis.activeUsers, "/admin/users?status=ACTIVE"],
      ["Pending User Registrations", kpis.pendingRegistrations, "/admin/users?status=PENDING"],
      ["Officers with training", kpis.officersWithTraining, "/admin/users?neverAttended=false"],
      ["Officers with no training", kpis.officersNeverAttended, "/admin/users?neverAttended=true"],
      ["Total Training Programs", kpis.totalPrograms, "/admin/training-programs"],
      ["Participation records", kpis.totalSubmittedRecords, "/admin/records"],
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
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/analytics/compare">
              <Button variant="secondary">Compare officers</Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="secondary">Officer dashboards</Button>
            </Link>
          </div>
        }
      />
      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <div>
            <Label>Year</Label>
            <Select
              value={filters.year ?? String(new Date().getFullYear())}
              onChange={(e) => applyYear(e.target.value)}
            >
              {YEAR_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
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
          <div className="flex flex-wrap items-center gap-3 md:col-span-4">
            <Button
              variant="secondary"
              onClick={() => {
                const currentYear = String(new Date().getFullYear());
                setFilters({ year: currentYear });
                setYearlyFilters({ fromYear: "2022", toYear: currentYear, locationScope: "", deliveryMode: "" });
                setRankFilters({
                  fromYear: "2022",
                  toYear: currentYear,
                  locationScope: "",
                  deliveryMode: "",
                  sortBy: "total",
                });
              }}
            >
              Reset filters
            </Button>
            {refreshing ? <span className="text-xs text-slate-500">Refreshing charts for {filters.year}…</span> : null}
            <span className="text-xs text-slate-500">
              Training KPIs and charts reload for year <strong>{filters.year}</strong>. User / programme totals stay global.
            </span>
          </div>
        </CardContent>
      </Card>
      {yearScopedEmpty ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No participation records found for <strong>{filters.year}</strong>. Charts and training KPIs below show zeros for this year.
        </div>
      ) : null}
      <QueryState isLoading={summary.isLoading && !summary.data} error={summary.error}>
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-5 ${refreshing ? "opacity-60 transition-opacity" : ""}`}>
          {cards.map(([label, value, href]) => (
            <KpiCard key={`${filters.year}-${String(label)}`} label={String(label)} value={value ?? "—"} onClick={() => navigate(String(href))} />
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Completion rate = Completed / (Completed + Not Completed). Planned and ongoing records are excluded from the denominator.
        </p>
      </QueryState>
      <div key={filters.year} className="grid gap-4 xl:grid-cols-2">
        <ChartCard title={`Training participation by month (${filters.year})`}>
          <div className={monthly.isFetching ? "opacity-60 transition-opacity" : undefined}>
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
          </div>
        </ChartCard>
        <ChartCard title={`Local vs Foreign (${filters.year})`}>
          <div className={distributions.isFetching ? "opacity-60 transition-opacity" : undefined}>
            <Donut data={distributions.data?.locationScope ?? []} />
          </div>
        </ChartCard>
        <ChartCard title={`Physical vs Online vs Hybrid (${filters.year})`}>
          <div className={distributions.isFetching ? "opacity-60 transition-opacity" : undefined}>
            <Donut data={distributions.data?.deliveryMode ?? []} />
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Year-wise number of trainings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>From year</Label>
              <Select
                value={yearlyFilters.fromYear}
                onChange={(e) => setYearlyFilters((current) => ({ ...current, fromYear: e.target.value }))}
              >
                {YEAR_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>To year</Label>
              <Select
                value={yearlyFilters.toYear}
                onChange={(e) => setYearlyFilters((current) => ({ ...current, toYear: e.target.value }))}
              >
                {YEAR_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Local / Foreign</Label>
              <Select
                value={yearlyFilters.locationScope}
                onChange={(e) => setYearlyFilters((current) => ({ ...current, locationScope: e.target.value }))}
              >
                <option value="">All</option>
                <option value="LOCAL">Local</option>
                <option value="FOREIGN">Foreign</option>
              </Select>
            </div>
            <div>
              <Label>Physical / Online</Label>
              <Select
                value={yearlyFilters.deliveryMode}
                onChange={(e) => setYearlyFilters((current) => ({ ...current, deliveryMode: e.target.value }))}
              >
                <option value="">All</option>
                <option value="PHYSICAL">Physical</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </div>
          </div>
          <QueryState isLoading={yearly.isLoading} error={yearly.error}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearly.data?.years ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total trainings" fill={LINE_COLOR} />
                <Bar dataKey="local" name="Local" fill="#0f766e" />
                <Bar dataKey="foreign" name="Foreign" fill={GOLD_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Officer ranking — who has attended most</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <Label>From year</Label>
              <Select
                value={rankFilters.fromYear}
                onChange={(e) => setRankFilters((current) => ({ ...current, fromYear: e.target.value }))}
              >
                {YEAR_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>To year</Label>
              <Select
                value={rankFilters.toYear}
                onChange={(e) => setRankFilters((current) => ({ ...current, toYear: e.target.value }))}
              >
                {YEAR_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Local / Foreign</Label>
              <Select
                value={rankFilters.locationScope}
                onChange={(e) => setRankFilters((current) => ({ ...current, locationScope: e.target.value }))}
              >
                <option value="">All</option>
                <option value="LOCAL">Local</option>
                <option value="FOREIGN">Foreign</option>
              </Select>
            </div>
            <div>
              <Label>Physical / Online</Label>
              <Select
                value={rankFilters.deliveryMode}
                onChange={(e) => setRankFilters((current) => ({ ...current, deliveryMode: e.target.value }))}
              >
                <option value="">All</option>
                <option value="PHYSICAL">Physical</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </div>
            <div>
              <Label>Sort by</Label>
              <Select
                value={rankFilters.sortBy}
                onChange={(e) => setRankFilters((current) => ({ ...current, sortBy: e.target.value }))}
              >
                <option value="total">Total</option>
                <option value="foreign">Foreign</option>
                <option value="local">Local</option>
                <option value="physical">Physical</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>
          <QueryState isLoading={rankings.isLoading} error={rankings.error} empty={!rankings.data?.rows.length}>
            <Table>
              <THead>
                <tr>
                  <Th>#</Th>
                  <Th>Officer</Th>
                  <Th>Bank ID</Th>
                  <Th>Status</Th>
                  <Th>Total</Th>
                  <Th>Local</Th>
                  <Th>Foreign</Th>
                  <Th>Physical</Th>
                  <Th>Online</Th>
                  <Th>Hybrid</Th>
                  <Th>Completed</Th>
                  <Th></Th>
                </tr>
              </THead>
              <tbody>
                {rankings.data?.rows.map((row, index) => (
                  <tr key={row.id}>
                    <Td>{index + 1}</Td>
                    <Td className="font-medium">{row.officer}</Td>
                    <Td>{row.bankId}</Td>
                    <Td>
                      <Badge tone={row.status === "ACTIVE" ? "green" : "amber"}>{row.status}</Badge>
                    </Td>
                    <Td className="font-semibold">{row.total}</Td>
                    <Td>{row.local}</Td>
                    <Td>{row.foreign}</Td>
                    <Td>{row.physical}</Td>
                    <Td>{row.online}</Td>
                    <Td>{row.hybrid}</Td>
                    <Td>{row.completed}</Td>
                    <Td>
                      <button
                        className="text-navy underline"
                        onClick={() => navigate(`/admin/users/${row.id}/dashboard`)}
                      >
                        Dashboard
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

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
                  <button
                    className="text-left text-navy underline"
                    onClick={() => navigate(`/admin/users?search=${encodeURIComponent(item.bankId)}&neverAttended=true`)}
                  >
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
