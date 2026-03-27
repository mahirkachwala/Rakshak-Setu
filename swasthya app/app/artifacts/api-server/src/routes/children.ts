import { Router, type IRouter } from "express";
import { db, childrenTable, vaccinesTable, vaccineRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function getChildStatus(schedule: ReturnType<typeof computeSchedule>) {
  if (schedule.missed.length > 0) return "missed";
  if (schedule.dueToday.length > 0 || schedule.dueThisWeek.length > 0) return "due";
  return "safe";
}

function computeSchedule(dob: string, vaccines: typeof vaccinesTable.$inferSelect[], completedIds: number[]) {
  const dobDate = new Date(dob);
  const today = new Date();

  const scheduled = vaccines.map(v => {
    const scheduledDate = new Date(dobDate);
    scheduledDate.setDate(scheduledDate.getDate() + v.ageWeeks * 7);

    const isCompleted = completedIds.includes(v.id);
    const diff = Math.floor((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: string;
    if (isCompleted) {
      status = "completed";
    } else if (diff < 0) {
      status = "missed";
    } else if (diff === 0) {
      status = "due_today";
    } else if (diff <= 7) {
      status = "due_this_week";
    } else {
      status = "upcoming";
    }

    return {
      id: `sv_${v.id}`,
      vaccineId: String(v.id),
      name: v.name,
      scheduledDate: scheduledDate.toISOString().split("T")[0],
      ageWeeks: v.ageWeeks,
      ageLabel: v.ageLabel,
      status,
      isMandatory: v.isMandatory,
    };
  });

  return {
    dueToday: scheduled.filter(s => s.status === "due_today"),
    dueThisWeek: scheduled.filter(s => s.status === "due_this_week"),
    upcoming: scheduled.filter(s => s.status === "upcoming"),
    missed: scheduled.filter(s => s.status === "missed"),
    completed: scheduled.filter(s => s.status === "completed"),
  };
}

router.get("/", async (_req, res) => {
  const children = await db.select().from(childrenTable);
  const vaccines = await db.select().from(vaccinesTable);

  const result = await Promise.all(children.map(async child => {
    const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, child.id));
    const completedIds = records.map(r => r.vaccineId);
    const schedule = computeSchedule(child.dob, vaccines, completedIds);
    const status = getChildStatus(schedule);
    const upcoming = [...schedule.dueToday, ...schedule.dueThisWeek, ...schedule.upcoming];
    const next = upcoming[0];

    return {
      id: String(child.id),
      name: child.name,
      dob: child.dob,
      gender: child.gender,
      bloodGroup: child.bloodGroup || null,
      completedVaccines: schedule.completed.length,
      totalVaccines: vaccines.length,
      status,
      nextVaccineDate: next?.scheduledDate || null,
      nextVaccineName: next?.name || null,
    };
  }));

  res.json(result);
});

router.post("/", async (req, res) => {
  const { name, dob, gender, bloodGroup } = req.body;
  const inserted = await db.insert(childrenTable).values({
    name,
    dob,
    gender,
    bloodGroup: bloodGroup || null,
    userId: 1,
  }).returning();
  const child = inserted[0];
  const vaccines = await db.select().from(vaccinesTable);
  const schedule = computeSchedule(child.dob, vaccines, []);
  const status = getChildStatus(schedule);

  res.status(201).json({
    id: String(child.id),
    name: child.name,
    dob: child.dob,
    gender: child.gender,
    bloodGroup: child.bloodGroup || null,
    completedVaccines: 0,
    totalVaccines: vaccines.length,
    status,
    nextVaccineDate: null,
    nextVaccineName: null,
  });
});

router.get("/:childId", async (req, res) => {
  const childId = parseInt(req.params.childId);
  const children = await db.select().from(childrenTable).where(eq(childrenTable.id, childId));
  if (children.length === 0) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  const child = children[0];
  const vaccines = await db.select().from(vaccinesTable);
  const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, childId));
  const completedIds = records.map(r => r.vaccineId);
  const schedule = computeSchedule(child.dob, vaccines, completedIds);
  const status = getChildStatus(schedule);

  res.json({
    id: String(child.id),
    name: child.name,
    dob: child.dob,
    gender: child.gender,
    bloodGroup: child.bloodGroup || null,
    completedVaccines: schedule.completed.length,
    totalVaccines: vaccines.length,
    status,
    nextVaccineDate: null,
    nextVaccineName: null,
  });
});

