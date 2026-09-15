const NAMED: Record<string, string> = {
  LOCAL: "#1b365d",
  FOREIGN: "#b08d57",
  Local: "#1b365d",
  Foreign: "#b08d57",
  PHYSICAL: "#0f766e",
  ONLINE: "#2563eb",
  HYBRID: "#7c3aed",
  Physical: "#0f766e",
  Online: "#2563eb",
  Hybrid: "#7c3aed",
  Completed: "#15803d",
  "Not Completed": "#be123c",
  Planned: "#64748b",
  Ongoing: "#0369a1",
  Cancelled: "#57534e",
  Participant: "#1b365d",
  "Resource Person": "#b08d57",
  Panelist: "#0f766e",
  DRAFT: "#94a3b8",
  SUBMITTED: "#2563eb",
  RETURNED: "#d97706",
  APPROVED: "#15803d",
  REJECTED: "#be123c",
};

const FALLBACK = ["#1b365d", "#b08d57", "#0f766e", "#2563eb", "#b45309", "#7c3aed", "#be123c", "#15803d"];

export function chartColor(name: string, index = 0) {
  return NAMED[name] ?? FALLBACK[index % FALLBACK.length];
}

export const LINE_COLOR = "#1b365d";
export const GOLD_COLOR = "#b08d57";
