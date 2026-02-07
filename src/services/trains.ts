import { db } from "../db";
import { trains } from "../db/schema";
import { withPagination } from "../util/pagination";

export async function getTrains(page: number = 1, limit: number = 10) {
  return withPagination({
    db,
    table: trains,
    where: undefined,
    orderBy: [trains.id],
    page,
    limit,
  });
}
