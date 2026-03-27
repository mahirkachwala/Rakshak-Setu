import { Router, type IRouter, type Request, type Response } from "express";
import { db, vaccinationRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  const { childId, centerId } = req.query;

  let conditions: any[] = [];
  if (childId) conditions.push(eq(vaccinationRecordsTable.childId, childId as string));
  if (centerId) conditions.push(eq(vaccinationRecordsTable.centerId, centerId as string));

  const records =
    conditions.length > 0
      ? await db.select().from(vaccinationRecordsTable).where(and(...conditions))
      : await db.select().from(vaccinationRecordsTable);

  return res.json(records);
});

export default router;
