import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "checked_in",
  "vaccinated",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
  "pending",
  "missed",
]);

export const appointmentsTable = pgTable("appointments", {
  id: text("id").primaryKey(),
  childId: text("child_id").notNull(),
  childName: text("child_name").notNull(),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone"),
  vaccine: text("vaccine").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  centerId: text("center_id").notNull(),
  centerName: text("center_name").notNull(),
  status: appointmentStatusEnum("status").notNull().default("booked"),
  secretCode: text("secret_code").notNull(),
  referenceId: text("reference_id").notNull(),
  childDob: text("child_dob"),
  address: text("address"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  checkinTime: timestamp("checkin_time"),
  vaccinationTime: timestamp("vaccination_time"),
  parentAppointmentId: text("parent_appointment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
