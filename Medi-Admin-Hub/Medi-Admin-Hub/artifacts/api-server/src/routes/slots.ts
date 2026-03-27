import { Router, type IRouter, type Request, type Response } from "express";
import { db, slotsTable, centersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  const { centerId, date } = req.query;

  let conditions: any[] = [];
  if (centerId) conditions.push(eq(slotsTable.centerId, centerId as string));
  if (date) conditions.push(eq(slotsTable.date, date as string));

  const slots =
    conditions.length > 0
      ? await db.select().from(slotsTable).where(and(...conditions))
      : await db.select().from(slotsTable);

  const enriched = slots.map((slot) => ({
    ...slot,
    available: slot.capacity - slot.booked,
  }));

  return res.json(enriched);
});

router.post("/", async (req: Request, res: Response) => {
  const { centerId, date, startTime, endTime, capacity } = req.body;

  if (!centerId || !date || !startTime || !endTime || !capacity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, centerId)).limit(1);
  if (!center) return res.status(404).json({ error: "Center not found" });

  const [slot] = await db
    .insert(slotsTable)
    .values({
      id: crypto.randomUUID(),
      centerId,
      centerName: center.name,
      date,
      startTime,
      endTime,
      capacity: Number(capacity),
      booked: 0,
    })
    .returning();

  return res.status(201).json({ ...slot, available: slot.capacity - slot.booked });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(slotsTable).where(eq(slotsTable.id, id));
  return res.json({ success: true, message: "Slot deleted" });
});

export default router;