router.put("/:childId", async (req, res) => {
  const childId = parseInt(req.params.childId);
  const { name, dob, gender, bloodGroup } = req.body;
  await db.update(childrenTable).set({ name, dob, gender, bloodGroup: bloodGroup || null }).where(eq(childrenTable.id, childId));
  const children = await db.select().from(childrenTable).where(eq(childrenTable.id, childId));
  const child = children[0];
  const vaccines = await db.select().from(vaccinesTable);
  const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, childId));
  const completedIds = records.map(r => r.vaccineId);
  const schedule = computeSchedule(child.dob, vaccines, completedIds);
  const status = getChildStatus(schedule);

  res.json({
    id: String(child.id),
    name: child.name,
    dob: child.dob,
    gender: child.gender,
    bloodGroup: child.bloodGroup || null,
    completedVaccines: schedule.completed.length,
    totalVaccines: vaccines.length,
    status,
    nextVaccineDate: null,
    nextVaccineName: null,
  });
});

router.delete("/:childId", async (req, res) => {
  const childId = parseInt(req.params.childId);
  await db.delete(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, childId));
  await db.delete(childrenTable).where(eq(childrenTable.id, childId));
  res.json({ success: true });
});

router.get("/:childId/vaccine-schedule", async (req, res) => {
  const childId = parseInt(req.params.childId);
  const children = await db.select().from(childrenTable).where(eq(childrenTable.id, childId));
  if (children.length === 0) {
    res.status(404).json({ error: "Child not found" });
    return;
  }
  const child = children[0];
  const vaccines = await db.select().from(vaccinesTable);
  const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, childId));
  const completedIds = records.map(r => r.vaccineId);
  const schedule = computeSchedule(child.dob, vaccines, completedIds);

  res.json({
    childId: String(child.id),
    childName: child.name,
    childDob: child.dob,
    completedCount: schedule.completed.length,
    totalCount: vaccines.length,
    ...schedule,
  });
});

router.post("/:childId/vaccines/:vaccineId/complete", async (req, res) => {
  const childId = parseInt(req.params.childId);
  const vaccineId = parseInt(req.params.vaccineId);
  const { completedDate, centerName, notes } = req.body;

  const existing = await db.select().from(vaccineRecordsTable).where(
    and(eq(vaccineRecordsTable.childId, childId), eq(vaccineRecordsTable.vaccineId, vaccineId))
  );

  const vaccines = await db.select().from(vaccinesTable);
  const vaccine = vaccines.find(v => v.id === vaccineId);
  if (!vaccine) {
    res.status(404).json({ error: "Vaccine not found" });
    return;
  }

  if (existing.length > 0) {
    res.json({
      id: String(existing[0].id),
      childId: String(childId),
      vaccineId: String(vaccineId),
      vaccineName: vaccine.name,
      completedDate: existing[0].completedDate,
      centerName: existing[0].centerName || null,
      notes: existing[0].notes || null,
    });
    return;
  }

  const inserted = await db.insert(vaccineRecordsTable).values({
    childId,
    vaccineId,
    vaccineName: vaccine.name,
    completedDate,
    centerName: centerName || null,
    notes: notes || null,
  }).returning();

  const record = inserted[0];
  res.json({
    id: String(record.id),
    childId: String(childId),
    vaccineId: String(vaccineId),
    vaccineName: vaccine.name,
    completedDate: record.completedDate,
    centerName: record.centerName || null,
    notes: record.notes || null,
  });
});

export default router;
