import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "./src/db";
import { trains } from "./src/db/schema/trains";

const CSV_FILE_PATH = "example.csv";

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");

const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as Record<string, string>[];

console.log(`🚆 Found ${rows.length} trains in CSV`);

const values = rows
  .map((r) => ({
    trainNo: String(r.no ?? "").slice(0, 6),
    name: String(r.name ?? "").slice(0, 255),
    type: r.type ? String(r.type).slice(0, 50) : null,
    zone: r.zone ? String(r.zone).slice(0, 10) : null,
    source: String(r.source ?? "").slice(0, 5),
    destination: String(r.destination ?? "").slice(0, 5),
    departureTime: r.departure?.trim() || null,
    arrivalTime: r.arrival?.trim() || null,
    durationMinutes: r.duration ? Number(r.duration) : null,
    distanceKm: r.distance ? Number(r.distance) : null,
    classes: r.classes?.trim() || null,
    returnTrainNo: r.return ? String(r.return).slice(0, 6) : null,
    runsOnDays: String(r.days ?? "0000000").slice(0, 7),
  }))
  .filter((v) => v.trainNo && v.name && v.runsOnDays);

async function run() {
  if (values.length === 0) {
    console.error(
      "❌ No rows to insert. Check CSV has columns: no,name,...,days",
    );
    process.exit(1);
  }
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
