import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// globals.css applies `font: inherit` to form controls outside any layer, which beats text-* and font-* utilities on
// the controls themselves: their type is set on the parent (see Field, and the wrappers around buttons).

export const inputClass = "focus-ring h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal text-ink placeholder:text-slate-400 disabled:opacity-50 aria-invalid:border-rose-400";
export const selectClass = "focus-ring h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-ink disabled:opacity-50 aria-invalid:border-rose-400";
export const textareaClass = "focus-ring min-h-40 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal leading-6 text-ink placeholder:text-slate-400 aria-invalid:border-rose-400";

export function FormSection({ id, title, description, action, children }: { id?: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section id={id} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>}
      </div>
      {action}
    </header>
    <div className="p-4 sm:p-6">{children}</div>
  </section>;
}

export function Field({ label, required, tag, hint, error, className, children }: { label: string; required?: boolean; tag?: string; hint?: ReactNode; error?: string; className?: string; children: ReactNode }) {
  return <div className={cn("grid content-start gap-1.5", className)}>
    <label className="grid gap-1.5 text-sm font-normal text-ink">
      <span className="flex items-center gap-1.5 text-xs font-bold">{label}{required && <span aria-hidden className="text-coral">*</span>}{tag && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">{tag}</span>}</span>
      {children}
    </label>
    {error ? <p role="alert" className="text-xs font-medium text-rose-700">{error}</p> : hint ? <div className="text-xs leading-5 text-muted">{hint}</div> : null}
  </div>;
}
