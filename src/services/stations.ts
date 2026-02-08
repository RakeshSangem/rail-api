import { or, ilike, eq } from "drizzle-orm";
import { db } from "../db";
import { stations, trainRoutes, trains } from "../db/schema";
import { withPagination } from "../util/pagination";

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

export async function getStations(
  page: number = 1,
  limit: number = 20,
  searchQuery?: string
) {
  const pattern = searchQuery?.trim() ? `%${searchQuery.trim()}%` : null;

  return withPagination({
    db,
    table: stations,
    where: pattern
      ? or(
          ilike(stations.name, pattern),
          ilike(stations.code, pattern),
          ilike(stations.city, pattern),
        )
      : undefined,
    orderBy: [stations.name],
    page,
    limit,
  });
}

export async function getStationByCode(code: string) {
  const station = await db
    .select()
    .from(stations)
    .where(eq(stations.code, code.toUpperCase()))
    .limit(1);

  return station.length > 0 ? station[0] : null;
}

export async function getStationById(id: string) {
  const station = await db
    .select()
    .from(stations)
    .where(eq(stations.id, id))
    .limit(1);

  return station.length > 0 ? station[0] : null;
}

export interface StationTrainInfo {
  trainNo: string;
  name: string;
  type: string | null;
  source: string;
  destination: string;
  seq: number;
  arr: string | null;
  dep: string | null;
  dist: number | null;
  day: number | null;
  runsOnDays: string;
}

export async function getTrainsByStation(code: string) {
  const stationCode = code.toUpperCase();
  
  // Get all trains that stop at this station
  const results = await db
    .select({
      trainNo: trainRoutes.trainNo,
      name: trains.name,
      type: trains.type,
      source: trains.source,
      destination: trains.destination,
      seq: trainRoutes.seq,
      arr: trainRoutes.arr,
      dep: trainRoutes.dep,
      dist: trainRoutes.dist,
      day: trainRoutes.day,
      runsOnDays: trains.runsOnDays,
    })
    .from(trainRoutes)
    .innerJoin(trains, eq(trainRoutes.trainNo, trains.trainNo))
    .where(eq(trainRoutes.code, stationCode))
    .orderBy(trainRoutes.dep);

  return results;
}

export async function getStationStats(code: string) {
  const stationCode = code.toUpperCase();
  
  // Count total trains
  const totalTrains = await db
    .select({ count: sql`count(*)::int` })
    .from(trainRoutes)
    .where(eq(trainRoutes.code, stationCode));

  // Count originating trains (seq = 1)
  const originatingTrains = await db
    .select({ count: sql`count(*)::int` })
    .from(trainRoutes)
    .where(
      and(
        eq(trainRoutes.code, stationCode),
        eq(trainRoutes.seq, 1)
      )
    );

  // Count terminating trains (dep = "Last")
  const terminatingTrains = await db
    .select({ count: sql`count(*)::int` })
    .from(trainRoutes)
    .where(
      and(
        eq(trainRoutes.code, stationCode),
        eq(trainRoutes.dep, "Last")
      )
    );

  return {
    totalTrains: Number(totalTrains[0]?.count ?? 0),
    originatingTrains: Number(originatingTrains[0]?.count ?? 0),
    terminatingTrains: Number(terminatingTrains[0]?.count ?? 0),
    passingTrains: Number(totalTrains[0]?.count ?? 0) - Number(originatingTrains[0]?.count ?? 0) - Number(terminatingTrains[0]?.count ?? 0),
  };
}

import { sql, and } from "drizzle-orm";
