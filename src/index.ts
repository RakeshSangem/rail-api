import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import stationsRoutes from "./routes/stations";
import trainsRoutes from "./routes/trains";
import coachesRoutes from "./routes/coaches";
import faresRoutes from "./routes/fares";
import type { Variables } from "./types";
import { rateLimiter } from "hono-rate-limiter";

export const app = new Hono<{ Variables: Variables }>();

app.use(logger());
app.use(cors({ origin: "*" }));
app.use(
  rateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 100,
    keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
  }),
);

app.get("/", (c) => {
  return c.json({ message: "Railway API - Indian Trains & Stations" });
});

app.route("/auth", authRoutes);
app.route("/stations", stationsRoutes);
app.route("/trains", trainsRoutes);
app.route("/coaches", coachesRoutes);
app.route("/fares", faresRoutes);

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
