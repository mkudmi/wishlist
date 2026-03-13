import { load } from "cheerio";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ERROR_LENGTH = 300;

function truncateError(message) {
  return String(message || "").trim().slice(0, MAX_ERROR_LENGTH);
}

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeCurrency(rawCurrency, rawValue) {
  const currency = String(rawCurrency || "").trim().toUpperCase();
  if (currency) {
    return currency;
  }

  const value = String(rawValue || "");
  if (value.includes("₽") || /руб/i.test(value)) {
    return "RUB";
  }
  if (value.includes("$")) {
    return "USD";
  }
  if (value.includes("€")) {
    return "EUR";
  }

  return "RUB";
}

function parseAmount(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/\u00a0/g, " ")
    .replace(/[,](?=\d{2}\b)/g, ".")
    .replace(/[^\d.\s]/g, "")
    .replace(/\s+/g, "");

  if (!normalized) {
    return null;
  }

  const parts = normalized.split(".");
  const numeric = parts.length > 2 ? `${parts.slice(0, -1).join("")}.${parts.at(-1)}` : normalized;
  const amount = Number(numeric);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function formatAmount(amount, currency) {
  const hasFraction = Math.abs(amount % 1) > 0.001;
  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0
  }).format(amount);

  switch (currency) {
    case "RUB":
      return `${formattedAmount} ₽`;
    case "USD":
      return `${formattedAmount} $`;
    case "EUR":
      return `${formattedAmount} €`;
    default:
      return formattedAmount;
  }
}

function collectJsonLdCandidates(node, accumulator) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLdCandidates(item, accumulator));
    return;
  }

  const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
  offers.forEach((offer) => {
    const rawPrice = offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
    if (!rawPrice) {
      return;
    }
    accumulator.push({
      rawPrice,
      rawCurrency: offer?.priceCurrency || node?.priceCurrency || ""
    });
  });

  Object.values(node).forEach((value) => collectJsonLdCandidates(value, accumulator));
}

function pickCandidate(candidates) {
  for (const candidate of candidates) {
    const amount = parseAmount(candidate.rawPrice);
    if (!amount) {
      continue;
    }

    const currency = normalizeCurrency(candidate.rawCurrency, candidate.rawPrice);
    return {
      amount,
      currency,
      formattedPrice: formatAmount(amount, currency)
    };
  }

  return null;
}

function extractCandidates(html) {
  const $ = load(html);
  const candidates = [];

  const metaSelectors = [
    "meta[property='product:price:amount']",
    "meta[property='og:price:amount']",
    "meta[itemprop='price']",
    "meta[name='price']"
  ];

  for (const selector of metaSelectors) {
    $(selector).each((_, element) => {
      candidates.push({
        rawPrice: $(element).attr("content") || "",
        rawCurrency:
          $("meta[property='product:price:currency']").attr("content") ||
          $("meta[property='og:price:currency']").attr("content") ||
          $("meta[itemprop='priceCurrency']").attr("content") ||
          ""
      });
    });
  }

  $("[itemprop='price']").each((_, element) => {
    candidates.push({
      rawPrice: $(element).attr("content") || $(element).attr("value") || $(element).text() || "",
      rawCurrency:
        $(element).attr("data-currency") ||
        $(element).attr("currency") ||
        $("[itemprop='priceCurrency']").attr("content") ||
        $("[itemprop='priceCurrency']").attr("value") ||
        $("[itemprop='priceCurrency']").text() ||
        ""
    });
  });

  $("script[type='application/ld+json']").each((_, element) => {
    const content = $(element).contents().text().trim();
    if (!content) {
      return;
    }

    try {
      const parsed = JSON.parse(content);
      collectJsonLdCandidates(parsed, candidates);
    } catch {
      // Ignore malformed JSON-LD blocks from stores.
    }
  });

  const genericPriceNodes = [
    "[data-price]",
    "[class*='price']",
    "[id*='price']"
  ];

  for (const selector of genericPriceNodes) {
    $(selector)
      .slice(0, 20)
      .each((_, element) => {
        candidates.push({
          rawPrice: $(element).attr("data-price") || $(element).text() || "",
          rawCurrency: ""
        });
      });
  }

  return candidates;
}

export async function extractPriceFromUrl(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) {
    return { status: "invalid_url", error: "URL must start with http:// or https://" };
  }

  try {
    const response = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.8"
      }
    });

    if (!response.ok) {
      return { status: "failed", error: `Remote site returned ${response.status}` };
    }

    const html = await response.text();
    const price = pickCandidate(extractCandidates(html));

    if (!price) {
      return { status: "not_found", error: "Price not found on page" };
    }

    return {
      status: "success",
      error: "",
      ...price,
      checkedUrl: response.url || normalizedUrl
    };
  } catch (error) {
    return {
      status: "failed",
      error: truncateError(error?.name === "TimeoutError" ? "Price check timeout" : error?.message || "Unknown error")
    };
  }
}
