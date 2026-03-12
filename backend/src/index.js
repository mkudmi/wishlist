import app from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

const server = app.listen(config.port, config.host, () => {
  console.log(`API started on http://${config.host}:${config.port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
