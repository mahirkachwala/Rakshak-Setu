import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const slotsTable = pgTable("slots", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  centerName: text("center_name").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull(),
  booked: integer("booked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSlotSchema = createInsertSchema(slotsTable).omit({ createdAt: true, booked: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slotsTable.$inferSelect;
