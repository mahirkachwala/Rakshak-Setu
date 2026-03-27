import { Router, type IRouter } from "express";
import { db, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function generateAppointmentId() {
  return `SS${Date.now().toString(36).toUpperCase()}`;
}

router.get("/", async (_req, res) => {
  const bookings = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);
  res.json(bookings.map(b => ({
    id: String(b.id),
    childId: String(b.childId),
    childName: b.childName,
    vaccineId: String(b.vaccineId),
    vaccineName: b.vaccineName,
    centerId: String(b.centerId),
    centerName: b.centerName,
    date: b.date,
    time: b.time,
    status: b.status,
    appointmentId: b.appointmentId,
    createdAt: b.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const { childId, vaccineId, centerId, date, time } = req.body;

  const { db: dbInstance, childrenTable, vaccinesTable, centersTable } = await import("@workspace/db");
  const { eq: eqOp } = await import("drizzle-orm");

  const children = await dbInstance.select().from(childrenTable).where(eqOp(childrenTable.id, parseInt(childId)));
  const vaccines = await dbInstance.select().from(vaccinesTable).where(eqOp(vaccinesTable.id, parseInt(vaccineId)));
  const centers = await dbInstance.select().from(centersTable).where(eqOp(centersTable.id, parseInt(centerId)));

  const child = children[0];
  const vaccine = vaccines[0];
  const center = centers[0];

  if (!child || !vaccine || !center) {
    res.status(400).json({ error: "Invalid child, vaccine, or center" });
    return;
  }

  const inserted = await db.insert(bookingsTable).values({
    childId: parseInt(childId),
    childName: child.name,
    vaccineId: parseInt(vaccineId),
    vaccineName: vaccine.name,
    centerId: parseInt(centerId),
    centerName: center.name,
    date,
    time,
    status: "confirmed",
    appointmentId: generateAppointmentId(),
  }).returning();

  const booking = inserted[0];
  res.status(201).json({
    id: String(booking.id),
    childId: String(booking.childId),
    childName: booking.childName,
    vaccineId: String(booking.vaccineId),
    vaccineName: booking.vaccineName,
    centerId: String(booking.centerId),
    centerName: booking.centerName,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    appointmentId: booking.appointmentId,
    createdAt: booking.createdAt.toISOString(),
  });
});

router.get("/:bookingId", async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (bookings.length === 0) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const b = bookings[0];
  res.json({
    id: String(b.id),
    childId: String(b.childId),
    childName: b.childName,
    vaccineId: String(b.vaccineId),
    vaccineName: b.vaccineName,
    centerId: String(b.centerId),
    centerName: b.centerName,
    date: b.date,
    time: b.time,
    status: b.status,
    appointmentId: b.appointmentId,
    createdAt: b.createdAt.toISOString(),
  });
});

router.delete("/:bookingId", async (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, bookingId));
  res.json({ success: true });
});

export default router;
