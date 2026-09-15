import { Badge } from "@/components/ui/badge";
import { workflowLabel } from "@/lib/format";

const workflowTone = {
  DRAFT: "slate",
  SUBMITTED: "blue",
  RETURNED: "amber",
  APPROVED: "green",
  REJECTED: "red",
} as const;

export function WorkflowBadge({ status }: { status: string }) {
  const tone = workflowTone[status as keyof typeof workflowTone] ?? "slate";
  return <Badge tone={tone}>{workflowLabel(status)}</Badge>;
}

export function CompletionBadge({ status }: { status: string }) {
  const tone =
    status === "Completed" ? "green" : status === "Not Completed" || status === "Cancelled" ? "red" : "blue";
  return <Badge tone={tone}>{status}</Badge>;
}
