import { Router, type IRouter } from "express";
import { db, vaccinesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const vaccines = await db.select().from(vaccinesTable);
  res.json(vaccines.map(v => ({
    id: String(v.id),
    name: v.name,
    ageWeeks: v.ageWeeks,
    ageLabel: v.ageLabel,
    isMandatory: v.isMandatory,
    description: v.description,
    sideEffects: v.sideEffects,
    diseases: v.diseases,
  })));
});

export default router;
