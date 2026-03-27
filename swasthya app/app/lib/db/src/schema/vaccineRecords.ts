import { pgTable, text, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaccineRecordsTable = pgTable("vaccine_records", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  vaccineId: integer("vaccine_id").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  completedDate: text("completed_date").notNull(),
  centerName: text("center_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVaccineRecordSchema = createInsertSchema(vaccineRecordsTable).omit({ id: true, createdAt: true });
export type InsertVaccineRecord = z.infer<typeof insertVaccineRecordSchema>;
export type VaccineRecord = typeof vaccineRecordsTable.$inferSelect;
