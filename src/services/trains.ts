import { db } from "../db";
import { trains } from "../db/schema";
import { withPagination } from "../util/pagination";
import { ilike, or } from "drizzle-orm";

export async function getTrains(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string
) {
  const pattern = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;

  return withPagination({
    db,
    table: trains,
    where: pattern
      ? or(
          ilike(trains.name, pattern),
          ilike(trains.trainNo, pattern)
        )
      : undefined,
    orderBy: [trains.id],
    page,
    limit,
  });
}
