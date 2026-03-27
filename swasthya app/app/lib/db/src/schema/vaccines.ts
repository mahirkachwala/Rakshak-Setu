import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";

export const vaccinesTable = pgTable("vaccines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ageWeeks: integer("age_weeks").notNull(),
  ageLabel: text("age_label").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  description: text("description").notNull(),
  sideEffects: text("side_effects").notNull(),
  diseases: text("diseases").notNull(),
});

export type Vaccine = typeof vaccinesTable.$inferSelect;
