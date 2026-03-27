import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useGetAppointments,
  useCheckinAppointment,
  useVaccinateAppointment,
  useCompleteAppointment,
  useCancelAppointment,
  useRescheduleAppointment,
} from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search, Filter, Loader2, UserCheck, Syringe, CheckCircle2,
  XCircle, RefreshCw, ChevronRight, Clock, CalendarDays, Eye
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { format, parseISO } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clsx } from "clsx";
import {
  downloadPortalAppointmentSlip,
  downloadPortalCancellationSlip,
  downloadPortalCertificate,
  downloadPortalRescheduleSlip,
  type PortalAppointmentDocument,
} from "@/lib/appointment-pdf";

// ── STATUS WORKFLOW ─────────────────────────────────────────────────────────

const WORKFLOW_STEPS = ["booked", "checked_in", "vaccinated", "completed"] as const;

function StatusTimeline({ status }: { status: string }) {
  const stepLabels: Record<string, string> = {
    booked: "Booked",
    checked_in: "Checked In",
    vaccinated: "Vaccinated",
    completed: "Completed",
  };

  const stepIdx = WORKFLOW_STEPS.indexOf(status as any);
  const isClosed = ["cancelled", "rescheduled", "no_show", "missed"].includes(status);

  return (
    <div className="flex items-center gap-1 mt-2">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = stepIdx >= i && !isClosed;
        const current = stepIdx === i && !isClosed;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={clsx(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
              done && !current && "bg-green-100 text-green-700 border-green-200",
              current && "bg-primary text-white border-primary shadow-sm shadow-primary/30",
              !done && "bg-gray-50 text-gray-400 border-gray-200",
              isClosed && "opacity-40"
            )}>
              {done && !current && <CheckCircle2 className="w-2.5 h-2.5" />}
              {current && <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />}
              {stepLabels[step]}
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <ChevronRight className={clsx("w-3 h-3 flex-shrink-0", done ? "text-green-400" : "text-gray-300")} />
            )}
          </div>
        );
      })}
      {isClosed && (
        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 capitalize">
          {status.replace("_", " ")}
        </span>
      )}
    </div>
  );
}

// ── ACTION BUTTONS PER STATUS ─────────────────────────────────────────────

type ActionType = "checkin" | "vaccinate" | "complete" | "cancel" | "reschedule";

interface ActionDef {
  type: ActionType;
  label: string;
  icon: React.ElementType;
  variant: "blue" | "green" | "violet" | "red" | "orange";
}

function getActions(status: string): ActionDef[] {
  const s = status?.toLowerCase();
  if (s === "booked" || s === "pending") {
    return [
      { type: "checkin",    label: "Check In",    icon: UserCheck,    variant: "blue" },
      { type: "reschedule", label: "Reschedule",  icon: RefreshCw,    variant: "orange" },
      { type: "cancel",     label: "Cancel",      icon: XCircle,      variant: "red" },
    ];
  }
  if (s === "checked_in") {
    return [
      { type: "vaccinate", label: "Mark Vaccinated", icon: Syringe, variant: "green" },
      { type: "cancel",    label: "Cancel",           icon: XCircle, variant: "red" },
    ];
  }
  if (s === "vaccinated") {
    return [
      { type: "complete", label: "Complete Record", icon: CheckCircle2, variant: "violet" },
    ];
  }
  return [];
}

const variantCls: Record<string, string> = {
  blue:   "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
  green:  "border-green-200 text-green-700 hover:bg-green-50",
  violet: "border-violet-200 text-violet-700 hover:bg-violet-50",
  red:    "border-red-200 text-red-600 hover:bg-red-50",
  orange: "border-orange-200 text-orange-700 hover:bg-orange-50",
};

function downloadAppointmentDocument(
  appt: PortalAppointmentDocument,
  appointments: PortalAppointmentDocument[] | undefined,
) {
  if (appt.status === "completed") {
    downloadPortalCertificate(appt);
    return;
  }
  if (appt.status === "cancelled") {
    downloadPortalCancellationSlip(appt);
    return;
  }
  if (appt.status === "rescheduled") {
    const replacement = appointments?.find((candidate) => candidate.id === appt.rescheduledToAppointmentId);
    downloadPortalRescheduleSlip(appt, replacement);
    return;
  }
  downloadPortalAppointmentSlip(appt);
}

// ── MODALS ────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  appt: any;
  action: ActionType;
  onClose: () => void;
  onSuccess: () => Promise<unknown>;
}

