import { Hono } from "hono";
import { getCoachesByTrainNo } from "../services/coaches";
import { getTrainByNumber } from "../services/trains";

const app = new Hono();

// Get coaches for a specific train
app.get("/train/:trainNo", async (c) => {
  const trainNo = c.req.param("trainNo");
  
  // Check if train exists
  const train = await getTrainByNumber(trainNo);
  if (!train) {
    return c.json({ error: "Train not found" }, 404);
  }
  
  const coaches = await getCoachesByTrainNo(trainNo);
  
  return c.json({
    trainNo,
    trainName: train.name,
    totalCoaches: coaches.length,
    coaches,
  });
});

export default app;
