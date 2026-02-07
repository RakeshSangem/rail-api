import { Hono } from "hono";
import { searchStations } from "../services/stations";

const app = new Hono();

app.get("/", async (c) => {
  const q = c.req.query("q");
  const rows = await searchStations(q);
  return c.json(rows);
});

export default app;
