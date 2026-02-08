import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { trainRoutes, trains, stations } from "../src/db/schema";

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

const parseIntOrNull = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

const isValidTimeOrMarker = (value: string): boolean => {
  if (!value) return true;
  return /^[0-9]{2}:[0-9]{2}$/.test(value) || value === "First" || value === "Last";
};

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");
const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

const invalidRows: { row: CsvRow; reason: string }[] = [];

const values = rows
  .map((r, idx) => {
    const trainNo = r.train_no?.trim();
    const seq = parseIntOrNull(r.seq);
    const code = r.code?.trim();
    const station = r.station?.trim();
    const arr = r.arr?.trim();
    const dep = r.dep?.trim();
    
    // Validate data
    if (!trainNo || trainNo.length > 6) {
      invalidRows.push({ row: r, reason: `Invalid train_no: ${trainNo}` });
      return null;
    }
    if (!code || code.length > 10) {
      invalidRows.push({ row: r, reason: `Invalid code: ${code}` });
      return null;
    }
    if (!station) {
      invalidRows.push({ row: r, reason: `Invalid station` });
      return null;
    }
    if (!isValidTimeOrMarker(arr)) {
      invalidRows.push({ row: r, reason: `Invalid arr: ${arr}` });
      return null;
    }
    if (!isValidTimeOrMarker(dep)) {
      invalidRows.push({ row: r, reason: `Invalid dep: ${dep}` });
      return null;
    }
    
    return {
      trainNo,
      seq,
      code,
      station,
      arr: arr || null,
      dep: dep || null,
      dist: parseIntOrNull(r.dist),
      day: parseIntOrNull(r.day),
    };
  })
  .filter((v): v is NonNullable<typeof v> => 
    v !== null && v.trainNo && v.seq !== null && v.code && v.station
  )
  .map((v) => ({
    ...v,
    seq: v.seq as number,
  }));

console.log(`Parsed ${values.length} valid rows from CSV`);
if (invalidRows.length > 0) {
  console.warn(`Found ${invalidRows.length} invalid rows (showing first 5):`);
  invalidRows.slice(0, 5).forEach((item, i) => {
    console.warn(`  ${i + 1}. ${item.reason}: ${JSON.stringify(item.row)}`);
  });
}

const BATCH_SIZE = 1000;

const run = async () => {
  if (values.length === 0) {
    console.error("No valid rows found in train_routes.csv.");
    process.exit(1);
  }

  const existingTrainNos = new Set(
    (await db.select({ trainNo: trains.trainNo }).from(trains)).map(
      (r) => r.trainNo,
    ),
  );

  const existingStationCodes = new Set(
    (await db.select({ code: stations.code }).from(stations)).map(
      (r) => r.code,
    ),
  );

  console.log(`Found ${existingTrainNos.size} existing trains in database`);
  console.log(`Found ${existingStationCodes.size} existing stations in database`);

  const filteredValues = values.filter((v) => 
    existingTrainNos.has(v.trainNo) && existingStationCodes.has(v.code)
  );

  console.log(`${filteredValues.length} rows match existing trains`);

  if (filteredValues.length === 0) {
    console.error("No rows match existing trains. Seed trains first.");
    process.exit(1);
  }

  for (let i = 0; i < filteredValues.length; i += BATCH_SIZE) {
    const batch = filteredValues.slice(i, i + BATCH_SIZE);
    try {
      await db
        .insert(trainRoutes)
        .values(batch)
        .onConflictDoNothing({
          target: [trainRoutes.trainNo, trainRoutes.seq, trainRoutes.code],
        });
      console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(filteredValues.length / BATCH_SIZE)} (${i + batch.length} rows)`);
    } catch (err) {
      console.error(`Error inserting batch starting at row ${i}:`, err);
      console.error(`Problematic rows:`, JSON.stringify(batch.slice(0, 3)));
      throw err;
    }
  }

  console.log(`Seeded ${filteredValues.length} train route rows.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
