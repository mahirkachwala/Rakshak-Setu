import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaccinationRecordsTable = pgTable("vaccination_records", {
  id: text("id").primaryKey(),
  childId: text("child_id").notNull(),
  childName: text("child_name").notNull(),
  vaccine: text("vaccine").notNull(),
  date: text("date").notNull(),
  centerId: text("center_id").notNull(),
  centerName: text("center_name").notNull(),
  administeredBy: text("administered_by"),
  batchNumber: text("batch_number"),
  notes: text("notes"),
  appointmentId: text("appointment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVaccinationRecordSchema = createInsertSchema(vaccinationRecordsTable).omit({ createdAt: true });
export type InsertVaccinationRecord = z.infer<typeof insertVaccinationRecordSchema>;
export type VaccinationRecord = typeof vaccinationRecordsTable.$inferSelect;
