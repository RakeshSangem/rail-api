import { or, ilike } from "drizzle-orm";
import { db } from "../db";
import { stations } from "../db/schema";

export async function searchStations(query?: string) {
  const pattern = query?.trim() ? `%${query.trim()}%` : null;

  return db
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
}
