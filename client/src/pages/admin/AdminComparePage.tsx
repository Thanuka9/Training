import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { LINE_COLOR, GOLD_COLOR } from "@/lib/chartColors";

export function AdminComparePage() {
  const officers = useQuery({ queryKey: ["admin-officers-select"], queryFn: adminApi.officers });
  const [userIdA, setUserIdA] = useState("");
  const [userIdB, setUserIdB] = useState("");
  const [ready, setReady] = useState<{ a: string; b: string } | null>(null);

  const compare = useQuery({
    queryKey: ["admin-compare", ready],
    queryFn: () => adminApi.compare({ userIdA: ready!.a, userIdB: ready!.b }),
    enabled: Boolean(ready),
  });

  const options = officers.data ?? [];
  const aLabel = useMemo(() => options.find((item) => item.id === ready?.a), [options, ready]);
  const bLabel = useMemo(() => options.find((item) => item.id === ready?.b), [options, ready]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare officers"
        description="Pick two officers to compare attendance, local/foreign mix and year-wise training volume."
        actions={
          <Link to="/admin/users">
            <Button variant="secondary">Back to users</Button>
          </Link>
        }
      />
      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
          <div>
            <Label>Officer A</Label>
            <Select value={userIdA} onChange={(e) => setUserIdA(e.target.value)}>
              <option value="">Select</option>
              {options.map((item) => (
                <option key={item.id} value={item.id} disabled={item.id === userIdB}>
                  {item.fullName} ({item.bankId}) · {item.attended}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Officer B</Label>
            <Select value={userIdB} onChange={(e) => setUserIdB(e.target.value)}>
              <option value="">Select</option>
              {options.map((item) => (
                <option key={item.id} value={item.id} disabled={item.id === userIdA}>
                  {item.fullName} ({item.bankId}) · {item.attended}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              disabled={!userIdA || !userIdB || userIdA === userIdB}
              onClick={() => setReady({ a: userIdA, b: userIdB })}
            >
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {!ready ? (
        <p className="text-sm text-slate-500">Select two different officers and click Compare.</p>
      ) : (
        <QueryState isLoading={compare.isLoading} error={compare.error} empty={!compare.data}>
          {compare.data ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <OfficerSummary
                  title={`A · ${compare.data.a.user.fullName}`}
                  bankId={compare.data.a.user.bankId}
                  kpis={compare.data.a.kpis}
                  id={compare.data.a.user.id}
                />
                <OfficerSummary
                  title={`B · ${compare.data.b.user.fullName}`}
                  bankId={compare.data.b.user.bankId}
                  kpis={compare.data.b.kpis}
                  id={compare.data.b.user.id}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Side-by-side stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <THead>
                      <tr>
                        <Th>Metric</Th>
                        <Th>{aLabel?.fullName ?? "Officer A"}</Th>
                        <Th>{bLabel?.fullName ?? "Officer B"}</Th>
                        <Th>Difference (A − B)</Th>
                      </tr>
                    </THead>
                    <tbody>
                      {compare.data.comparisonTable.map((row) => (
                        <tr key={row.metric}>
                          <Td>{row.label}</Td>
                          <Td className="font-semibold">{row.a}</Td>
                          <Td className="font-semibold">{row.b}</Td>
                          <Td className={row.diff > 0 ? "text-emerald-700" : row.diff < 0 ? "text-red-700" : ""}>
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Trainings by year">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={compare.data.yearlyCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="aTotal" name={aLabel?.fullName ?? "A"} fill={LINE_COLOR} />
                      <Bar dataKey="bTotal" name={bLabel?.fullName ?? "B"} fill={GOLD_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Local trainings by year">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={compare.data.yearlyCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="aLocal" name={`${aLabel?.fullName ?? "A"} local`} fill={LINE_COLOR} />
                      <Bar dataKey="bLocal" name={`${bLabel?.fullName ?? "B"} local`} fill="#64748b" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={`${compare.data.a.user.fullName} · Local vs Foreign`}>
                  <Donut data={compare.data.a.distributions.locationScope} />
                </ChartCard>
                <ChartCard title={`${compare.data.b.user.fullName} · Local vs Foreign`}>
                  <Donut data={compare.data.b.distributions.locationScope} />
                </ChartCard>
                <ChartCard title={`${compare.data.a.user.fullName} · Delivery mode`}>
                  <BarBlock data={compare.data.a.distributions.deliveryMode} />
                </ChartCard>
                <ChartCard title={`${compare.data.b.user.fullName} · Delivery mode`}>
                  <BarBlock data={compare.data.b.distributions.deliveryMode} />
                </ChartCard>
              </div>
            </>
          ) : null}
        </QueryState>
      )}
    </div>
  );
}

function OfficerSummary({
  title,
  bankId,
  kpis,
  id,
}: {
  title: string;
  bankId: string;
  kpis: {
    attended: number;
    completed: number;
    local: number;
    foreign: number;
    physical: number;
    online: number;
    hybrid: number;
  };
  id: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>{title}</span>
          <Link className="text-sm font-medium text-navy underline" to={`/admin/users/${id}/dashboard`}>
            Open dashboard
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-500">Bank ID {bankId}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Attended" value={kpis.attended} />
          <KpiCard label="Completed" value={kpis.completed} />
          <KpiCard label="Local" value={kpis.local} />
          <KpiCard label="Foreign" value={kpis.foreign} />
          <KpiCard label="Physical" value={kpis.physical} />
          <KpiCard label="Online" value={kpis.online} />
        </div>
      </CardContent>
    </Card>
  );
}
