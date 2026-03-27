import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const childrenTable = pgTable("children", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender"),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone"),
  address: text("address"),
  centerId: text("center_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChildSchema = createInsertSchema(childrenTable).omit({ createdAt: true });
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof childrenTable.$inferSelect;
