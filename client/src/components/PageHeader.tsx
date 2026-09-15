import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-navy">{title}</h1>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`relative overflow-hidden px-4 py-4 ${onClick ? "cursor-pointer transition hover:border-navy/35 hover:shadow-md" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gold" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function QueryState({
  isLoading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  isLoading: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-muted">
        Loading records…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error.message || "Unable to load data."}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-muted">
        {emptyMessage ?? "No records found."}
      </div>
    );
  }
  return <>{children}</>;
}
