import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trainFares, trains } from "../src/db/schema";

const CSV_FILE_PATH = "train_fares.csv";

type CsvRow = {
  train_no: string;
  class: string;
  quota: string;
  fare: string;
  currency: string;
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

const values = rows
  .map((r) => {
    const fare = parseIntOrNull(r.fare);
    return {
      trainNo: r.train_no.trim(),
      classCode: r.class.trim(),
      quotaCode: r.quota.trim(),
      fare,
      currency: r.currency.trim(),
    };
  })
  .filter(
    (v) => v.trainNo && v.classCode && v.quotaCode && v.fare !== null && v.currency,
  )
  .map((v) => ({
    ...v,
    fare: v.fare as number,
  }));

const BATCH_SIZE = 1000;

const run = async () => {
  if (values.length === 0) {
    console.error("No valid rows found in train_fares.csv.");
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
      .insert(trainFares)
      .values(batch)
      .onConflictDoNothing({
        target: [trainFares.trainNo, trainFares.classCode, trainFares.quotaCode],
      });
  }

  console.log(`Seeded ${filteredValues.length} train fare rows.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
