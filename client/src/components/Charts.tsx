import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartColor } from "@/lib/chartColors";
import { deliveryLabel, locationLabel } from "@/lib/format";

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function displayName(name: string) {
  if (name === "LOCAL" || name === "FOREIGN") return locationLabel(name);
  if (name === "PHYSICAL" || name === "ONLINE" || name === "HYBRID") return deliveryLabel(name);
  return name;
}

export function Donut({ data }: { data: { name: string; count: number }[] }) {
  const chartData = data.map((item) => ({ ...item, label: displayName(item.name) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90}>
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={chartColor(entry.name, index)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarBlock({ data }: { data: { name: string; count: number }[] }) {
  const chartData = data.map((item) => ({ ...item, label: displayName(item.name) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" hide={chartData.length > 6} interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count">
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={chartColor(entry.name, index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
