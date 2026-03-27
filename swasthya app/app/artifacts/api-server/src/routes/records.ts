import { Router, type IRouter } from "express";
import { db, vaccineRecordsTable, vaccinesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:childId", async (req, res) => {
  const childId = parseInt(req.params.childId);
  const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, childId));
  const vaccines = await db.select().from(vaccinesTable);

  res.json({
    childId: String(childId),
    vaccinations: records.map(r => ({
      id: String(r.id),
      childId: String(r.childId),
      vaccineId: String(r.vaccineId),
      vaccineName: r.vaccineName,
      completedDate: r.completedDate,
      centerName: r.centerName || null,
      notes: r.notes || null,
    })),
    totalCompleted: records.length,
    totalScheduled: vaccines.length,
  });
});

export default router;
