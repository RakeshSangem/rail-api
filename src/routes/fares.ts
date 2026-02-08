import { Hono } from "hono";
import { getFaresByTrainNo } from "../services/fares";
import { getTrainByNumber } from "../services/trains";

const app = new Hono();

// Get fares for a specific train
app.get("/train/:trainNo", async (c) => {
  const trainNo = c.req.param("trainNo");
  
  // Check if train exists
  const train = await getTrainByNumber(trainNo);
  if (!train) {
    return c.json({ error: "Train not found" }, 404);
  }
  
  const fares = await getFaresByTrainNo(trainNo);
  
  // Group fares by class
  const faresByClass = fares.reduce((acc, fare) => {
    if (!acc[fare.classCode]) {
      acc[fare.classCode] = [];
    }
    acc[fare.classCode].push({
      quotaCode: fare.quotaCode,
      fare: fare.fare,
      currency: fare.currency,
    });
    return acc;
  }, {} as Record<string, { quotaCode: string; fare: number; currency: string }[]>);
  
  return c.json({
    trainNo,
    trainName: train.name,
    totalFares: fares.length,
    faresByClass,
    fares,
  });
});

export default app;
