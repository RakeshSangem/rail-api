import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trains } from "../src/db/schema/trains";
import { trainRoutes } from "../src/db/schema/train-routes";
import { trainCoaches } from "../src/db/schema/train-coaches";
import { trainFares } from "../src/db/schema/train-fares";

const CSV_FILE_PATH = "trains-parsed.csv";

type CsvRow = {
  no: string;
  name: string;
  type: string;
  zone: string;
  source: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  halts: string;
  distance: string;
  speed: string;
  return: string;
  classes: string;
  days: string;
};

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");
const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

// Convert days format from SMTWTFS to 1111111 format
const convertDaysFormat = (days: string): string => {
  if (!days || days.length !== 7) return "1111111";
  return days
    .split("")
    .map((d) => (d !== "-" ? "1" : "0"))
    .join("");
};

// Valid time format: HH:MM
const isValidTime = (time: string): boolean => {
  return /^[0-9]{2}:[0-9]{2}$/.test(time);
};

// Clean train number - take only first 6 chars, remove suffixes like "-Slip"
const cleanTrainNo = (no: string): string | null => {
  if (!no) return null;
  const cleaned = no.toString().trim().split('-')[0];
  return cleaned.length <= 6 ? cleaned : null;
};

// Clean string - convert empty strings to null
const cleanString = (str: string | null | undefined, maxLength?: number): string | null => {
  if (!str) return null;
  const trimmed = str.toString().trim();
  if (!trimmed) return null;
  if (maxLength && trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
};

// Deduplicate by trainNo - keep first occurrence
const uniqueRows = new Map<string, CsvRow & { trainNo: string }>();
rows.forEach((r) => {
  const trainNo = cleanTrainNo(r.no);
  if (trainNo && r.source && r.destination && !uniqueRows.has(trainNo)) {
    uniqueRows.set(trainNo, { ...r, trainNo });
  }
});

console.log(`📊 ${rows.length} CSV rows → ${uniqueRows.size} unique trains after deduplication`);

const values = Array.from(uniqueRows.values())
  .map((r) => ({
    trainNo: r.trainNo!,
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

async function run() {
  if (values.length === 0) {
    console.error("❌ No trains to insert. Check trains-parsed.csv data.");
    process.exit(1);
  }

  console.log(`🚆 Found ${values.length} trains to seed`);
  console.log("⚠️  This will DELETE ALL existing train data first!");

  // Delete child records first (due to foreign key constraints)
  console.log("🗑️  Deleting train routes...");
  await db.delete(trainRoutes);
  
  console.log("🗑️  Deleting train coaches...");
  await db.delete(trainCoaches);
  
  console.log("🗑️  Deleting train fares...");
  await db.delete(trainFares);
  
  console.log("🗑️  Deleting trains...");
  await db.delete(trains);

  console.log("✅ All existing data deleted.");

  // Insert new data in batches to avoid overwhelming the DB
  const BATCH_SIZE = 500;
  let inserted = 0;
  
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(trains).values(batch);
    inserted += batch.length;
    console.log(`📥 Inserted ${inserted}/${values.length} trains...`);
  }

  console.log(`✅ Successfully inserted ${values.length} trains.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
