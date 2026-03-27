import { pgTable, text, boolean, real, serial } from "drizzle-orm/pg-core";

export const centersTable = pgTable("centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull().default("government"),
  isFree: boolean("is_free").notNull().default(true),
  cost: text("cost"),
  phone: text("phone"),
  vaccinesAvailable: text("vaccines_available").notNull().default(""),
  lat: real("lat"),
  lng: real("lng"),
  openHours: text("open_hours"),
  pincode: text("pincode"),
  distance: text("distance").default("2 km"),
});

export type Center = typeof centersTable.$inferSelect;
