import { clsx } from "clsx";

type StatusType = string;

const STATUS_CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  booked:      { dot: "bg-indigo-400",   badge: "bg-indigo-50 text-indigo-700 border-indigo-200",   label: "Booked" },
  pending:     { dot: "bg-indigo-400",   badge: "bg-indigo-50 text-indigo-700 border-indigo-200",   label: "Booked" },
  checked_in:  { dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200", label: "Checked In" },
  vaccinated:  { dot: "bg-cyan-500",    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",       label: "Vaccinated" },
  completed:   { dot: "bg-green-500",   badge: "bg-green-50 text-green-700 border-green-200",    label: "Completed" },
  cancelled:   { dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200",          label: "Cancelled" },
  rescheduled: { dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200", label: "Rescheduled" },
  no_show:     { dot: "bg-gray-400",    badge: "bg-gray-50 text-gray-600 border-gray-200",       label: "No Show" },
  missed:      { dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200",          label: "Missed" },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] ?? {
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    label: status,
  };

  return (
    <span className={clsx(
      "px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 border whitespace-nowrap",
      config.badge
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}
