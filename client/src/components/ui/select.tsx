import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink shadow-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:bg-slate-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
