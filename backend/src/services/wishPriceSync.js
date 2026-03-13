import { pool } from "../db.js";
import { extractPriceFromUrl } from "./priceExtraction.js";

export function getWishSelectFields(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `
    ${prefix}id,
    ${prefix}wishlist_id,
    ${prefix}title,
    ${prefix}note,
    ${prefix}tag,
    ${prefix}price,
    ${prefix}manual_price,
    ${prefix}detected_price,
    ${prefix}price_source,
    ${prefix}price_check_status,
    ${prefix}price_check_error,
    ${prefix}price_currency,
    ${prefix}url,
    ${prefix}last_price_check_at,
    ${prefix}created_at
  `;
}

async function getWishById(wishId) {
  const { rows } = await pool.query(`SELECT ${getWishSelectFields()} FROM wishes WHERE id = $1 LIMIT 1`, [wishId]);
  return rows[0] || null;
}

function getManualPrice(wish) {
  return String(wish?.manual_price || wish?.price || "").trim();
}

function buildFallbackUpdate(wish) {
  const manualPrice = getManualPrice(wish);

  if (!String(wish?.url || "").trim()) {
    return {
      price: manualPrice,
      detectedPrice: "",
      priceSource: "manual",
      status: "idle",
      error: "",
      currency: "RUB"
    };
  }

  return {
    price: manualPrice,
    detectedPrice: "",
    priceSource: "manual",
    status: "pending",
    error: "",
    currency: "RUB"
  };
}

async function persistPriceState(wishId, nextState) {
  const { rows } = await pool.query(
    `UPDATE wishes
     SET price = $2,
         detected_price = $3,
         price_source = $4,
         price_check_status = $5,
         price_check_error = $6,
         price_currency = $7,
         last_price_check_at = $8
     WHERE id = $1
     RETURNING ${getWishSelectFields()};`,
    [
      wishId,
      nextState.price,
      nextState.detectedPrice,
      nextState.priceSource,
      nextState.status,
      nextState.error,
      nextState.currency,
      nextState.checkedAt
    ]
  );

  return rows[0] || null;
}

export async function syncWishPriceById(wishId) {
  const wish = await getWishById(wishId);
  if (!wish) {
    return null;
  }

  const fallbackState = buildFallbackUpdate(wish);
  const checkedAt = new Date();

  if (!String(wish.url || "").trim()) {
    return persistPriceState(wishId, {
      ...fallbackState,
      checkedAt: null
    });
  }

  const result = await extractPriceFromUrl(wish.url);

  if (result.status === "success") {
    return persistPriceState(wishId, {
      price: result.formattedPrice,
      detectedPrice: result.formattedPrice,
      priceSource: "parsed",
      status: "success",
      error: "",
      currency: result.currency || "RUB",
      checkedAt
    });
  }

  return persistPriceState(wishId, {
    price: fallbackState.price,
    detectedPrice: "",
    priceSource: "manual",
    status: result.status,
    error: result.error || "",
    currency: "RUB",
    checkedAt
  });
}

export async function syncWishPricesBatch({ staleBefore } = {}) {
  const params = [];
  let whereClause = "WHERE NULLIF(TRIM(url), '') IS NOT NULL";

  if (staleBefore instanceof Date && !Number.isNaN(staleBefore.getTime())) {
    params.push(staleBefore.toISOString());
    whereClause += ` AND (last_price_check_at IS NULL OR last_price_check_at < $${params.length})`;
  }

  const { rows } = await pool.query(
    `SELECT id
     FROM wishes
     ${whereClause}
     ORDER BY COALESCE(last_price_check_at, to_timestamp(0)) ASC, created_at ASC;`,
    params
  );

  const results = [];
  for (const row of rows) {
    const wish = await syncWishPriceById(row.id);
    if (wish) {
      results.push(wish);
    }
  }

  return results;
}

export async function getWishWithPriceMeta(wishId) {
  return getWishById(wishId);
}
