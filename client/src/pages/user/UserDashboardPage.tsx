import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
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
import { userApi } from "@/api/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { KpiCard, PageHeader, QueryState } from "@/components/PageHeader";
import { CompletionBadge, WorkflowBadge } from "@/components/StatusBadge";
import { BarBlock, ChartCard, Donut } from "@/components/Charts";
import { deliveryLabel, formatDate, locationLabel } from "@/lib/format";
import { GOLD_COLOR, LINE_COLOR } from "@/lib/chartColors";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => String(CURRENT_YEAR - i));

export function UserDashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    year: String(CURRENT_YEAR),
    locationScope: "",
    deliveryMode: "",
  });

  const query = useQuery({
    queryKey: ["user-dashboard", filters],
    queryFn: () =>
      userApi.dashboard({
        year: filters.year || undefined,
        locationScope: filters.locationScope || undefined,
        deliveryMode: filters.deliveryMode || undefined,
      }),
  });
  const data = query.data;
  const refreshing = query.isFetching && Boolean(data);
  const yearLabel = filters.year || "all years";
  const yearEmpty = Boolean(data) && !refreshing && (data?.kpis.attended ?? 0) === 0;

  const primaryKpis = useMemo(
    () => [
      { label: "Attended", value: data?.kpis.attended, hint: "Submitted (excl. drafts)", href: `/app/training?year=${filters.year}` },
      { label: "Completed", value: data?.kpis.completed, href: `/app/training?year=${filters.year}` },
      { label: "Pending review", value: data?.kpis.pendingReview, hint: "All years", href: "/app/training?workflowStatus=SUBMITTED" },
      { label: "Drafts", value: data?.kpis.draft, hint: "All years", href: "/app/training?workflowStatus=DRAFT" },
    ],
    [data, filters.year],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Officer"}`}
        description={`Bank ID ${user?.bankId ?? "—"}. Your personal training overview — change Year to refresh KPIs and charts.`}
        actions={
          <Link to="/app/training/new">
            <Button>Add Training Record</Button>
          </Link>
        }
      />

      <Card className="border-navy/10 shadow-sm">
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Year</Label>
            <Select
              value={filters.year}
              onChange={(e) => setFilters((current) => ({ ...current, year: e.target.value }))}
            >
              <option value="">All years</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Local / Foreign</Label>
            <Select
              value={filters.locationScope}
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
              value={filters.deliveryMode}
              onChange={(e) => setFilters((current) => ({ ...current, deliveryMode: e.target.value }))}
            >
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setFilters({ year: String(CURRENT_YEAR), locationScope: "", deliveryMode: "" })}
            >
              Reset filters
            </Button>
          </div>
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted">
            {refreshing ? (
              <>Refreshing for {yearLabel}…</>
            ) : (
              <>
                Showing attendance KPIs for <strong>{yearLabel}</strong>
                {filters.locationScope ? ` · ${filters.locationScope === "LOCAL" ? "Local" : "Foreign"}` : ""}
                {filters.deliveryMode ? ` · ${deliveryLabel(filters.deliveryMode as "PHYSICAL" | "ONLINE" | "HYBRID")}` : ""}
                . Drafts and pending review counts include all years. Year-wise chart always shows your full history.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {yearEmpty ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No training records for <strong>{yearLabel}</strong> with the current filters. Try another year or clear Local /
          Foreign.
        </div>
      ) : null}

      <div className={cn("space-y-6 transition-opacity", refreshing ? "opacity-60" : "opacity-100")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {primaryKpis.map((item) => (
            <Link key={item.label} to={item.href ?? "/app/training"} className="block">
              <KpiCard label={item.label} value={item.value ?? "—"} hint={item.hint} />
            </Link>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Local" value={data?.kpis.local ?? "—"} />
          <KpiCard label="Foreign" value={data?.kpis.foreign ?? "—"} />
          <KpiCard label="Physical" value={data?.kpis.physical ?? "—"} />
          <KpiCard label="Online / Hybrid" value={(data?.kpis.online ?? 0) + (data?.kpis.hybrid ?? 0)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Trainings by year">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.yearly ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill={LINE_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="local" name="Local" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="foreign" name="Foreign" fill={GOLD_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title={`Local vs Foreign (${yearLabel})`}>
            <Donut data={data?.distributions.locationScope ?? []} />
          </ChartCard>
          <ChartCard title={`Delivery mode (${yearLabel})`}>
            <Donut data={data?.distributions.deliveryMode ?? []} />
          </ChartCard>
          <ChartCard title={`Completion status (${yearLabel})`}>
            <BarBlock data={data?.distributions.completionStatus ?? []} />
          </ChartCard>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Recent training {filters.year ? `(${filters.year})` : ""}</CardTitle>
            <Link to="/app/training" className="text-sm font-medium text-navy underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <QueryState
              isLoading={query.isLoading && !data}
              error={query.error}
              empty={!data?.recent.length}
              emptyMessage="No training records for these filters. Add a record or change Year."
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
                  {data?.recent.map((item) => (
                    <tr key={item.id}>
                      <Td className="max-w-[220px] font-medium">
                        <span className="line-clamp-2">{item.trainingProgram.name}</span>
                      </Td>
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
      </div>
    </div>
  );
}
