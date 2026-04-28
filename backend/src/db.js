import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;
const POSTGRES_DATE_OID = 1082;

pg.types.setTypeParser(POSTGRES_DATE_OID, (value) => value);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : false
});

export async function withTx(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
