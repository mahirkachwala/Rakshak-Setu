import { Router, type IRouter } from "express";
import { db, childrenTable, vaccinesTable, vaccineRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function computeSchedule(dob: string, vaccines: typeof vaccinesTable.$inferSelect[], completedIds: number[]) {
  const dobDate = new Date(dob);
  const today = new Date();

  return vaccines.map(v => {
    const scheduledDate = new Date(dobDate);
    scheduledDate.setDate(scheduledDate.getDate() + v.ageWeeks * 7);
    const isCompleted = completedIds.includes(v.id);
    const diff = Math.floor((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: string;
    if (isCompleted) status = "completed";
    else if (diff < 0) status = "missed";
    else if (diff === 0) status = "due_today";
    else if (diff <= 7) status = "due_this_week";
    else status = "upcoming";

    return { status, name: v.name, scheduledDate: scheduledDate.toISOString().split("T")[0] };
  });
}

router.get("/summary", async (_req, res) => {
  const children = await db.select().from(childrenTable);
  const vaccines = await db.select().from(vaccinesTable);

  let totalUpcoming = 0;
  let totalMissed = 0;
  let todayAction = "All vaccinations are up to date! Great job!";

  const childSummaries = await Promise.all(children.map(async child => {
    const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, child.id));
    const completedIds = records.map(r => r.vaccineId);
    const schedule = computeSchedule(child.dob, vaccines, completedIds);

    const missed = schedule.filter(s => s.status === "missed").length;
    const dueToday = schedule.filter(s => s.status === "due_today").length;
    const dueThisWeek = schedule.filter(s => s.status === "due_this_week").length;
    const upcoming = schedule.filter(s => s.status === "upcoming");

    totalMissed += missed;
    totalUpcoming += dueToday + dueThisWeek;

    let status: string;
    if (missed > 0) status = "missed";
    else if (dueToday > 0 || dueThisWeek > 0) status = "due";
    else status = "safe";

    const next = [...schedule.filter(s => s.status === "due_today"), ...schedule.filter(s => s.status === "due_this_week"), ...upcoming][0];

    return {
      id: String(child.id),
      name: child.name,
      dob: child.dob,
      gender: child.gender,
      bloodGroup: child.bloodGroup || null,
      completedVaccines: records.length,
      totalVaccines: vaccines.length,
      status,
      nextVaccineDate: next?.scheduledDate || null,
      nextVaccineName: next?.name || null,
    };
  }));

  if (totalMissed > 0) {
    todayAction = `${totalMissed} vaccine(s) missed! Visit a health center as soon as possible.`;
  } else if (totalUpcoming > 0) {
    todayAction = `${totalUpcoming} vaccine(s) due soon. Please visit a health center this week.`;
  }

  res.json({
    totalChildren: children.length,
    children: childSummaries,
    todayAction,
    upcomingCount: totalUpcoming,
    missedCount: totalMissed,
  });
});

export default router;
