import { Router, type IRouter, type Request, type Response } from "express";
import { db, centersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

router.get("/", async (_req: Request, res: Response) => {
  const centers = await db.select().from(centersTable);
  return res.json(centers);
});

router.post("/", async (req: Request, res: Response) => {
  const { name, address, type, timing, services, phone, district, state } = req.body;

  if (!name || !address || !type || !services) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [center] = await db
    .insert(centersTable)
    .values({
      id: crypto.randomUUID(),
      name,
      address,
      type,
      timing: timing || null,
      services: services || [],
      phone: phone || null,
      district: district || null,
      state: state || null,
    })
    .returning();

  return res.status(201).json(center);
});

router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, type, timing, services, phone, district, state } = req.body;

  const [center] = await db
    .update(centersTable)
    .set({ name, address, type, timing, services, phone, district, state })
    .where(eq(centersTable.id, id))
    .returning();

  if (!center) return res.status(404).json({ error: "Center not found" });
  return res.json(center);
});

export default router;
