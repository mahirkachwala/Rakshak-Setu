import { Router, type IRouter, type Request, type Response } from "express";
import { db, appointmentsTable, childrenTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

const ACTIVE_STATUSES = ["booked", "pending", "checked_in", "vaccinated"] as const;
const COMPLETED_STATUSES = ["completed"] as const;
const MISSED_STATUSES = ["missed", "no_show", "cancelled"] as const;

router.get("/stats", async (req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];
  const { centerId } = req.query;

  const whereClause = centerId
    ? and(eq(appointmentsTable.date, today), eq(appointmentsTable.centerId, centerId as string))
    : eq(appointmentsTable.date, today);

  const todayAppts = await db.select().from(appointmentsTable).where(whereClause);

  const totalToday = todayAppts.length;
  const completed = todayAppts.filter((a) => COMPLETED_STATUSES.includes(a.status as any)).length;
  const pending = todayAppts.filter((a) => ACTIVE_STATUSES.includes(a.status as any)).length;
  const missed = todayAppts.filter((a) => MISSED_STATUSES.includes(a.status as any)).length;

  const allChildren = await db.select({ id: childrenTable.id }).from(childrenTable);
  const totalPatients = allChildren.length;

  const upcomingAppts = await db
    .select()
    .from(appointmentsTable)
    .where(inArray(appointmentsTable.status, ["booked", "pending"] as any[]))
    .limit(5);

  return res.json({
    totalToday,
    completed,
    pending,
    missed,
    totalPatients,
    upcomingAppointments: upcomingAppts,
  });
});

export default router;
