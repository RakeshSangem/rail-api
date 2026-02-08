import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { 
  getTrains, 
  getTrainByNumber, 
  searchTrainsBetweenStations,
  getTrainRoutes 
} from "../services/trains";

const app = new Hono();

// List all trains with pagination and search
app.get("/", async (c) => {
  const { page, limit, q } = c.req.query();
  const { data, pagination } = await getTrains(
    page ? Number(page) : 1,
    limit ? Number(limit) : 10,
    q
  );
  return c.json({
    data,
    pagination,
  });
});

// Search trains between stations
const searchSchema = z.object({
  from: z.string().min(2).max(10),
  to: z.string().min(2).max(10),
  page: z.string().optional(),
  limit: z.string().optional(),
});

app.get("/search", zValidator("query", searchSchema), async (c) => {
  const { from, to, page, limit } = c.req.valid("query");
  
  const result = await searchTrainsBetweenStations(
    from.toUpperCase(),
    to.toUpperCase(),
    page ? Number(page) : 1,
    limit ? Number(limit) : 20
  );
  
  return c.json(result);
});

// Get train by number
app.get("/:trainNo", async (c) => {
  const trainNo = c.req.param("trainNo");
  const train = await getTrainByNumber(trainNo);
  
  if (!train) {
    return c.json({ error: "Train not found" }, 404);
  }
  
  return c.json(train);
});

// Get train routes
app.get("/:trainNo/routes", async (c) => {
  const trainNo = c.req.param("trainNo");
  const routes = await getTrainRoutes(trainNo);
  
  if (routes.length === 0) {
    return c.json({ error: "Train not found or has no routes" }, 404);
  }
  
  return c.json({
    trainNo,
    routes,
  });
});

export default app;
