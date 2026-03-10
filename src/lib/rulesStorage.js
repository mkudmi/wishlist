import { rules as defaultRules } from "../config/constants";

const RULES_STORAGE_PREFIX = "wishlist-rules-v1:";

export function normalizeRulesList(items) {
  if (!Array.isArray(items)) {
    return defaultRules.slice(0, 5);
  }

  const normalized = items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return normalized.length > 0 ? normalized : defaultRules.slice(0, 5);
}

export function readRulesForWishlist(wishlistId) {
  if (!wishlistId || typeof window === "undefined") {
    return defaultRules.slice(0, 5);
  }

  const raw = localStorage.getItem(`${RULES_STORAGE_PREFIX}${wishlistId}`);
  if (!raw) {
    return defaultRules.slice(0, 5);
  }

  try {
    return normalizeRulesList(JSON.parse(raw));
  } catch {
    return defaultRules.slice(0, 5);
  }
}

export function writeRulesForWishlist(wishlistId, items) {
  const normalized = normalizeRulesList(items);
  if (!wishlistId || typeof window === "undefined") {
    return normalized;
  }

  localStorage.setItem(`${RULES_STORAGE_PREFIX}${wishlistId}`, JSON.stringify(normalized));
  return normalized;
}
