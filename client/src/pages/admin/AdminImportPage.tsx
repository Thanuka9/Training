import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { adminApi } from "@/api/admin";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, THead, Th, Td } from "@/components/ui/table";

type ImportResult = Awaited<ReturnType<typeof adminApi.importHistorical>>;

export function AdminImportPage() {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function runImport(file: File) {
    setFileName(file.name);
    setBusy(true);
    setResult(null);
    try {
      const csv = await file.text();
      const imported = await adminApi.importHistorical(csv);
      setResult(imported);
      if (imported.rowsImported === 0) {
        toast.warning(`No rows imported (${imported.rowsSkipped} skipped)`);
      } else if (imported.rowsSkipped > 0) {
        toast.success(`Imported ${imported.rowsImported}; ${imported.rowsSkipped} skipped`);
      } else {
        toast.success(`Imported ${imported.rowsImported} row(s)`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import historical records"
        description="Upload older training registers using the exact 2025 CSV layout. Bank No (Bank ID) is required; officer name may be blank. Missing officers become IMPORTED accounts — when they register with the same Bank ID, historical records attach automatically. Master data and training programmes from the official templates are synced into the system on server start."
        actions={
          <a
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-navy hover:bg-slate-50"
            href="/templates/historical-training-import.csv"
            download="historical-training-import.csv"
          >
            Download template
          </a>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Required columns (exact order)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <ol className="list-decimal space-y-1 pl-5">
            <li>No.</li>
            <li>Bank No</li>
            <li>Name of the Officer (optional)</li>
            <li>Name of the Training Program</li>
            <li>Local / Foreign</li>
            <li>Physical / Online</li>
            <li>Type of Training</li>
            <li>Participating the Training as</li>
            <li>Duration (row 2 sub-headers: From, To) — dates as D/M/YYYY</li>
            <li>Institution</li>
            <li>Venue</li>
            <li>Status of Completion</li>
          </ol>
          <p className="text-muted">
            Matches the official 2025 register export. Ambiguous dates like 3/4/2025 are read as day/month (3 April). Duplicate
            rows are skipped.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-navy/40 hover:bg-slate-100">
            <Upload className="h-8 w-8 text-navy" />
            <span className="text-sm font-medium text-navy">{busy ? "Importing…" : "Choose CSV file"}</span>
            <span className="text-xs text-muted">{fileName || "Accepts .csv only"}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (!file) return;
                if (result) {
                  setPendingFile(file);
                  return;
                }
                void runImport(file);
              }}
            />
          </label>
          <Button variant="secondary" disabled={busy} onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
            Select file
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">Rows seen {result.rowsTotal}</Badge>
              <Badge tone="green">Imported {result.rowsImported}</Badge>
              <Badge tone="amber">Skipped {result.rowsSkipped}</Badge>
              <Badge tone="blue">Users created {result.usersCreated}</Badge>
              <Badge tone="blue">Users updated {result.usersUpdated}</Badge>
              <Badge tone="navy">Programs created {result.programsCreated}</Badge>
              <Badge tone="slate">
                Master +{result.masterCreated.trainingTypes} types / {result.masterCreated.institutions} institutions /{" "}
                {result.masterCreated.roles} roles / {result.masterCreated.completions} completions
              </Badge>
            </div>
            {result.errors.length ? (
              <Table>
                <THead>
                  <tr>
                    <Th>Row</Th>
                    <Th>Message</Th>
                  </tr>
                </THead>
                <tbody>
                  {result.errors.slice(0, 100).map((error, index) => (
                    <tr key={`${error.row}-${index}`}>
                      <Td>{error.row}</Td>
                      <Td>{error.message}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-sm text-muted">No row errors.</p>
            )}
            {result.errors.length > 100 ? (
              <p className="text-xs text-muted">Showing first 100 of {result.errors.length} messages.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingFile)}
        title="Import another file?"
        description="Duplicates are skipped, but new rows will be added. Continue with this upload?"
        confirmLabel="Import"
        onClose={() => setPendingFile(null)}
        onConfirm={() => {
          if (pendingFile) void runImport(pendingFile);
        }}
      />
    </div>
  );
}
