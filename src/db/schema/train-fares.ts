import { pgTable, uuid, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { trains } from "./trains";

export const trainFares = pgTable(
  "train_fares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainNo: varchar("train_no", { length: 6 })
      .notNull()
      .references(() => trains.trainNo),
    classCode: varchar("class", { length: 5 }).notNull(),
    quotaCode: varchar("quota", { length: 5 }).notNull(),
    fare: integer("fare").notNull(),
    currency: varchar("currency", { length: 5 }).notNull(),
  },
  (t) => ({
    trainFareUnique: uniqueIndex("train_fares_train_no_class_quota").on(
      t.trainNo,
      t.classCode,
      t.quotaCode,
    ),
  }),
);
