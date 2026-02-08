import { db } from "../db";
import { trains, trainRoutes, stations } from "../db/schema";
import { withPagination } from "../util/pagination";
import { ilike, or, eq, and, sql, desc, asc } from "drizzle-orm";
import { getFaresByTrainNos, groupFaresByTrain, getMinFareByTrain, type FareInfo } from "./fares";
import { getCoachesByTrainNos, groupCoachesByTrain, type CoachInfo } from "./coaches";

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

export async function getTrainByNumber(trainNo: string) {
  const train = await db
    .select()
    .from(trains)
    .where(eq(trains.trainNo, trainNo))
    .limit(1);

  if (train.length === 0) {
    return null;
  }

  // Get route details, fares, and coaches in parallel
  const [routes, fares, coaches] = await Promise.all([
    db
      .select({
        seq: trainRoutes.seq,
        code: trainRoutes.code,
        station: trainRoutes.station,
        arr: trainRoutes.arr,
        dep: trainRoutes.dep,
        dist: trainRoutes.dist,
        day: trainRoutes.day,
      })
      .from(trainRoutes)
      .where(eq(trainRoutes.trainNo, trainNo))
      .orderBy(asc(trainRoutes.seq)),
    getFaresByTrainNos([trainNo]),
    getCoachesByTrainNos([trainNo]),
  ]);

  return {
    ...train[0],
    routes,
    fares,
    coaches,
  };
}

export interface TrainSearchResult {
  trainNo: string;
  name: string;
  type: string | null;
  source: string;
  destination: string;
  departureTime: string | null;
  arrivalTime: string | null;
  distanceKm: number | null;
  classes: string | null;
  runsOnDays: string;
  fromStation: {
    code: string;
    name: string;
    seq: number;
    arr: string | null;
    dep: string | null;
    dist: number | null;
    day: number | null;
  };
  toStation: {
    code: string;
    name: string;
    seq: number;
    arr: string | null;
    dep: string | null;
    dist: number | null;
    day: number | null;
  };
  travelDistance: number | null;
  travelDuration: string | null;
  fares: FareInfo[];
  coaches: CoachInfo[];
  minFare: { classCode: string; fare: number; currency: string } | null;
}

