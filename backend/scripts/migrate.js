import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool, withTx } from "../src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  const files = (await fs.readdir(migrationsDir))
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  await withTx(async (client) => {
    await ensureMigrationsTable(client);

    const { rows } = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.filename));

    for (const filename of files) {
      if (applied.has(filename)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
      console.log(`Applying ${filename}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
    }
  });

  await pool.end();
  console.log("Migrations completed");
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
