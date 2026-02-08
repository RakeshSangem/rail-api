import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trainCoaches, trains } from "../src/db/schema";

const CSV_FILE_PATH = "train_coaches.csv";

type CsvRow = {
  train_no: string;
  coach_code: string;
  coach_class: string;
  position: string;
};

const parseIntOrNull = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");
const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

type CoachRow = {
  trainNo: string;
  coachCode: string;
  coachClass: string;
  position: number;
};

const isValidCoachRow = (
  v: { trainNo: string; coachCode: string; coachClass: string; position: number | null },
): v is CoachRow =>
  v.trainNo !== "" && v.coachCode !== "" && v.coachClass !== "" && v.position !== null;

const values: CoachRow[] = rows
  .map((r) => ({
    trainNo: r.train_no.trim(),
    coachCode: r.coach_code.trim(),
    coachClass: r.coach_class.trim(),
    position: parseIntOrNull(r.position),
  }))
  .filter(isValidCoachRow);

const BATCH_SIZE = 1000;

const run = async () => {
  if (values.length === 0) {
    console.error("No valid rows found in train_coaches.csv.");
    process.exit(1);
  }

  const existingTrainNos = new Set(
    (await db.select({ trainNo: trains.trainNo }).from(trains)).map(
      (r) => r.trainNo,
    ),
  );

  const filteredValues = values.filter((v) => existingTrainNos.has(v.trainNo));

  if (filteredValues.length === 0) {
    console.error("No rows match existing trains. Seed trains first.");
    process.exit(1);
  }

  for (let i = 0; i < filteredValues.length; i += BATCH_SIZE) {
    const batch = filteredValues.slice(i, i + BATCH_SIZE);
    await db
      .insert(trainCoaches)
      .values(batch)
      .onConflictDoNothing({
        target: [trainCoaches.trainNo, trainCoaches.coachCode],
      });
  }

  console.log(`Seeded ${filteredValues.length} train coach rows.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
