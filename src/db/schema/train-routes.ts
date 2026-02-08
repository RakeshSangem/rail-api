import { pgTable, uuid, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { trains } from "./trains";
import { stations } from "./stations";

export const trainRoutes = pgTable(
  "train_routes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainNo: varchar("train_no", { length: 6 })
      .notNull()
      .references(() => trains.trainNo),
    seq: integer("seq").notNull(), // order in route
    code: varchar("code", { length: 10 })
      .notNull()
      .references(() => stations.code),
    station: varchar("station", { length: 255 }).notNull(),
    arr: varchar("arr", { length: 10 }), // "08:29" | "First"
    dep: varchar("dep", { length: 10 }), // "08:30" | "Last"
    dist: integer("dist"),
    day: integer("day"),
  },
  (t) => ({
    trainRouteUnique: uniqueIndex("train_routes_train_no_seq_code").on(
      t.trainNo,
      t.seq,
      t.code,
    ),
  }),
);
