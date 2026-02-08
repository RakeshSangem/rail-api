import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trains, trainRoutes, trainCoaches, trainFares, stations } from "../src/db/schema";

// Helper functions
const parseIntOrNull = (value: string): number | null => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

const cleanTrainNo = (no: string): string | null => {
  if (!no) return null;
  const cleaned = no.toString().trim().split('-')[0];
  return cleaned.length <= 6 ? cleaned : null;
};

const cleanString = (str: string | null | undefined, maxLength?: number): string | null => {
  if (!str) return null;
  const trimmed = str.toString().trim();
  if (!trimmed) return null;
  if (maxLength && trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
};

const convertDaysFormat = (days: string): string => {
  if (!days || days.length !== 7) return "1111111";
  return days.split("").map((d) => (d !== "-" ? "1" : "0")).join("");
};

const isValidTime = (time: string): boolean => {
  return /^[0-9]{2}:[0-9]{2}$/.test(time);
};

const BATCH_SIZE = 1000;

async function seedStations() {
  console.log("\n📍 Seeding stations...");
  const csvText = fs.readFileSync("stations-final.csv", "utf-8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  
  const values = rows
    .filter((r: any) => r.code && r.name)
    .map((r: any) => ({
      code: r.code.trim(),
      name: cleanString(r.name, 255) || r.code.trim(),
      city: null,
    }));

  await db.delete(stations);
  
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(stations).values(batch).onConflictDoNothing({ target: stations.code });
  }
  
  console.log(`✅ Seeded ${values.length} stations`);
  return new Set(values.map((v: any) => v.code));
}

async function seedTrains(): Promise<Set<string>> {
  console.log("\n🚆 Seeding trains...");
  const csvText = fs.readFileSync("trains-parsed.csv", "utf-8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

  // Deduplicate by trainNo
  const uniqueRows = new Map<string, any>();
  rows.forEach((r: any) => {
    const trainNo = cleanTrainNo(r.no);
    if (trainNo && r.source && r.destination && !uniqueRows.has(trainNo)) {
      uniqueRows.set(trainNo, r);
    }
  });

  const values = Array.from(uniqueRows.entries()).map(([trainNo, r]) => ({
    trainNo,
    name: cleanString(r.name, 255) || `Train ${r.no?.trim() || 'Unknown'}`,
    type: cleanString(r.type, 50),
    zone: cleanString(r.zone, 10),
    source: cleanString(r.source, 5)!,
    destination: cleanString(r.destination, 5)!,
    departureTime: isValidTime(r.departure) ? r.departure : null,
    arrivalTime: isValidTime(r.arrival) ? r.arrival : null,
    durationMinutes: r.duration ? parseInt(r.duration, 10) : null,
    distanceKm: r.distance ? parseInt(r.distance, 10) : null,
    classes: cleanString(r.classes),
    returnTrainNo: cleanTrainNo(r.return),
    runsOnDays: convertDaysFormat(r.days),
  }));

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(trains).values(batch);
  }

  console.log(`✅ Seeded ${values.length} trains (${rows.length - values.length} duplicates skipped)`);
  return new Set(values.map((v) => v.trainNo));
}

async function seedTrainRoutes(validTrainNos: Set<string>, validStationCodes: Set<string>) {
  console.log("\n🛤️  Seeding train routes...");
  const csvText = fs.readFileSync("train_routes.csv", "utf-8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

  const isValidTimeOrMarker = (value: string): boolean => {
    if (!value) return true;
    return /^[0-9]{2}:[0-9]{2}$/.test(value) || value === "First" || value === "Last";
  };

  const values = rows
    .map((r: any) => {
      const trainNo = cleanTrainNo(r.train_no);
      const seq = parseIntOrNull(r.seq);
      const code = r.code?.trim();
      const station = r.station?.trim();
      const arr = r.arr?.trim();
      const dep = r.dep?.trim();

      if (!trainNo || trainNo.length > 6) return null;
      if (!code || code.length > 10) return null;
      if (!station) return null;
      if (!isValidTimeOrMarker(arr) || !isValidTimeOrMarker(dep)) return null;

      return {
        trainNo,
        seq,
        code,
        station: cleanString(station, 255)!,
        arr: arr || null,
        dep: dep || null,
        dist: parseIntOrNull(r.dist),
        day: parseIntOrNull(r.day),
      };
    })
    .filter((v: any): v is NonNullable<typeof v> => 
      v !== null && validTrainNos.has(v.trainNo) && validStationCodes.has(v.code)
    );

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(trainRoutes).values(batch).onConflictDoNothing({
      target: [trainRoutes.trainNo, trainRoutes.seq, trainRoutes.code],
    });
  }

  console.log(`✅ Seeded ${values.length} train routes`);
}

async function seedTrainCoaches(validTrainNos: Set<string>) {
  console.log("\n🎫 Seeding train coaches...");
  const csvText = fs.readFileSync("train_coaches.csv", "utf-8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

  const values = rows
    .map((r: any) => {
      const trainNo = cleanTrainNo(r.train_no);
      const position = parseIntOrNull(r.position);
      if (!trainNo || !r.coach_code || !r.coach_class || position === null) return null;
      return {
        trainNo,
        coachCode: r.coach_code.trim(),
        coachClass: r.coach_class.trim(),
        position,
      };
    })
    .filter((v: any): v is NonNullable<typeof v> => 
      v !== null && validTrainNos.has(v.trainNo)
    );

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(trainCoaches).values(batch).onConflictDoNothing({
      target: [trainCoaches.trainNo, trainCoaches.coachCode],
    });
  }

  console.log(`✅ Seeded ${values.length} train coaches`);
}

async function seedTrainFares(validTrainNos: Set<string>) {
  console.log("\n💰 Seeding train fares...");
  const csvText = fs.readFileSync("train_fares.csv", "utf-8");
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

  const values = rows
    .map((r: any) => {
      const trainNo = cleanTrainNo(r.train_no);
      const fare = parseIntOrNull(r.fare);
      if (!trainNo || !r.class || !r.quota || fare === null || !r.currency) return null;
      return {
        trainNo,
        classCode: r.class.trim(),
        quotaCode: r.quota.trim(),
        fare,
        currency: r.currency.trim(),
      };
    })
    .filter((v: any): v is NonNullable<typeof v> => 
      v !== null && validTrainNos.has(v.trainNo)
    );

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(trainFares).values(batch).onConflictDoNothing({
      target: [trainFares.trainNo, trainFares.classCode, trainFares.quotaCode],
    });
  }

  console.log(`✅ Seeded ${values.length} train fares`);
}

async function run() {
  console.log("⚠️  WARNING: This will DELETE ALL existing data and re-seed everything!");
  console.log("🗑️  Deleting all existing data...");
  
  // Delete in correct order (child tables first)
  await db.delete(trainRoutes);
  await db.delete(trainCoaches);
  await db.delete(trainFares);
  await db.delete(trains);
  await db.delete(stations);
  
  console.log("✅ All data deleted\n");
  console.log("🌱 Starting fresh seed...\n");

  // Seed in correct order (parent tables first)
  const validStationCodes = await seedStations();
  const validTrainNos = await seedTrains();
  
  // Seed child tables
  await seedTrainRoutes(validTrainNos, validStationCodes);
  await seedTrainCoaches(validTrainNos);
  await seedTrainFares(validTrainNos);

  console.log("\n✨ All data seeded successfully!");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