function ActionModal({ appt, action, onClose, onSuccess }: ConfirmModalProps) {
  const { toast } = useToast();
  const authReq = { request: getAuthHeaders() };

  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [remarks, setRemarks] = useState("");

  const checkinMutation = useCheckinAppointment({ mutation: { onSuccess: handleSuccess, onError: handleError }, ...authReq });
  const vaccinateMutation = useVaccinateAppointment({ mutation: { onSuccess: handleSuccess, onError: handleError }, ...authReq });
  const completeMutation = useCompleteAppointment({ mutation: { onSuccess: handleSuccess, onError: handleError }, ...authReq });
  const cancelMutation = useCancelAppointment({ mutation: { onSuccess: handleSuccess, onError: handleError }, ...authReq });
  const rescheduleMutation = useRescheduleAppointment({ mutation: { onSuccess: handleSuccess, onError: handleError }, ...authReq });

  async function handleSuccess() {
    const msgs: Record<ActionType, string> = {
      checkin:    "Patient checked in successfully.",
      vaccinate:  "Vaccination marked successfully.",
      complete:   "Record completed and locked.",
      cancel:     "Appointment cancelled.",
      reschedule: "Appointment rescheduled. New booking created.",
    };
    await onSuccess();
    toast({ title: "✓ Done", description: msgs[action] });
    onClose();
  }

  function handleError(err: any) {
    const msg = err?.response?.data?.error || "An error occurred. Please try again.";
    toast({ variant: "destructive", title: "Action Failed", description: msg });
  }

  const isPending =
    checkinMutation.isPending || vaccinateMutation.isPending ||
    completeMutation.isPending || cancelMutation.isPending || rescheduleMutation.isPending;

  function handleConfirm() {
    const id = appt.id;
    if (action === "checkin")    checkinMutation.mutate({ id });
    if (action === "vaccinate")  vaccinateMutation.mutate({ id, data: { batchNumber: batchNumber || undefined, notes: notes || undefined } });
    if (action === "complete")   completeMutation.mutate({ id });
    if (action === "cancel")     cancelMutation.mutate({ id, data: { reason: cancelReason, remarks: remarks || undefined } as any });
    if (action === "reschedule") rescheduleMutation.mutate({ id, data: { newDate: rescheduleDate, newTime: rescheduleTime, remarks: remarks || undefined } as any });
  }

  const titles: Record<ActionType, string> = {
    checkin:    "Check In Patient",
    vaccinate:  "Mark as Vaccinated",
    complete:   "Complete Record",
    cancel:     "Cancel Appointment",
    reschedule: "Reschedule Appointment",
  };

  const isFormValid = () => {
    if (action === "cancel")     return cancelReason.trim().length > 0;
    if (action === "reschedule") return rescheduleDate.length > 0 && rescheduleTime.length > 0;
    return true;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{titles[action]}</DialogTitle>
          <DialogDescription>
            Patient: <strong className="text-foreground">{appt.childName}</strong> &nbsp;·&nbsp;
            Vaccine: <strong className="text-foreground">{appt.vaccine}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Secret code display for check-in */}
          {action === "checkin" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-2">Verify Secret Code</p>
              <p className="font-mono text-3xl font-bold tracking-[0.3em] text-indigo-800">{appt.secretCode}</p>
              <p className="text-xs text-indigo-500 mt-2">Ask the parent/guardian to confirm this code before checking in.</p>
            </div>
          )}

          {/* Vaccinate form */}
          {action === "vaccinate" && (
            <div className="space-y-3">
              <div>
                <Label>Batch Number <span className="text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g. BCG-2026-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea placeholder="Any observations or remarks..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 resize-none h-20" />
              </div>
            </div>
          )}

          {/* Complete: read-only summary */}
          {action === "complete" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-green-800">Final Confirmation</p>
              <p className="text-xs text-green-700">Marking as <strong>Completed</strong> will permanently lock this record and enable the vaccination certificate.</p>
            </div>
          )}

          {/* Cancel form */}
          {action === "cancel" && (
            <div className="space-y-3">
              <div>
                <Label>Cancellation Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="e.g. Parent requested cancellation, child is unwell..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1 resize-none h-24"
                  required
                />
              </div>
              <div>
                <Label>Doctor Remarks <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="Additional provider note for the cancellation PDF..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 resize-none h-20"
                />
              </div>
            </div>
          )}

          {/* Reschedule form */}
          {action === "reschedule" && (
            <div className="space-y-3">
              <div>
                <Label>New Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="mt-1" min={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <Label>New Time <span className="text-red-500">*</span></Label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Doctor Remarks <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="Reason for moving this appointment..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 resize-none h-20"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-orange-50 border border-orange-100 rounded-lg p-2">
                A new appointment will be created and the original will be marked as Rescheduled.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            disabled={isPending || !isFormValid()}
            onClick={handleConfirm}
            className={clsx(
              action === "checkin"    && "bg-indigo-600 hover:bg-indigo-700 text-white",
              action === "vaccinate"  && "bg-green-600 hover:bg-green-700 text-white",
              action === "complete"   && "bg-violet-600 hover:bg-violet-700 text-white",
              action === "cancel"     && "bg-red-600 hover:bg-red-700 text-white",
              action === "reschedule" && "bg-orange-500 hover:bg-orange-600 text-white",
            )}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function Appointments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState<{ appt: any; action: ActionType } | null>(null);
  const [viewAppt, setViewAppt] = useState<any>(null);

  const { data: appointments, isLoading, refetch } = useGetAppointments(
    { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    { request: getAuthHeaders(), query: { refetchInterval: 4000 } }
  );

  const isClosed = (s: string) => ["cancelled", "rescheduled", "no_show", "missed", "completed"].includes(s);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Appointments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage the full vaccination workflow for each appointment</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by child, parent, or reference ID..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="vaccinated">Vaccinated</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Appointment Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : appointments?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No appointments found.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments?.map((appt) => {
              const actions = getActions(appt.status);
              const closed = isClosed(appt.status);

              return (
                <Card key={appt.id} className={clsx(
                  "border-border/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
                  closed && "opacity-75"
                )}>
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: patient info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-bold text-sm">
                              {appt.childName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground">{appt.childName}</p>
                              <StatusBadge status={appt.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Parent: {appt.parentName}
                              {appt.parentPhone && <span> · {appt.parentPhone}</span>}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium border border-primary/20">
                                {appt.vaccine}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {appt.date} · {appt.time}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">{appt.referenceId}</span>
                            </div>
                            {/* Status Timeline */}
                            <StatusTimeline status={appt.status} />
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap flex-shrink-0">
                        {/* View detail button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setViewAppt(appt)}
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> Details
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 text-gray-700 hover:bg-gray-50"
                          onClick={() => downloadAppointmentDocument(appt as PortalAppointmentDocument, appointments as PortalAppointmentDocument[] | undefined)}
                        >
                          Download PDF
                        </Button>

                        {/* Closed states */}
                        {(appt.status === "completed") && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        )}
                        {(appt.status === "cancelled" || appt.status === "missed" || appt.status === "no_show" || appt.status === "rescheduled") && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                            Closed
                          </span>
                        )}

                        {/* Action buttons */}
                        {actions.map((action) => (
                          <Button
                            key={action.type}
                            variant="outline"
                            size="sm"
                            className={clsx("border font-medium", variantCls[action.variant])}
                            onClick={() => setPendingAction({ appt, action: action.type })}
                          >
                            <action.icon className="w-3.5 h-3.5 mr-1.5" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {pendingAction && (
        <ActionModal
          appt={pendingAction.appt}
          action={pendingAction.action}
          onClose={() => setPendingAction(null)}
          onSuccess={() => refetch()}
        />
      )}


      {/* Detail View Modal */}
      {viewAppt && (
        <Dialog open onOpenChange={() => setViewAppt(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
              <DialogDescription>Full record for {viewAppt.childName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Reference ID", viewAppt.referenceId],
                  ["Child Name", viewAppt.childName],
                  ["Parent", viewAppt.parentName],
                  ["Phone", viewAppt.parentPhone || "—"],
                  ["Vaccine", viewAppt.vaccine],
                  ["Date & Time", `${viewAppt.date} · ${viewAppt.time}`],
                  ["Center", viewAppt.centerName],
                  ["Date of Birth", viewAppt.childDob || "—"],
                  ["Address", viewAppt.address || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-foreground truncate">{value}</p>
                  </div>
                ))}
              </div>
              {/* Secret Code */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-1">Secret Verification Code</p>
                <p className="font-mono text-3xl font-bold tracking-[0.3em] text-indigo-800">{viewAppt.secretCode}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200"
                  onClick={() => downloadAppointmentDocument(viewAppt as PortalAppointmentDocument, appointments as PortalAppointmentDocument[] | undefined)}
                >
                  Download PDF
                </Button>
                {viewAppt.status === "completed" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => downloadPortalCertificate(viewAppt as PortalAppointmentDocument)}
                  >
                    Download Certificate
                  </Button>
                )}
              </div>
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <StatusBadge status={viewAppt.status} />
              </div>
              <StatusTimeline status={viewAppt.status} />
              {/* Cancel Reason */}
              {viewAppt.cancelReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                  <strong>Cancellation Reason:</strong> {viewAppt.cancelReason}
                </div>
              )}
              {/* Notes */}
              {viewAppt.notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">Notes:</strong> {viewAppt.notes}
                </div>
              )}
              {viewAppt.doctorRemarks && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
                  <strong>Doctor Remarks:</strong> {viewAppt.doctorRemarks}
                </div>
              )}
              {viewAppt.batchNumber && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
                  <strong>Batch Number:</strong> {viewAppt.batchNumber}
                  {viewAppt.administeredBy && <span> · <strong>By:</strong> {viewAppt.administeredBy}</span>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewAppt(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
