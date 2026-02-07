import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  time,
} from "drizzle-orm/pg-core";

export const trains = pgTable("trains", {
  id: uuid("id").defaultRandom().primaryKey(),

  trainNo: varchar("train_no", { length: 6 }).notNull().unique(),

  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }),
  zone: varchar("zone", { length: 10 }),

  source: varchar("source", { length: 5 }).notNull(),
  destination: varchar("destination", { length: 5 }).notNull(),

  departureTime: time("departure_time"),
  arrivalTime: time("arrival_time"),

  durationMinutes: integer("duration_minutes"),
  distanceKm: integer("distance_km"),

  classes: text("classes"),
  returnTrainNo: varchar("return_train_no", { length: 6 }),
  runsOnDays: varchar("runs_on_days", { length: 7 }).notNull(),
});
