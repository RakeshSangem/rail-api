import { Hono } from "hono";
import { logger } from "hono/logger";
import stationsRoutes from "./routes/stations";
import trainsRoutes from "./routes/trains";

const app = new Hono();

app.use(logger());

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});

app.route("/stations", stationsRoutes);
app.route("/trains", trainsRoutes);

export default {
  port: 3000,
  fetch: app.fetch,
};
