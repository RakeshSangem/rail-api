import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../src/db";
import { stations } from "../src/db/schema";

const CSV_FILE_PATH = "stations-final.csv";

type CsvRow = {
  division: string;
  name: string;
  code: string;
};

const csvText = fs.readFileSync(CSV_FILE_PATH, "utf-8");
const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

const values = rows
  .filter((r) => r.code && r.name)
  .map((r) => ({
    code: r.code.trim(),
    name: r.name.trim(),
    city: null,
  }));

const BATCH_SIZE = 1000;

const run = async () => {
  if (values.length === 0) {
    console.error("No valid stations found in stations-final.csv.");
    process.exit(1);
  }

  console.log(`Found ${values.length} unique stations to seed.`);

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(stations).values(batch).onConflictDoNothing({
      target: stations.code,
    });
  }

  console.log(`Seeded ${values.length} stations.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
