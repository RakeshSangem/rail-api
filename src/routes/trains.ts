import { Hono } from "hono";
import { getTrains } from "../services/trains";

const app = new Hono();

app.get("/", async (c) => {
  const { page, limit } = c.req.query();
  const { data, pagination } = await getTrains(
    page ? Number(page) : 1,
    limit ? Number(limit) : 10,
  );
  return c.json({
    data,
    pagination,
  });
});

export default app;