export async function searchTrainsBetweenStations(
  fromCode: string,
  toCode: string,
  page: number = 1,
  limit: number = 20
) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const offset = (safePage - 1) * safeLimit;

  // Find trains that stop at both stations with correct order
  const query = sql`
    WITH from_stations AS (
      SELECT 
        train_no,
        code,
        station,
        seq,
        arr,
        dep,
        dist,
        day
      FROM train_routes
      WHERE code = ${fromCode.toUpperCase()}
    ),
    to_stations AS (
      SELECT 
        train_no,
        code,
        station,
        seq,
        arr,
        dep,
        dist,
        day
      FROM train_routes
      WHERE code = ${toCode.toUpperCase()}
    ),
    matching_trains AS (
      SELECT 
        f.train_no,
        f.code as from_code,
        f.station as from_station,
        f.seq as from_seq,
        f.arr as from_arr,
        f.dep as from_dep,
        f.dist as from_dist,
        f.day as from_day,
        t.code as to_code,
        t.station as to_station,
        t.seq as to_seq,
        t.arr as to_arr,
        t.dep as to_dep,
        t.dist as to_dist,
        t.day as to_day
      FROM from_stations f
      JOIN to_stations t ON f.train_no = t.train_no
      WHERE f.seq < t.seq
    )
    SELECT 
      mt.*,
      tr.name,
      tr.type,
      tr.departure_time,
      tr.arrival_time,
      tr.distance_km,
      tr.classes,
      tr.runs_on_days
    FROM matching_trains mt
    JOIN trains tr ON mt.train_no = tr.train_no
    ORDER BY mt.from_dep ASC NULLS LAST
    LIMIT ${safeLimit}
    OFFSET ${offset}
  `;

  const results = await db.execute(query);

  // Get total count
  const countQuery = sql`
    WITH from_stations AS (
      SELECT train_no, seq
      FROM train_routes
      WHERE code = ${fromCode.toUpperCase()}
    ),
    to_stations AS (
      SELECT train_no, seq
      FROM train_routes
      WHERE code = ${toCode.toUpperCase()}
    )
    SELECT COUNT(*) as total
    FROM from_stations f
    JOIN to_stations t ON f.train_no = t.train_no
    WHERE f.seq < t.seq
  `;

  const countResult = await db.execute(countQuery);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = Math.ceil(total / safeLimit);

  // Get train numbers for fetching fares and coaches
  const trainNos = results.rows.map((row: any) => row.train_no);
  
  // Fetch fares and coaches for all trains in parallel
  const [fares, coaches] = await Promise.all([
    getFaresByTrainNos(trainNos),
    getCoachesByTrainNos(trainNos),
  ]);
  
  const faresByTrain = groupFaresByTrain(fares);
  const coachesByTrain = groupCoachesByTrain(coaches);

  const data: TrainSearchResult[] = results.rows.map((row: any) => {
    const trainFares = faresByTrain.get(row.train_no) || [];
    const trainCoaches = coachesByTrain.get(row.train_no) || [];
    
    return {
      trainNo: row.train_no,
      name: row.name,
      type: row.type,
      source: row.from_code,
      destination: row.to_code,
      departureTime: row.departure_time,
      arrivalTime: row.arrival_time,
      distanceKm: row.distance_km,
      classes: row.classes,
      runsOnDays: row.runs_on_days,
      fromStation: {
        code: row.from_code,
        name: row.from_station,
        seq: row.from_seq,
        arr: row.from_arr,
        dep: row.from_dep,
        dist: row.from_dist,
        day: row.from_day,
      },
      toStation: {
        code: row.to_code,
        name: row.to_station,
        seq: row.to_seq,
        arr: row.to_arr,
        dep: row.to_dep,
        dist: row.to_dist,
        day: row.to_day,
      },
      travelDistance: row.to_dist !== null && row.from_dist !== null 
        ? row.to_dist - row.from_dist 
        : null,
      travelDuration: calculateDuration(row.from_dep, row.to_arr, row.from_day, row.to_day),
      fares: trainFares,
      coaches: trainCoaches,
      minFare: getMinFareByTrain(trainFares),
    };
  });

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}

function calculateDuration(
  depTime: string | null, 
  arrTime: string | null,
  fromDay: number | null,
  toDay: number | null
): string | null {
  if (!depTime || !arrTime || depTime === "First" || arrTime === "Last") {
    return null;
  }

  // Parse time strings (HH:MM format)
  const [depHours, depMinutes] = depTime.split(":").map(Number);
  const [arrHours, arrMinutes] = arrTime.split(":").map(Number);

  if (isNaN(depHours) || isNaN(depMinutes) || isNaN(arrHours) || isNaN(arrMinutes)) {
    return null;
  }

  let depMinutesTotal = depHours * 60 + depMinutes;
  let arrMinutesTotal = arrHours * 60 + arrMinutes;

  // Adjust for day difference
  const dayDiff = (toDay ?? 1) - (fromDay ?? 1);
  arrMinutesTotal += dayDiff * 24 * 60;

  // Handle overnight journeys
  if (arrMinutesTotal < depMinutesTotal) {
    arrMinutesTotal += 24 * 60;
  }

  const durationMinutes = arrMinutesTotal - depMinutesTotal;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export async function getTrainRoutes(trainNo: string) {
  return db
    .select({
      seq: trainRoutes.seq,
      code: trainRoutes.code,
      station: trainRoutes.station,
      arr: trainRoutes.arr,
      dep: trainRoutes.dep,
      dist: trainRoutes.dist,
      day: trainRoutes.day,
    })
    .from(trainRoutes)
    .where(eq(trainRoutes.trainNo, trainNo))
    .orderBy(asc(trainRoutes.seq));
}
