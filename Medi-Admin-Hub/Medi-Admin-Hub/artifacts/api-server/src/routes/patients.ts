import { Router, type IRouter, type Request, type Response } from "express";
import { db, childrenTable, appointmentsTable, vaccinationRecordsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  const { search } = req.query;

  const children = search
    ? await db
        .select()
        .from(childrenTable)
        .where(
          or(
            ilike(childrenTable.name, `%${search}%`),
            ilike(childrenTable.parentName, `%${search}%`)
          )
        )
    : await db.select().from(childrenTable);

  const enriched = await Promise.all(
    children.map(async (child) => {
      const appts = await db.select().from(appointmentsTable).where(eq(appointmentsTable.childId, child.id));
      const totalVaccines = appts.length;
      const completedVaccines = appts.filter((a) => a.status === "completed").length;
      const missedVaccines = appts.filter((a) => a.status === "missed").length;
      return { ...child, totalVaccines, completedVaccines, missedVaccines };
    })
  );

  return res.json(enriched);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [child] = await db.select().from(childrenTable).where(eq(childrenTable.id, id)).limit(1);
  if (!child) return res.status(404).json({ error: "Patient not found" });

  const appointments = await db.select().from(appointmentsTable).where(eq(appointmentsTable.childId, id));
  const vaccinationHistory = await db.select().from(vaccinationRecordsTable).where(eq(vaccinationRecordsTable.childId, id));

  const totalVaccines = appointments.length;
  const completedVaccines = appointments.filter((a) => a.status === "completed").length;
  const missedVaccines = appointments.filter((a) => a.status === "missed").length;

  return res.json({
    child: { ...child, totalVaccines, completedVaccines, missedVaccines },
    appointments,
    vaccinationHistory,
  });
});

export default router;
