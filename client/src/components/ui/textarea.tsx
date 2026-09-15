import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20",
        className,
      )}
      {...props}
    />
  );
}
