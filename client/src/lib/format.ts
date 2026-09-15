export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function locationLabel(value: string) {
  return value === "LOCAL" ? "Local" : value === "FOREIGN" ? "Foreign" : value;
}

export function deliveryLabel(value: string) {
  if (value === "PHYSICAL") return "Physical";
  if (value === "ONLINE") return "Online";
  if (value === "HYBRID") return "Hybrid";
  return value;
}

export function workflowLabel(value: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Pending Review",
    RETURNED: "Returned",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return labels[value] ?? value;
}
