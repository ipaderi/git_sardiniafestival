import { cn } from "@/lib/utils";

export type EventStatus = "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED";

const statusClass: Record<EventStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  PUBLISHED: "bg-teal-50 text-teal-800",
  REJECTED: "bg-rose-50 text-rose-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

export function EventStatusBadge({ status, label, className }: { status: EventStatus; label: string; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold", statusClass[status], className)}>{label}</span>;
}
