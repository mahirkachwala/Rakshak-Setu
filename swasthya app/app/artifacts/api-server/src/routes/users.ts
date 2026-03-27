import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

async function ensureDefaultUser() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  if (existing.length === 0) {
    await db.insert(usersTable).values({
      name: "Parent",
      phone: "+91 9876543210",
      language: "en",
      notificationsEnabled: true,
    });
  }
  return await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
}

router.get("/profile", async (req, res) => {
  const users = await ensureDefaultUser();
  const user = users[0];
  res.json({
    id: String(user.id),
    name: user.name,
    phone: user.phone,
    language: user.language,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/profile", async (req, res) => {
  await ensureDefaultUser();
  const { name, language, notificationsEnabled } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (language !== undefined) updates.language = language;
  if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, DEFAULT_USER_ID));
  const users = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  const user = users[0];
  res.json({
    id: String(user.id),
    name: user.name,
    phone: user.phone,
    language: user.language,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
