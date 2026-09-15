import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, to = "/", light = false }: { compact?: boolean; to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-md shadow-sm" />
      <span className={cn(light ? "text-white" : "text-navy")}>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
          Bank Supervision Department
        </span>
        <span className={cn("block font-serif font-semibold leading-tight", compact ? "text-base" : "text-lg")}>
          Training Management Portal
        </span>
      </span>
    </Link>
  );
}
