import { jsPDF } from "jspdf";
import type { Appointment } from "@workspace/api-client-react";

export type PortalAppointmentDocument = Appointment & {
  doctorRemarks?: string;
  batchNumber?: string;
  administeredBy?: string;
  centerAddress?: string;
  sessionSite?: string;
  rescheduledToAppointmentId?: string;
  completedAt?: string;
};

type PdfKind = "appointment" | "cancellation" | "reschedule" | "certificate";

function drawHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(50, 67, 190);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, 9, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Raksha Setu Doctor Portal", pageWidth / 2, 15.5, { align: "center" });
}

function addRow(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`${label}:`, 15, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(value || "-", 120);
  doc.text(lines, 70, y);
  return y + Math.max(lines.length * 6, 7);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildDocument(appointment: PortalAppointmentDocument, kind: PdfKind, replacement?: PortalAppointmentDocument) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30;
  const titleMap: Record<PdfKind, string> = {
    appointment: "Appointment Slip",
    cancellation: "Cancellation Slip",
    reschedule: "Reschedule Slip",
    certificate: "Vaccination Certificate",
  };

  drawHeader(doc, titleMap[kind]);
  let y = 30;

  if (kind === "cancellation") {
    doc.setTextColor(190, 30, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CANCELLED", pageWidth / 2, y, { align: "center" });
    y += 12;
  }

  if (kind === "reschedule") {
    doc.setTextColor(181, 104, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RESCHEDULED", pageWidth / 2, y, { align: "center" });
    y += 12;
  }

  if (kind === "certificate") {
    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("VACCINATION COMPLETED", pageWidth / 2, y, { align: "center" });
    y += 12;
  }

  y = addRow(doc, "Patient", appointment.childName, y);
  y = addRow(doc, "Parent / Guardian", appointment.parentName, y);
  y = addRow(doc, "Reference ID", appointment.referenceId, y);
  y = addRow(doc, "Vaccine", appointment.vaccine, y);
  y = addRow(doc, "Centre", appointment.centerName, y);
  y = addRow(doc, "Address", appointment.centerAddress || appointment.address || "-", y);
  y = addRow(doc, "Session Site", appointment.sessionSite || appointment.centerName, y);
  y = addRow(doc, "Date", formatDate(appointment.date), y);
  y = addRow(doc, "Time", appointment.time, y);
  y = addRow(doc, "Status", appointment.status.replace(/_/g, " ").toUpperCase(), y);

  if (kind === "appointment") {
    y = addRow(doc, "Secret Code", appointment.secretCode, y);
  }

  if (kind === "cancellation") {
    y = addRow(doc, "Cancellation Reason", appointment.cancelReason || appointment.doctorRemarks || "-", y);
  }

  if (kind === "reschedule") {
    y = addRow(doc, "Doctor Remarks", appointment.doctorRemarks || "Appointment rescheduled by provider.", y);
    if (replacement) {
      y = addRow(doc, "New Appointment ID", replacement.id, y);
      y = addRow(doc, "New Date", formatDate(replacement.date), y);
      y = addRow(doc, "New Time", replacement.time, y);
      y = addRow(doc, "New Centre", replacement.centerName, y);
    }
  }

  if (kind === "certificate") {
    y = addRow(doc, "Completed On", formatDate(appointment.completedAt || appointment.vaccinationTime || appointment.date), y);
    y = addRow(doc, "Batch Number", appointment.batchNumber || "-", y);
    y = addRow(doc, "Administered By", appointment.administeredBy || "Raksha Setu Medical Officer", y);
    y = addRow(doc, "Remarks", appointment.doctorRemarks || appointment.notes || "Vaccination administered successfully.", y);
  }

  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.rect(15, y + 4, contentWidth, 16, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const note = {
    appointment: "Please verify the secret code during check-in and continue the vaccination workflow in sequence.",
    cancellation: "This appointment was cancelled through the Raksha Setu provider workflow.",
    reschedule: "This document records the provider-initiated reschedule and the updated visit details.",
    certificate: "This certificate confirms successful completion of the listed vaccination.",
  }[kind];
  const noteLines = doc.splitTextToSize(note, contentWidth - 6);
  doc.text(noteLines, 18, y + 9);
  return doc;
}

export function downloadPortalAppointmentSlip(appointment: PortalAppointmentDocument) {
  buildDocument(appointment, "appointment").save(`Appointment_${appointment.referenceId}.pdf`);
}

export function downloadPortalCancellationSlip(appointment: PortalAppointmentDocument) {
  buildDocument(appointment, "cancellation").save(`Cancellation_${appointment.referenceId}.pdf`);
}

export function downloadPortalRescheduleSlip(
  appointment: PortalAppointmentDocument,
  replacement?: PortalAppointmentDocument,
) {
  buildDocument(appointment, "reschedule", replacement).save(`Reschedule_${appointment.referenceId}.pdf`);
}

export function downloadPortalCertificate(appointment: PortalAppointmentDocument) {
  buildDocument(appointment, "certificate").save(`Vaccination_Certificate_${appointment.referenceId}.pdf`);
}
