import { load } from "cheerio";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ERROR_LENGTH = 300;
const MAX_GENERIC_NODES = 80;
const MAX_SCRIPT_TAGS = 50;
const MAX_SCRIPT_TEXT_LENGTH = 20000;
const MIN_REASONABLE_PRICE = 10;
const MAX_REASONABLE_PRICE = 100000000;

const PRICE_META_SELECTORS = [
  "meta[property='product:price:amount']",
  "meta[property='og:price:amount']",
  "meta[property='twitter:data1']",
  "meta[itemprop='price']",
  "meta[name='price']",
  "meta[name='twitter:data1']"
];

const PRICE_CURRENCY_SELECTORS = [
  "meta[property='product:price:currency']",
  "meta[property='og:price:currency']",
  "meta[itemprop='priceCurrency']",
  "meta[name='priceCurrency']"
];

const PRICE_NODE_SELECTORS = [
  "[itemprop='price']",
  "[data-price]",
  "[data-price-value]",
  "[data-product-price]",
  "[data-product-price-value]",
  "[data-current-price]",
  "[data-sale-price]",
  "[data-final-price]",
  "[data-test='price']",
  "[data-testid='price']",
  "[data-qa='price']",
  "[class*='price']",
  "[class*='Price']",
  "[class*='cost']",
  "[class*='Cost']",
  "[class*='amount']",
  "[class*='Amount']",
  "[class*='value']",
  "[id*='price']",
  "[id*='Price']",
  "[aria-label*='price' i]",
  "[aria-label*='цена' i]"
];

const SCRIPT_PRICE_PATTERNS = [
  /"price"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi,
  /"salePrice"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi,
  /"finalPrice"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi,
  /"currentPrice"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi,
  /"amount"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi,
  /"priceAmount"\s*:\s*"?(?<value>\d[\d\s.,]*)"?/gi
];

const INLINE_PRICE_PATTERNS = [
  /(?<value>\d[\d\s.,]{1,20})\s*(?<currency>₽|руб\.?|рублей|р\.|RUB|\$|USD|€|EUR)/gi,
  /(?<currency>₽|руб\.?|рублей|р\.|RUB|\$|USD|€|EUR)\s*(?<value>\d[\d\s.,]{1,20})/gi
];

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
    if (currency === "₽" || currency === "РУБ" || currency === "РУБ." || currency === "Р.") {
      return "RUB";
    }
    if (currency === "$") {
      return "USD";
    }
    if (currency === "€") {
      return "EUR";
    }
    if (currency === "RUR") {
      return "RUB";
    }
    return currency;
  }

  const value = String(rawValue || "");
  if (value.includes("₽") || /руб|р\./i.test(value)) {
    return "RUB";
  }
  if (value.includes("$") || /USD/i.test(value)) {
    return "USD";
  }
  if (value.includes("€") || /EUR/i.test(value)) {
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

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCandidate(candidate) {
  return {
    rawPrice: compactText(candidate.rawPrice),
    rawCurrency: compactText(candidate.rawCurrency),
    source: candidate.source || "unknown",
    context: compactText(candidate.context),
    selector: candidate.selector || "",
    priority: Number(candidate.priority || 0)
  };
}

function pushCandidate(accumulator, candidate) {
  const normalized = normalizeCandidate(candidate);
  if (!normalized.rawPrice) {
    return;
  }
  accumulator.push(normalized);
}

function collectJsonLdCandidates(node, accumulator, path = "jsonld") {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, index) => collectJsonLdCandidates(item, accumulator, `${path}[${index}]`));
    return;
  }

  const rawPrice = node.price ?? node.lowPrice ?? node.highPrice ?? null;
  if (rawPrice) {
    pushCandidate(accumulator, {
      rawPrice,
      rawCurrency: node.priceCurrency || "",
      source: "jsonld",
      context: JSON.stringify({
        "@type": node["@type"] || "",
        name: node.name || "",
        availability: node.availability || ""
      }).slice(0, 400),
      priority: 120
    });
  }

  const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
  offers.forEach((offer, index) => {
    collectJsonLdCandidates(offer, accumulator, `${path}.offers[${index}]`);
  });

  Object.entries(node).forEach(([key, value]) => {
    if (key === "offers") {
      return;
    }
    collectJsonLdCandidates(value, accumulator, `${path}.${key}`);
  });
}

function getMetaCurrency($) {
  for (const selector of PRICE_CURRENCY_SELECTORS) {
    const value = $(selector).first().attr("content") || $(selector).first().text();
    if (compactText(value)) {
      return value;
    }
  }
  return "";
}

function getNodeCurrency($, element) {
  const attrs = [
    "data-currency",
    "currency",
    "data-price-currency",
    "pricecurrency",
    "content",
    "value"
  ];

  for (const attr of attrs) {
    const value = $(element).attr(attr);
    if (compactText(value)) {
      return value;
    }
  }

  const nearbyCurrency = $(element).find("[itemprop='priceCurrency']").first();
  if (nearbyCurrency.length) {
    return (
      nearbyCurrency.attr("content") ||
      nearbyCurrency.attr("value") ||
      nearbyCurrency.text() ||
      ""
    );
  }

  return "";
}

function getNodePriceValue($, element) {
  const attrs = [
    "data-price",
    "data-price-value",
    "data-product-price",
    "data-product-price-value",
    "data-current-price",
    "data-sale-price",
    "data-final-price",
    "content",
    "value",
    "aria-label"
  ];

  for (const attr of attrs) {
    const value = $(element).attr(attr);
    if (compactText(value)) {
      return value;
    }
  }

  return $(element).text() || "";
}

