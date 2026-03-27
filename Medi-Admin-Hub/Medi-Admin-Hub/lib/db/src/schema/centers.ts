import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const centerTypeEnum = pgEnum("center_type", ["PHC", "UPHC", "CHC", "Hospital"]);

export const centersTable = pgTable("centers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  type: centerTypeEnum("type").notNull(),
  timing: text("timing"),
  services: text("services").array().notNull().default([]),
  phone: text("phone"),
  district: text("district"),
  state: text("state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCenterSchema = createInsertSchema(centersTable).omit({ createdAt: true });
export type InsertCenter = z.infer<typeof insertCenterSchema>;
export type Center = typeof centersTable.$inferSelect;
