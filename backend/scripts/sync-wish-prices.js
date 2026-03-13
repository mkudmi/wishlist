import { pool } from "../src/db.js";
import { syncWishPriceById, syncWishPricesBatch } from "../src/services/wishPriceSync.js";

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

async function run() {
  const wishId = getArgValue("wish-id");
  const staleHours = Number(getArgValue("stale-hours") || "24");

  if (wishId) {
    const wish = await syncWishPriceById(wishId);
    console.log(JSON.stringify(wish, null, 2));
    return;
  }

  const staleBefore = Number.isFinite(staleHours) && staleHours > 0 ? new Date(Date.now() - staleHours * 60 * 60 * 1000) : null;
  const updated = await syncWishPricesBatch({ staleBefore });
  console.log(JSON.stringify({ updatedCount: updated.length }, null, 2));
}

run()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
