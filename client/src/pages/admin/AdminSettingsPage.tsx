import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: adminApi.settings });

  return (
    <div>
      <PageHeader title="Settings" description="Limited department options for version 1." />
      <Card>
        <CardHeader>
          <CardTitle>Delivery modes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Hybrid is available in addition to Physical and Online. Disable it if management requires exact workbook compatibility.</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={query.data?.allowHybridDelivery ?? true}
              onChange={async (event) => {
                try {
                  await adminApi.updateSettings({ allowHybridDelivery: event.target.checked });
                  toast.success("Settings saved");
                  await queryClient.invalidateQueries({ queryKey: ["settings"] });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to save settings");
                }
              }}
            />
            Allow Hybrid delivery mode
          </label>
          <Button variant="secondary" disabled>
            Saved automatically
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