function collectTextPatternCandidates(text, accumulator, source, context, priority) {
  for (const pattern of INLINE_PRICE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      pushCandidate(accumulator, {
        rawPrice: match.groups?.value || match[0],
        rawCurrency: match.groups?.currency || "",
        source,
        context,
        priority
      });
    }
  }
}

function hasBadContext(context) {
  const normalized = context.toLowerCase();
  const badWords = [
    "скидк",
    "discount",
    "rating",
    "рейтинг",
    "звезд",
    "stars",
    "reviews",
    "отзыв",
    "bonus",
    "бонус",
    "кэшб",
    "cashback",
    "эконом",
    "save",
    "скидка",
    "процент",
    "%",
    "шт.",
    "pieces"
  ];

  return badWords.some((word) => normalized.includes(word));
}

function hasGoodContext(context) {
  const normalized = context.toLowerCase();
  const goodWords = [
    "price",
    "цена",
    "стоимость",
    "sale",
    "final",
    "current",
    "amount",
    "buy",
    "купить",
    "за ",
    "итого",
    "товар"
  ];

  return goodWords.some((word) => normalized.includes(word));
}

function scoreCandidate(candidate) {
  const amount = parseAmount(candidate.rawPrice);
  if (!amount) {
    return null;
  }

  if (amount < MIN_REASONABLE_PRICE || amount > MAX_REASONABLE_PRICE) {
    return null;
  }

  const context = `${candidate.context} ${candidate.selector} ${candidate.source}`.trim();
  if (hasBadContext(context) && !hasGoodContext(context)) {
    return null;
  }

  let score = candidate.priority;

  if (candidate.source === "jsonld") {
    score += 100;
  } else if (candidate.source === "meta") {
    score += 90;
  } else if (candidate.source === "script") {
    score += 70;
  } else if (candidate.source === "node") {
    score += 50;
  } else if (candidate.source === "text") {
    score += 30;
  }

  if (candidate.rawCurrency) {
    score += 25;
  }

  if (hasGoodContext(context)) {
    score += 25;
  }

  if (/\b(old|oldprice|strike|crossed|regular)\b/i.test(context)) {
    score -= 30;
  }

  if (amount >= 100 && amount <= 500000) {
    score += 20;
  }

  if (amount % 1 === 0) {
    score += 5;
  }

  if (/[₽$€]|руб|usd|eur/i.test(`${candidate.rawPrice} ${candidate.rawCurrency}`)) {
    score += 15;
  }

  return {
    ...candidate,
    amount,
    currency: normalizeCurrency(candidate.rawCurrency, `${candidate.rawPrice} ${candidate.context}`),
    score
  };
}

function dedupeCandidates(candidates) {
  const seen = new Map();

  for (const candidate of candidates) {
    const key = [
      candidate.amount,
      candidate.currency,
      candidate.source,
      candidate.rawPrice,
      candidate.selector
    ].join("|");
    const existing = seen.get(key);
    if (!existing || candidate.score > existing.score) {
      seen.set(key, candidate);
    }
  }

  return [...seen.values()];
}

function pickCandidate(candidates) {
  const scored = dedupeCandidates(candidates.map(scoreCandidate).filter(Boolean));
  scored.sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best) {
    return null;
  }

  return {
    amount: best.amount,
    currency: best.currency,
    formattedPrice: formatAmount(best.amount, best.currency),
    source: best.source,
    score: best.score
  };
}

function extractCandidates(html) {
  const $ = load(html);
  const candidates = [];
  const metaCurrency = getMetaCurrency($);

  for (const selector of PRICE_META_SELECTORS) {
    $(selector).each((_, element) => {
      pushCandidate(candidates, {
        rawPrice: $(element).attr("content") || $(element).text() || "",
        rawCurrency: metaCurrency,
        source: "meta",
        selector,
        context: $.html(element).slice(0, 300),
        priority: 110
      });
    });
  }

  for (const selector of PRICE_NODE_SELECTORS) {
    $(selector)
      .slice(0, MAX_GENERIC_NODES)
      .each((_, element) => {
        const nodeText = compactText($(element).text());
        const context = compactText(
          [
            $(element).attr("class"),
            $(element).attr("id"),
            $(element).attr("aria-label"),
            nodeText,
            compactText($(element).parent().text()).slice(0, 200)
          ].join(" ")
        );

        pushCandidate(candidates, {
          rawPrice: getNodePriceValue($, element),
          rawCurrency: getNodeCurrency($, element) || metaCurrency,
          source: "node",
          selector,
          context,
          priority: selector.includes("itemprop") || selector.includes("data-price") ? 80 : 45
        });

        collectTextPatternCandidates(nodeText, candidates, "text", context, 35);
      });
  }

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

  $("script")
    .slice(0, MAX_SCRIPT_TAGS)
    .each((_, element) => {
      const content = $(element).contents().text().slice(0, MAX_SCRIPT_TEXT_LENGTH);
      if (!content) {
        return;
      }

      for (const pattern of SCRIPT_PRICE_PATTERNS) {
        for (const match of content.matchAll(pattern)) {
          pushCandidate(candidates, {
            rawPrice: match.groups?.value || match[0],
            rawCurrency: metaCurrency,
            source: "script",
            context: content.slice(Math.max(0, match.index - 80), Math.min(content.length, match.index + 120)),
            priority: 60
          });
        }
      }
    });

  const bodyText = compactText($("body").text()).slice(0, 120000);
  collectTextPatternCandidates(bodyText, candidates, "text", "body", 10);

  return candidates;
}

export async function extractPriceFromHtml(html) {
  const price = pickCandidate(extractCandidates(html));

  if (!price) {
    return { status: "not_found", error: "Price not found on page" };
  }

  return {
    status: "success",
    error: "",
    ...price
  };
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
    const price = await extractPriceFromHtml(html);

    if (price.status !== "success") {
      return price;
    }

    return {
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
