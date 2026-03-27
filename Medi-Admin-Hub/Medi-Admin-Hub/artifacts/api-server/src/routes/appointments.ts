import { Router, type IRouter, type Request, type Response } from "express";
import { db, appointmentsTable, vaccinationRecordsTable, slotsTable } from "@workspace/db";
import { eq, and, ilike, or, gt, sql } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const CANCELLABLE = ["booked", "pending", "checked_in"];
const CHECKIN_FROM = ["booked", "pending"];

router.get("/", async (req: Request, res: Response) => {
  const { date, status, vaccine, search, centerId } = req.query;
  let conditions: any[] = [];
  if (date) conditions.push(eq(appointmentsTable.date, date as string));
  if (status) conditions.push(eq(appointmentsTable.status, status as any));
  if (vaccine) conditions.push(ilike(appointmentsTable.vaccine, `%${vaccine}%`));
  if (centerId) conditions.push(eq(appointmentsTable.centerId, centerId as string));
  if (search) {
    conditions.push(
      or(
        ilike(appointmentsTable.childName, `%${search}%`),
        ilike(appointmentsTable.parentName, `%${search}%`),
        ilike(appointmentsTable.referenceId, `%${search}%`)
      )
    );
  }
  const appts =
    conditions.length > 0
      ? await db.select().from(appointmentsTable).where(and(...conditions))
      : await db.select().from(appointmentsTable);
  return res.json(appts);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  return res.json(appt);
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  if (!["pending", "completed", "missed", "booked", "checked_in", "vaccinated", "cancelled", "rescheduled", "no_show"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status, notes: notes || appt.notes, updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id))
    .returning();
  if (status === "completed") {
    const existing = await db.select().from(vaccinationRecordsTable).where(eq(vaccinationRecordsTable.appointmentId, id)).limit(1);
    if (existing.length === 0) {
      await db.insert(vaccinationRecordsTable).values({
        id: crypto.randomUUID(),
        childId: appt.childId,
        childName: appt.childName,
        vaccine: appt.vaccine,
        date: appt.date,
        centerId: appt.centerId,
        centerName: appt.centerName,
        notes: notes || null,
        appointmentId: id,
      });
    }
  }
  return res.json(updated);
});

// POST /appointments/:id/checkin — BOOKED → CHECKED_IN
router.post("/:id/checkin", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (!CHECKIN_FROM.includes(appt.status)) {
    return res.status(400).json({ error: `Cannot check in appointment with status '${appt.status}'. Must be booked.` });
  }
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status: "checked_in", checkinTime: new Date(), updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id))
    .returning();
  return res.json(updated);
});

// POST /appointments/:id/vaccinate — CHECKED_IN → VACCINATED
router.post("/:id/vaccinate", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { batchNumber, notes } = req.body || {};
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (appt.status !== "checked_in") {
    return res.status(400).json({ error: `Cannot vaccinate: patient must be checked in first (current: ${appt.status}).` });
  }
  const now = new Date();
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status: "vaccinated", vaccinationTime: now, notes: notes || appt.notes, updatedAt: now })
    .where(eq(appointmentsTable.id, id))
    .returning();

  // Create vaccination record
  const existing = await db.select().from(vaccinationRecordsTable).where(eq(vaccinationRecordsTable.appointmentId, id)).limit(1);
  if (existing.length === 0) {
    await db.insert(vaccinationRecordsTable).values({
      id: crypto.randomUUID(),
      childId: appt.childId,
      childName: appt.childName,
      vaccine: appt.vaccine,
      date: appt.date,
      centerId: appt.centerId,
      centerName: appt.centerName,
      batchNumber: batchNumber || null,
      notes: notes || null,
      appointmentId: id,
    });
  }
  return res.json(updated);
});

// POST /appointments/:id/complete — VACCINATED → COMPLETED
router.post("/:id/complete", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (appt.status !== "vaccinated") {
    return res.status(400).json({ error: `Cannot complete: must be vaccinated first (current: ${appt.status}).` });
  }
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id))
    .returning();
  return res.json(updated);
});

// POST /appointments/:id/cancel
router.post("/:id/cancel", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: "Cancellation reason is required" });
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (!CANCELLABLE.includes(appt.status)) {
    return res.status(400).json({ error: `Cannot cancel appointment with status '${appt.status}'.` });
  }
  const [updated] = await db
    .update(appointmentsTable)
    .set({ status: "cancelled", cancelReason: reason, updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id))
    .returning();

  // Restore slot capacity if applicable
  if (appt.centerId) {
    await db
      .update(slotsTable)
      .set({ booked: sql`GREATEST(${slotsTable.booked} - 1, 0)` })
      .where(and(eq(slotsTable.centerId, appt.centerId), eq(slotsTable.date, appt.date)));
  }
  return res.json(updated);
});

// POST /appointments/:id/reschedule
router.post("/:id/reschedule", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newDate, newTime, newSlotId } = req.body;
  if (!newDate || !newTime) return res.status(400).json({ error: "newDate and newTime are required" });
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
  if (!appt) return res.status(404).json({ error: "Appointment not found" });
  if (!CHECKIN_FROM.includes(appt.status)) {
    return res.status(400).json({ error: `Cannot reschedule appointment with status '${appt.status}'.` });
  }

  // Mark old appointment as rescheduled
  await db
    .update(appointmentsTable)
    .set({ status: "rescheduled", updatedAt: new Date() })
    .where(eq(appointmentsTable.id, id));

  // Create new appointment
  const newRefId = `REF-R${Date.now().toString(36).toUpperCase()}`;
  const newCode = `SS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [newAppt] = await db
    .insert(appointmentsTable)
    .values({
      id: crypto.randomUUID(),
      childId: appt.childId,
      childName: appt.childName,
      parentName: appt.parentName,
      parentPhone: appt.parentPhone,
      vaccine: appt.vaccine,
      date: newDate,
      time: newTime,
      centerId: appt.centerId,
      centerName: appt.centerName,
      status: "booked",
      secretCode: newCode,
      referenceId: newRefId,
      childDob: appt.childDob,
      address: appt.address,
      parentAppointmentId: id,
    })
    .returning();

  return res.json(newAppt);
});

export default router;
