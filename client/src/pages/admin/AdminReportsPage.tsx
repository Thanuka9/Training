import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import { PageHeader, QueryState } from "@/components/PageHeader";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Badge } from "@/components/ui/badge";
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
  { key: "workflowStatus", label: "Workflow Status" },
];

const activityColumns = [
  { key: "officer", label: "Name of the Officer" },
  { key: "bankId", label: "Bank ID" },
  { key: "status", label: "Account Status" },
  { key: "attended", label: "Trainings Attended" },
  { key: "completed", label: "Completed" },
  { key: "local", label: "Local" },
  { key: "foreign", label: "Foreign" },
  { key: "physical", label: "Physical" },
  { key: "online", label: "Online" },
  { key: "hybrid", label: "Hybrid" },
  { key: "lastTrainingDate", label: "Last Training Date" },
  { key: "neverAttended", label: "Never Attended" },
];

const programColumns = [
  { key: "program", label: "Program" },
  { key: "locationScope", label: "Local / Foreign" },
  { key: "type", label: "Type of Training" },
  { key: "institution", label: "Institution" },
  { key: "participants", label: "Participants" },
  { key: "completed", label: "Completed" },
  { key: "notCompleted", label: "Not Completed" },
  { key: "completionRate", label: "Completion Rate" },
];

const institutionColumns = [
  { key: "institution", label: "Institution" },
  { key: "programs", label: "Programs" },
  { key: "participations", label: "Participations" },
  { key: "completed", label: "Completed" },
];

type Tab = "register" | "activity" | "officer" | "program" | "institution";

function cellValue(key: string, value: unknown) {
  const text = value == null ? "" : String(value);
  if (key === "locationScope") return locationLabel(text);
  if (key === "deliveryMode") return deliveryLabel(text);
  return text;
}

export function AdminReportsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tab, setTab] = useState<Tab>("register");
  const params = { year };
  const register = useQuery({ queryKey: ["report-register", params], queryFn: () => adminApi.trainingRegister(params) });
  const officer = useQuery({ queryKey: ["report-officer", params], queryFn: () => adminApi.officerSummary(params) });
  const activity = useQuery({ queryKey: ["report-activity", params], queryFn: () => adminApi.officerActivity(params) });
  const program = useQuery({ queryKey: ["report-program", params], queryFn: () => adminApi.programSummary(params) });
  const institution = useQuery({ queryKey: ["report-inst", params], queryFn: () => adminApi.institutionSummary(params) });

  const reportByTab: Record<Tab, Parameters<typeof DownloadButtons>[0]["report"]> = {
    register: "training-register",
    activity: "officer-activity",
    officer: "officer-summary",
    program: "program-summary",
    institution: "institution-summary",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Download Excel or CSV for the open report. Officer Activity includes officers who have not attended any training."
        actions={<DownloadButtons report={reportByTab[tab]} params={params} />}
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-32" />
          </div>
          {(
            [
              ["register", "Training Register"],
              ["activity", "Officer Activity"],
              ["officer", "Officer Summary"],
              ["program", "Programme Summary"],
              ["institution", "Institution Summary"],
            ] as const
          ).map(([item, label]) => (
            <Button key={item} variant={tab === item ? "default" : "secondary"} onClick={() => setTab(item)}>
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>
      {tab === "register" ? (
        <ReportTable loading={register.isLoading} error={register.error} rows={register.data ?? []} columns={registerColumns} />
      ) : null}
      {tab === "activity" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {activity.data
                ? `${activity.data.totals.withTraining} officers with training · ${activity.data.totals.neverAttended} have not attended any`
                : "Officer Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable
              loading={activity.isLoading}
              error={activity.error}
              rows={activity.data?.rows ?? []}
              columns={activityColumns}
              bare
            />
          </CardContent>
        </Card>
      ) : null}
      {tab === "officer" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Officer Summary
              {officer.data ? ` · ${officer.data.withTraining} with training, ${officer.data.neverAttended} never attended` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState isLoading={officer.isLoading} error={officer.error} empty={!officer.data?.rows.length}>
              <Table>
                <THead>
                  <tr>
                    <Th>Name of the Officer</Th>
                    <Th>Bank ID</Th>
                    <Th>Never Attended</Th>
                    {officer.data?.columns.map((column) => (
                      <Th key={column.key}>{column.label}</Th>
                    ))}
                    <Th>Total</Th>
                  </tr>
                </THead>
                <tbody>
                  {officer.data?.rows.map((row) => (
                    <tr key={String(row.bankId)} className={row.neverAttended ? "bg-amber-50/70" : undefined}>
                      <Td>{String(row.officer)}</Td>
                      <Td>{String(row.bankId)}</Td>
                      <Td>
                        <Badge tone={row.neverAttended ? "amber" : "green"}>{row.neverAttended ? "Yes" : "No"}</Badge>
                      </Td>
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
  bare,
}: {
  loading: boolean;
  error: Error | null;
  rows: Array<Record<string, unknown>>;
  columns: { key: string; label: string }[];
  bare?: boolean;
}) {
  const table = (
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
            <tr key={index} className={row.neverAttended === "Yes" || row.neverAttended === true ? "bg-amber-50/70" : undefined}>
              {columns.map((column) => (
                <Td key={column.key}>{cellValue(column.key, row[column.key])}</Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </QueryState>
  );
  if (bare) return table;
  return (
    <Card>
      <CardContent className="pt-4">{table}</CardContent>
    </Card>
  );
}
