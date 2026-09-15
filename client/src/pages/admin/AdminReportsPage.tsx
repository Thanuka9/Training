import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, exportUrl } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, Th, Td } from "@/components/ui/table";
import { deliveryLabel, locationLabel } from "@/lib/format";

const registerColumns = [
  { key: "no", label: "No." },
  { key: "officerName", label: "Name of the Officer" },
  { key: "bankId", label: "Bank ID" },
  { key: "trainingProgram", label: "Name of the Training Program" },
  { key: "locationScope", label: "Local / Foreign" },
  { key: "deliveryMode", label: "Physical / Online" },
  { key: "trainingType", label: "Type of Training" },
  { key: "participatingAs", label: "Participating the Training as" },
  { key: "fromDate", label: "From" },
  { key: "toDate", label: "To" },
  { key: "institution", label: "Institution" },
  { key: "venue", label: "Venue" },
  { key: "completionStatus", label: "Status of Completion" },
];

const programColumns = [
  { key: "program", label: "Program" },
  { key: "locationScope", label: "Local / Foreign" },
  { key: "type", label: "Type of Training" },
  { key: "institution", label: "Institution" },
  { key: "participants", label: "Participants" },
  { key: "completed", label: "Completed" },
  { key: "completionRate", label: "Completion Rate" },
];

const institutionColumns = [
  { key: "institution", label: "Institution" },
  { key: "programs", label: "Programs" },
  { key: "participations", label: "Participations" },
  { key: "completed", label: "Completed" },
];

function cellValue(key: string, value: unknown) {
  const text = value == null ? "" : String(value);
  if (key === "locationScope") return locationLabel(text);
  if (key === "deliveryMode") return deliveryLabel(text);
  return text;
}

export function AdminReportsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tab, setTab] = useState<"register" | "officer" | "program" | "institution">("register");
  const params = { year };
  const register = useQuery({ queryKey: ["report-register", params], queryFn: () => adminApi.trainingRegister(params) });
  const officer = useQuery({ queryKey: ["report-officer", params], queryFn: () => adminApi.officerSummary(params) });
  const program = useQuery({ queryKey: ["report-program", params], queryFn: () => adminApi.programSummary(params) });
  const institution = useQuery({ queryKey: ["report-inst", params], queryFn: () => adminApi.institutionSummary(params) });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Training Register columns match the current Excel register. Officer Summary is generated dynamically from participation roles, location and delivery mode."
        actions={
          <div className="flex gap-2">
            <a href={exportUrl("xlsx", params)}>
              <Button>Export Excel</Button>
            </a>
            <a href={exportUrl("csv", params)}>
              <Button variant="secondary">Export CSV</Button>
            </a>
          </div>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-32" />
          </div>
          {(["register", "officer", "program", "institution"] as const).map((item) => (
            <Button key={item} variant={tab === item ? "default" : "secondary"} onClick={() => setTab(item)}>
              {item === "register"
                ? "Training Register"
                : item === "officer"
                  ? "Officer Summary"
                  : item === "program"
                    ? "Programme Summary"
                    : "Institution Summary"}
            </Button>
          ))}
        </CardContent>
      </Card>
      {tab === "register" ? (
        <ReportTable loading={register.isLoading} error={register.error} rows={register.data ?? []} columns={registerColumns} />
      ) : null}
      {tab === "officer" ? (
        <Card>
          <CardHeader>
            <CardTitle>Officer Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState isLoading={officer.isLoading} error={officer.error} empty={!officer.data?.rows.length}>
              <Table>
                <THead>
                  <tr>
                    <Th>Name of the Officer</Th>
                    <Th>Bank ID</Th>
                    {officer.data?.columns.map((column) => (
                      <Th key={column.key}>{column.label}</Th>
                    ))}
                    <Th>Total</Th>
                  </tr>
                </THead>
                <tbody>
                  {officer.data?.rows.map((row) => (
                    <tr key={String(row.bankId)}>
                      <Td>{String(row.officer)}</Td>
                      <Td>{String(row.bankId)}</Td>
                      {officer.data?.columns.map((column) => (
                        <Td key={column.key}>{String((row.counts as Record<string, number>)[column.key] ?? 0)}</Td>
                      ))}
                      <Td className="font-semibold">{String(row.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
      ) : null}
      {tab === "program" ? (
        <ReportTable loading={program.isLoading} error={program.error} rows={program.data ?? []} columns={programColumns} />
      ) : null}
      {tab === "institution" ? (
        <ReportTable loading={institution.isLoading} error={institution.error} rows={institution.data ?? []} columns={institutionColumns} />
      ) : null}
    </div>
  );
}

function ReportTable({
  loading,
  error,
  rows,
  columns,
}: {
  loading: boolean;
  error: Error | null;
  rows: Array<Record<string, unknown>>;
  columns: { key: string; label: string }[];
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <QueryState isLoading={loading} error={error} empty={!rows.length}>
          <Table>
            <THead>
              <tr>
                {columns.map((column) => (
                  <Th key={column.key}>{column.label}</Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <Td key={column.key}>{cellValue(column.key, row[column.key])}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  );
}
