import { Router, type IRouter } from "express";
import { db, centersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { pincode } = req.query;
  let centers = await db.select().from(centersTable);

  if (pincode && typeof pincode === "string" && pincode.length > 0) {
    const filtered = centers.filter(c => c.pincode === pincode);
    if (filtered.length > 0) centers = filtered;
  }

  res.json(centers.map(c => ({
    id: String(c.id),
    name: c.name,
    address: c.address,
    distance: c.distance || "2 km",
    type: c.type,
    isFree: c.isFree,
    cost: c.cost || "Free",
    phone: c.phone || null,
    vaccinesAvailable: c.vaccinesAvailable ? c.vaccinesAvailable.split(",").map(v => v.trim()).filter(Boolean) : [],
    lat: c.lat || null,
    lng: c.lng || null,
    openHours: c.openHours || "9 AM - 5 PM",
  })));
});

export default router;
