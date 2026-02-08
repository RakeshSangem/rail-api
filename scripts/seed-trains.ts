import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trains } from "../src/db/schema/trains";

const CSV_FILE_PATH = "train_routes.csv";

type CsvRow = {
  train_no: string;
  seq: string;
  code: string;
  station: string;
  arr: string;
  dep: string;
  dist: string;
  day: string;
};

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");
const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

// Valid time format: HH:MM
const isValidTime = (time: string): boolean => {
  return /^[0-9]{2}:[0-9]{2}$/.test(time);
};

// Group rows by train_no to extract train info
const trainMap = new Map<
  string,
  {
    trainNo: string;
    source: string;
    destination: string;
    departureTime: string | null;
    arrivalTime: string | null;
    distanceKm: number | null;
  }
>();

rows.forEach((r) => {
  const trainNo = r.train_no?.trim();
  const seq = parseInt(r.seq, 10);
  const code = r.code?.trim();
  const arr = r.arr?.trim();
  const dep = r.dep?.trim();
  const dist = r.dist ? parseInt(r.dist, 10) : null;

  if (!trainNo || !code) return;

  if (!trainMap.has(trainNo)) {
    trainMap.set(trainNo, {
      trainNo,
      source: "",
      destination: "",
      departureTime: null,
      arrivalTime: null,
      distanceKm: null,
    });
  }

  const train = trainMap.get(trainNo)!;

  // First station (seq=1 or arr="First")
  if (seq === 1 || arr === "First") {
    train.source = code;
    // Only use valid time format
    if (isValidTime(dep)) {
      train.departureTime = dep;
    }
  }

  // Last station (dep="Last")
  if (dep === "Last") {
    train.destination = code;
    // Only use valid time format
    if (isValidTime(arr)) {
      train.arrivalTime = arr;
    }
    if (dist !== null) {
      train.distanceKm = dist;
    }
  }

  // Track max sequence to determine last station if "Last" marker is missing
  if (!train.destination && seq > 1) {
    // Check if this might be the last station (no next station for this train)
    // We'll update destination based on max distance
    if (dist !== null && dist > (train.distanceKm || 0)) {
      train.distanceKm = dist;
    }
  }
});

// Second pass: find destinations for trains without "Last" marker
const trainMaxSeq = new Map<string, number>();
rows.forEach((r) => {
  const trainNo = r.train_no?.trim();
  const seq = parseInt(r.seq, 10);
  if (trainNo) {
    const current = trainMaxSeq.get(trainNo) || 0;
    if (seq > current) {
      trainMaxSeq.set(trainNo, seq);
    }
  }
});

// Third pass: set destinations for trains missing them
rows.forEach((r) => {
  const trainNo = r.train_no?.trim();
  const seq = parseInt(r.seq, 10);
  const code = r.code?.trim();
  const arr = r.arr?.trim();
  const dist = r.dist ? parseInt(r.dist, 10) : null;

  if (!trainNo || !code) return;

  const train = trainMap.get(trainNo);
  if (!train) return;

  const maxSeq = trainMaxSeq.get(trainNo) || 0;

  // If this is the last sequence and we don't have a destination yet
  if (seq === maxSeq && !train.destination) {
    train.destination = code;
    if (isValidTime(arr)) {
      train.arrivalTime = arr;
    }
    if (dist !== null) {
      train.distanceKm = dist;
    }
  }
});

// Convert map to array and ensure source/destination are set
const values = Array.from(trainMap.values())
  .filter((t) => t.source && t.destination)
  .map((t) => ({
    trainNo: t.trainNo,
    name: `Train ${t.trainNo}`,
    type: null,
    zone: null,
    source: t.source,
    destination: t.destination,
    departureTime: t.departureTime,
    arrivalTime: t.arrivalTime,
    durationMinutes: null,
    distanceKm: t.distanceKm,
    classes: null,
    returnTrainNo: null,
    runsOnDays: "1111111",
  }));

async function run() {
  if (values.length === 0) {
    console.error("❌ No trains to insert. Check train_routes.csv data.");
    process.exit(1);
  }

  console.log(`🚆 Found ${values.length} trains to seed`);

  await db.insert(trains).values(values).onConflictDoNothing({
    target: trains.trainNo,
  });

  console.log(`✅ Inserted ${values.length} trains.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
