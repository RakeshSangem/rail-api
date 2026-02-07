import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const stations = pgTable("stations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
});
