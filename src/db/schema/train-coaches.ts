import { pgTable, uuid, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { trains } from "./trains";

export const trainCoaches = pgTable(
  "train_coaches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainNo: varchar("train_no", { length: 6 })
      .notNull()
      .references(() => trains.trainNo),
    coachCode: varchar("coach_code", { length: 10 }).notNull(),
    coachClass: varchar("coach_class", { length: 10 }).notNull(),
    position: integer("position").notNull(),
  },
  (t) => ({
    trainCoachUnique: uniqueIndex("train_coaches_train_no_coach_code").on(
      t.trainNo,
      t.coachCode,
    ),
  }),
);
