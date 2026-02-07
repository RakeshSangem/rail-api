import { Hono } from "hono";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import stationsRoutes from "./routes/stations";
import trainsRoutes from "./routes/trains";
import type { Variables } from "./types";

export const app = new Hono<{ Variables: Variables }>();

app.use(logger());

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});

app.route("/auth", authRoutes);
app.route("/stations", stationsRoutes);
app.route("/trains", trainsRoutes);

app.get("/me", authMiddleware, (c) => {
  const payload = c.get("jwtPayload");
  return c.json({
    user: {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
    },
  });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
