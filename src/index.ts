import { Hono } from "hono";
import { or, ilike } from "drizzle-orm";
import { db } from "./db";
import { stations } from "./db/schema";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});

app.get("/stations", async (c) => {
  const q = c.req.query("q")?.trim();
  const pattern = q ? `%${q}%` : null;

  const rows = await db
    .select()
    .from(stations)
    .where(
      pattern
        ? or(
            ilike(stations.name, pattern),
            ilike(stations.code, pattern),
            ilike(stations.city, pattern),
          )
        : undefined,
    );
  return c.json(rows);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
