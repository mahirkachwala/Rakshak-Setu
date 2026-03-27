import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "swasthya_salt").digest("hex");
}

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString("base64");
}

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user.id);

  let centerName: string | undefined;
  if (user.centerId) {
    const { centersTable } = await import("@workspace/db");
    const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, user.centerId)).limit(1);
    centerName = center?.name;
  }

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.centerId ?? undefined,
      centerName,
    },
  });
});

router.get("/me", async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const userId = decoded.split(":")[0];
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let centerName: string | undefined;
    if (user.centerId) {
      const { centersTable } = await import("@workspace/db");
      const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, user.centerId)).limit(1);
      centerName = center?.name;
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.centerId ?? undefined,
      centerName,
    });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
