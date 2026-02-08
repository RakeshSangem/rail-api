import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { 
  searchStations, 
  getStations, 
  getStationByCode,
  getStationById,
  getTrainsByStation,
  getStationStats 
} from "../services/stations";

const app = new Hono();

// List all stations with pagination and search
const listSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  q: z.string().optional(),
});

app.get("/", zValidator("query", listSchema), async (c) => {
  const { page, limit, q } = c.req.valid("query");
  const { data, pagination } = await getStations(
    page ? Number(page) : 1,
    limit ? Number(limit) : 20,
    q
  );
  return c.json({
    data,
    pagination,
  });
});

// Search stations (autocomplete)
app.get("/search", async (c) => {
  const q = c.req.query("q");
  const rows = await searchStations(q);
  return c.json(rows);
});

// Get station by code
app.get("/code/:code", async (c) => {
  const code = c.req.param("code");
  const station = await getStationByCode(code);
  
  if (!station) {
    return c.json({ error: "Station not found" }, 404);
  }
  
  return c.json(station);
});

// Get station by ID
app.get("/id/:id", async (c) => {
  const id = c.req.param("id");
  const station = await getStationById(id);
  
  if (!station) {
    return c.json({ error: "Station not found" }, 404);
  }
  
  return c.json(station);
});

// Get all trains stopping at a station
app.get("/:code/trains", async (c) => {
  const code = c.req.param("code");
  const trains = await getTrainsByStation(code);
  
  if (trains.length === 0) {
    // Check if station exists
    const station = await getStationByCode(code);
    if (!station) {
      return c.json({ error: "Station not found" }, 404);
    }
  }
  
  return c.json({
    stationCode: code.toUpperCase(),
    totalTrains: trains.length,
    trains,
  });
});

// Get station statistics
app.get("/:code/stats", async (c) => {
  const code = c.req.param("code");
  
  // Check if station exists
  const station = await getStationByCode(code);
  if (!station) {
    return c.json({ error: "Station not found" }, 404);
  }
  
  const stats = await getStationStats(code);
  
  return c.json({
    station,
    stats,
  });
});

export default app;
