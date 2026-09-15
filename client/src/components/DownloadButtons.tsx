import { exportUrl, type FilterParams } from "@/api/admin";
import { Button } from "@/components/ui/button";

export function DownloadButtons({
  report,
  params = {},
}: {
  report: Parameters<typeof exportUrl>[0];
  params?: FilterParams;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={exportUrl(report, "xlsx", params)}>
        <Button>Download Excel</Button>
      </a>
      <a href={exportUrl(report, "csv", params)}>
        <Button variant="secondary">Download CSV</Button>
      </a>
    </div>
  );
}
