import express from "express";
import cors from "cors";
import morgan from "morgan";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { pool } from "./db.js";
import { config } from "./config.js";

const app = express();
const googleAuthClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;
const YANDEX_OAUTH_AUTHORIZE_URL = "https://oauth.yandex.com/authorize";
const YANDEX_OAUTH_TOKEN_URL = "https://oauth.yandex.com/token";
const YANDEX_USER_INFO_URL = "https://login.yandex.ru/info?format=json";
const WISHLIST_THEME_VALUES = new Set(["sand", "sage", "berry", "sky", "midnight"]);
let wishImageColumnAvailable = null;

app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("combined"));

const SESSION_TTL_DAYS = 30;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
}

function parseTargetFromPrice(price) {
  if (!price) {
    return null;
  }

  const matches = [...String(price).matchAll(/\d[\d\s]*/g)];
  if (matches.length === 0) {
    return null;
  }

  const values = matches
    .map((match) => Number(match[0].replace(/\s/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    return null;
  }

  return values[values.length - 1];
}

function splitDisplayName(fullName) {
  const normalized = normalizeName(fullName);
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

function normalizeRulesList(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeWishlistTheme(value, { fallback = "sand", allowMissing = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowMissing ? undefined : fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!WISHLIST_THEME_VALUES.has(normalized)) {
    return null;
  }

  return normalized;
}

function createShareToken() {
  return crypto.randomBytes(12).toString("hex");
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createOauthState(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function parseOauthState(state, secret) {
  if (!state || !secret || !state.includes(".")) {
    return null;
  }

  const [encoded, signature] = state.split(".");
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (signature !== expected) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getSafeAppOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function isPrivateHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    const [first, second] = normalized.split(".").map(Number);
    if (first === 10 || first === 127 || first === 0) {
      return true;
    }
    if (first === 169 && second === 254) {
      return true;
    }
    if (first === 192 && second === 168) {
      return true;
    }
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
  }

  if (
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  ) {
    return true;
  }

  return false;
}

function normalizeExternalPreviewUrl(value, baseUrl = null) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    if (parsed.username || parsed.password || isPrivateHostname(parsed.hostname)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function decodeHtmlEntity(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractJsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=("|')application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi)].map((match) =>
    decodeHtmlEntity(match[2] || "").trim()
  );
}

function collectProductImageCandidates(node, candidates = []) {
  if (!node) {
    return candidates;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectProductImageCandidates(item, candidates));
    return candidates;
  }

  if (typeof node !== "object") {
    return candidates;
  }

  const nodeType = node["@type"];
  const types = Array.isArray(nodeType) ? nodeType : [nodeType];
  const isProductNode = types.some((item) => String(item || "").toLowerCase() === "product");

  if (isProductNode) {
    const imageValue = node.image;
    if (typeof imageValue === "string") {
      candidates.push(imageValue);
    } else if (Array.isArray(imageValue)) {
      imageValue.forEach((item) => {
        if (typeof item === "string") {
          candidates.push(item);
        } else if (item && typeof item === "object" && typeof item.url === "string") {
          candidates.push(item.url);
        }
      });
    } else if (imageValue && typeof imageValue === "object" && typeof imageValue.url === "string") {
      candidates.push(imageValue.url);
    }
  }

  Object.values(node).forEach((value) => collectProductImageCandidates(value, candidates));
  return candidates;
}

function extractJsonLdImageCandidates(html) {
  const candidates = [];

  for (const block of extractJsonLdBlocks(html)) {
    if (!block) {
      continue;
    }

    try {
      const parsed = JSON.parse(block);
      collectProductImageCandidates(parsed, candidates);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return candidates;
}

function isUnsupportedPreviewHost(pageUrl) {
  const hostname = String(pageUrl?.hostname || "").toLowerCase();
  return hostname.includes("market.yandex.");
}

function pickPreviewImageCandidate(html, pageUrl) {
  const candidates = [...extractJsonLdImageCandidates(html), extractMetaImageCandidate(html)].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeExternalPreviewUrl(candidate, pageUrl);
    if (!normalized) {
      continue;
    }

    return normalized.toString();
  }

  return "";
}

function extractMetaImageCandidate(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attrs = {};
    for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      const attrName = String(match[1] || "").toLowerCase();
      const attrValue = decodeHtmlEntity(match[3] || match[4] || match[5] || "");
      attrs[attrName] = attrValue;
    }

    const key = String(attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (!key || !["og:image", "twitter:image", "twitter:image:src", "image"].includes(key)) {
      continue;
    }

    const content = String(attrs.content || "").trim();
    if (content) {
      return content;
    }
  }

  return "";
}

async function fetchWishPreviewImageUrl(rawUrl, redirectDepth = 0) {
  const pageUrl = normalizeExternalPreviewUrl(rawUrl);
  if (!pageUrl || redirectDepth > 3) {
    return "";
  }

  if (isUnsupportedPreviewHost(pageUrl)) {
    return "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(pageUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "WishlistBot/1.0 (+preview-fetch)",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return "";
      }
      const redirectUrl = normalizeExternalPreviewUrl(location, pageUrl);
      return redirectUrl ? fetchWishPreviewImageUrl(redirectUrl.toString(), redirectDepth + 1) : "";
    }

    if (!response.ok) {
      return "";
    }

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) {
      return "";
    }

    const html = (await response.text()).slice(0, 250000);
    return pickPreviewImageCandidate(html, pageUrl);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function hasWishImageColumn() {
  if (wishImageColumnAvailable !== null) {
    return wishImageColumnAvailable;
  }

  const { rows } = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wishes' AND column_name = 'image_url'
     LIMIT 1;`
  );

  wishImageColumnAvailable = Boolean(rows[0]);
  return wishImageColumnAvailable;
}

async function getWishSelectFragment(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const imageField = (await hasWishImageColumn()) ? `${prefix}image_url` : "'' AS image_url";
  return `${prefix}id, ${prefix}wishlist_id, ${prefix}title, ${prefix}note, ${prefix}tag, ${prefix}price, ${prefix}url, ${imageField}, ${prefix}created_at`;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    if (!storedHash || !storedHash.includes(":")) {
      resolve(false);
      return;
    }
    const [salt, key] = storedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

async function createSession(userId) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${SESSION_TTL_DAYS} days')
     RETURNING token_hash;`,
    [userId, tokenHash]
  );
  if (!rows[0]) {
    throw new Error("Failed to create session");
  }
  return token;
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice(7).trim() || null;
}

function getGuestSessionId(req) {
  const fromHeader = String(req.headers["x-guest-session-id"] || "").trim();
  const fromBody = String(req.body?.guest_session_id || "").trim();
  return fromHeader || fromBody || null;
}

async function getAuthUserFromToken(token) {
  if (!token) {
    return null;
  }
  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    `UPDATE user_sessions
     SET expires_at = NOW() + INTERVAL '${SESSION_TTL_DAYS} days'
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING user_id;`,
    [tokenHash]
  );

  if (!rows[0]?.user_id) {
    return null;
  }

  const { rows: userRows } = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.created_at
     FROM users u
     WHERE u.id = $1
     LIMIT 1;`,
    [rows[0].user_id]
  );
  return userRows[0] || null;
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const authUser = await getAuthUserFromToken(token);
    if (!authUser) {
      return res.status(401).json({ error: "unauthorized" });
    }

    req.authUser = authUser;
    return next();
  } catch (error) {
    return next(error);
  }
}

function mapUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    birthday: user.birthday || null,
    created_at: user.created_at,
    identities: user.identities || []
  };
}

async function fetchUserIdentities(client, userId) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT provider, provider_user_id, provider_email, email_verified, created_at
     FROM user_identities
     WHERE user_id = $1
     ORDER BY created_at ASC;`,
    [userId]
  );
  return rows;
}

async function mapUserWithIdentities(client, user) {
  if (!user) {
    return null;
  }
  const identities = await fetchUserIdentities(client, user.id);
  return mapUser({ ...user, identities });
}

async function ensurePasswordIdentity(client, userId, email) {
  await client.query(
    `INSERT INTO user_identities (user_id, provider, provider_user_id, provider_email, email_verified)
     VALUES ($1, 'password', $2, $2, TRUE)
     ON CONFLICT (provider, provider_user_id) DO NOTHING;`,
    [userId, normalizeEmail(email)]
  );
}

async function findUserByIdentity(client, provider, providerUserId) {
  const { rows } = await client.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.created_at
     FROM user_identities ui
     JOIN users u ON u.id = ui.user_id
     WHERE ui.provider = $1 AND ui.provider_user_id = $2
     LIMIT 1;`,
    [provider, providerUserId]
  );
  return rows[0] || null;
}

async function findUserByEmail(client, email) {
  if (!email) {
    return null;
  }
  const { rows } = await client.query(
    `SELECT id, email, first_name, last_name, birthday, created_at
     FROM users
     WHERE email = $1
     LIMIT 1;`,
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

async function linkIdentity(client, userId, { provider, providerUserId, providerEmail, emailVerified }) {
  await client.query(
    `INSERT INTO user_identities (user_id, provider, provider_user_id, provider_email, email_verified)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider, provider_user_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       provider_email = EXCLUDED.provider_email,
       email_verified = EXCLUDED.email_verified;`,
    [userId, provider, providerUserId, providerEmail || null, Boolean(emailVerified)]
  );
}

async function removeIdentity(client, userId, provider) {
  const { rows } = await client.query(
    `DELETE FROM user_identities
     WHERE user_id = $1 AND provider = $2
     RETURNING provider;`,
    [userId, provider]
  );

  return rows[0] || null;
}

async function resolveOauthUser(client, { provider, providerUserId, providerEmail, emailVerified, firstName, lastName }) {
  const normalizedEmail = normalizeEmail(providerEmail);
  let user = await findUserByIdentity(client, provider, providerUserId);

  if (user) {
    await linkIdentity(client, user.id, {
      provider,
      providerUserId,
      providerEmail: normalizedEmail,
      emailVerified
    });
    return user;
  }

  if (normalizedEmail && emailVerified) {
    user = await findUserByEmail(client, normalizedEmail);
    if (user) {
      await linkIdentity(client, user.id, {
        provider,
        providerUserId,
        providerEmail: normalizedEmail,
        emailVerified
      });
      return user;
    }
  }

  const inserted = await client.query(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, NULL, $2, $3)
     RETURNING id, email, first_name, last_name, birthday, created_at;`,
    [normalizedEmail || null, firstName || "", lastName || ""]
  );

  user = inserted.rows[0];
  await linkIdentity(client, user.id, {
    provider,
    providerUserId,
    providerEmail: normalizedEmail,
    emailVerified
  });

  return user;
}

async function verifyGoogleCredential(credential) {
  if (!googleAuthClient || !config.googleClientId) {
    throw new Error("google auth is not configured");
  }

  const ticket = await googleAuthClient.verifyIdToken({
    idToken: credential,
    audience: config.googleClientId
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
    throw new Error("invalid google credential");
  }
  return payload;
}

async function exchangeYandexCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.yandexClientId,
    client_secret: config.yandexClientSecret
  });

  const response = await fetch(YANDEX_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error("invalid yandex code");
  }

  return response.json();
}

async function fetchYandexUser(accessToken) {
  const response = await fetch(YANDEX_USER_INFO_URL, {
    headers: {
      Authorization: `OAuth ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("failed to fetch yandex user");
  }

  const data = await response.json();
  if (!data?.id) {
    throw new Error("invalid yandex user");
  }
  return data;
}

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const firstName = normalizeName(req.body?.firstName);
    const lastName = normalizeName(req.body?.lastName);
    const birthday = req.body?.birthday || null;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName and lastName are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }

    const existing = await pool.query(`SELECT id FROM users WHERE email = $1 LIMIT 1;`, [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: "user already exists" });
    }

    const passwordHash = await hashPassword(password);

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, birthday)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, birthday, created_at;`,
      [email, passwordHash, firstName, lastName, birthday]
    );

    await ensurePasswordIdentity(pool, rows[0].id, email);

    const token = await createSession(rows[0].id);
    return res.status(201).json({ token, user: await mapUserWithIdentities(pool, rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const { rows } = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, birthday, created_at
       FROM users WHERE email = $1 LIMIT 1;`,
      [email]
    );

    if (!rows[0]) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await verifyPassword(password, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    await ensurePasswordIdentity(pool, rows[0].id, email);
    const token = await createSession(rows[0].id);
    return res.json({ token, user: await mapUserWithIdentities(pool, rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/change-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "email, currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "new password must be at least 6 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "new password must differ from current password" });
    }

    const { rows } = await pool.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1;`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    if (!user.password_hash) {
      return res.status(409).json({ error: "password_auth_not_available" });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "invalid current password" });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users
       SET password_hash = $2
       WHERE id = $1;`,
      [user.id, newPasswordHash]
    );
    await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [user.id]);

    await ensurePasswordIdentity(pool, user.id, email);

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/verify-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const currentPassword = String(req.body?.currentPassword || "");

    if (!email || !currentPassword) {
      return res.status(400).json({ error: "email and currentPassword are required" });
    }

    const { rows } = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1;`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    if (!user.password_hash) {
      return res.status(409).json({ error: "password_auth_not_available" });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "invalid current password" });
    }

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    const tokenHash = hashToken(token);
    await pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash]);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await mapUserWithIdentities(pool, req.authUser);
  res.json(user);
});

app.patch("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const firstName = normalizeName(req.body?.first_name);
    const lastName = normalizeName(req.body?.last_name);
    const birthday = req.body?.birthday || null;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "first_name and last_name are required" });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET first_name = $2, last_name = $3, birthday = $4
       WHERE id = $1
       RETURNING id, email, first_name, last_name, birthday, created_at;`,
      [req.authUser.id, firstName, lastName, birthday]
    );

    return res.json(await mapUserWithIdentities(pool, rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/identities", requireAuth, async (req, res, next) => {
  try {
    const identities = await fetchUserIdentities(pool, req.authUser.id);
    return res.json({ identities });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/auth/identities/:provider", requireAuth, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const provider = String(req.params?.provider || "").trim().toLowerCase();

    if (!["google", "yandex"].includes(provider)) {
      return res.status(400).json({ error: "invalid identity provider" });
    }

    await client.query("BEGIN");

    const identities = await fetchUserIdentities(client, req.authUser.id);
    const linkedProviders = new Set(identities.map((identity) => identity.provider));

    if (!linkedProviders.has(provider)) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "identity_not_found" });
    }

    if (identities.length <= 1) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "cannot_unlink_last_identity" });
    }

    await removeIdentity(client, req.authUser.id, provider);
    await client.query("COMMIT");

    return res.json({ identities: await fetchUserIdentities(pool, req.authUser.id) });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/google", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const credential = String(req.body?.credential || "").trim();
    if (!credential) {
      return res.status(400).json({ error: "credential is required" });
    }
    if (!googleAuthClient || !config.googleClientId) {
      return res.status(503).json({ error: "google auth is not configured" });
    }

    const googlePayload = await verifyGoogleCredential(credential);
    const googleId = String(googlePayload.sub);
    const email = normalizeEmail(googlePayload.email);
    const givenName = normalizeName(googlePayload.given_name);
    const familyName = normalizeName(googlePayload.family_name);
    const fallbackName = splitDisplayName(googlePayload.name);
    const firstName = givenName || fallbackName.firstName || email.split("@")[0] || "Google";
    const lastName = familyName || fallbackName.lastName || "";

    await client.query("BEGIN");
    const userRow = await resolveOauthUser(client, {
      provider: "google",
      providerUserId: googleId,
      providerEmail: email,
      emailVerified: true,
      firstName,
      lastName
    });
    await client.query("COMMIT");
    const token = await createSession(userRow.id);
    return res.json({ token, user: await mapUserWithIdentities(pool, userRow) });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.message === "invalid google credential" || error?.message === "google auth is not configured") {
      return res.status(error.message === "invalid google credential" ? 401 : 503).json({ error: error.message });
    }
    if (error?.code === "23505") {
      return res.status(409).json({ error: "identity_link_conflict" });
    }
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/google/link", requireAuth, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const credential = String(req.body?.credential || "").trim();
    if (!credential) {
      return res.status(400).json({ error: "credential is required" });
    }
    if (!googleAuthClient || !config.googleClientId) {
      return res.status(503).json({ error: "google auth is not configured" });
    }

    const googlePayload = await verifyGoogleCredential(credential);
    const providerUserId = String(googlePayload.sub);
    const providerEmail = normalizeEmail(googlePayload.email);

    await client.query("BEGIN");
    const owner = await findUserByIdentity(client, "google", providerUserId);
    if (owner && owner.id !== req.authUser.id) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "identity_link_conflict" });
    }

    await linkIdentity(client, req.authUser.id, {
      provider: "google",
      providerUserId,
      providerEmail,
      emailVerified: true
    });
    await client.query("COMMIT");
    return res.json({ identities: await fetchUserIdentities(pool, req.authUser.id) });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.message === "invalid google credential" || error?.message === "google auth is not configured") {
      return res.status(error.message === "invalid google credential" ? 401 : 503).json({ error: error.message });
    }
    return next(error);
  } finally {
    client.release();
  }
});

app.get("/api/auth/yandex/start", (req, res) => {
  const appOrigin = getSafeAppOrigin(req.query?.origin || req.headers.origin);
  if (!config.yandexClientId || !config.yandexClientSecret || !config.yandexRedirectUri) {
    return res.status(503).send("Yandex auth is not configured");
  }
  if (!appOrigin) {
    return res.status(400).send("Invalid app origin");
  }

  const state = createOauthState(
    {
      provider: "yandex",
      origin: appOrigin,
      nonce: crypto.randomBytes(12).toString("hex"),
      ts: Date.now()
    },
    config.yandexClientSecret
  );

  const authorizeUrl = new URL(YANDEX_OAUTH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.yandexClientId);
  authorizeUrl.searchParams.set("redirect_uri", config.yandexRedirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("force_confirm", "true");

  return res.redirect(authorizeUrl.toString());
});

app.get("/api/auth/yandex/callback", async (req, res, next) => {
  const error = String(req.query?.error || "").trim();
  const code = String(req.query?.code || "").trim();
  const state = String(req.query?.state || "").trim();
  const parsedState = parseOauthState(state, config.yandexClientSecret);
  const fallbackOrigin = getSafeAppOrigin(config.corsOrigin === "*" ? "" : config.corsOrigin);
  const appOrigin = getSafeAppOrigin(parsedState?.origin) || fallbackOrigin;

  if (!appOrigin) {
    return res.status(400).send("Invalid callback origin");
  }

  const redirectUrl = new URL("/auth/yandex/callback", appOrigin);

  try {
    if (error) {
      redirectUrl.searchParams.set("error", error);
      return res.redirect(redirectUrl.toString());
    }
    if (!config.yandexClientId || !config.yandexClientSecret || !config.yandexRedirectUri) {
      redirectUrl.searchParams.set("error", "yandex_not_configured");
      return res.redirect(redirectUrl.toString());
    }
    if (!code || !parsedState || !["yandex", "yandex-link"].includes(parsedState.provider)) {
      redirectUrl.searchParams.set("error", "invalid_state");
      return res.redirect(redirectUrl.toString());
    }
    if (Date.now() - Number(parsedState.ts || 0) > 10 * 60 * 1000) {
      redirectUrl.searchParams.set("error", "state_expired");
      return res.redirect(redirectUrl.toString());
    }

    const tokenData = await exchangeYandexCodeForToken(code);
    const yandexUser = await fetchYandexUser(tokenData.access_token);
    const yandexId = String(yandexUser.id);
    const email = normalizeEmail(yandexUser.default_email || yandexUser.emails?.[0] || "");
    const firstName = normalizeName(yandexUser.first_name);
    const lastName = normalizeName(yandexUser.last_name);
    const fallbackName = splitDisplayName(yandexUser.real_name || yandexUser.display_name || yandexUser.login);
    const safeFirstName = firstName || fallbackName.firstName || yandexUser.display_name || "Yandex";
    const safeLastName = lastName || fallbackName.lastName || "";

    if (parsedState.provider === "yandex-link") {
      const owner = await findUserByIdentity(pool, "yandex", yandexId);
      if (owner && owner.id !== parsedState.userId) {
        redirectUrl.searchParams.set("error", "identity_link_conflict");
        return res.redirect(redirectUrl.toString());
      }

      await linkIdentity(pool, parsedState.userId, {
        provider: "yandex",
        providerUserId: yandexId,
        providerEmail: email,
        emailVerified: Boolean(email)
      });
      redirectUrl.searchParams.set("linked", "yandex");
      return res.redirect(redirectUrl.toString());
    }

    const userRow = await resolveOauthUser(pool, {
      provider: "yandex",
      providerUserId: yandexId,
      providerEmail: email,
      emailVerified: Boolean(email),
      firstName: safeFirstName,
      lastName: safeLastName
    });

    const token = await createSession(userRow.id);
    redirectUrl.searchParams.set("token", token);
    return res.redirect(redirectUrl.toString());
  } catch (callbackError) {
    if (callbackError?.message === "invalid yandex code") {
      redirectUrl.searchParams.set("error", "invalid_code");
      return res.redirect(redirectUrl.toString());
    }
    if (callbackError?.message === "failed to fetch yandex user" || callbackError?.message === "invalid yandex user") {
      redirectUrl.searchParams.set("error", "invalid_user");
      return res.redirect(redirectUrl.toString());
    }
    if (callbackError?.code === "23505") {
      redirectUrl.searchParams.set("error", "identity_link_conflict");
      return res.redirect(redirectUrl.toString());
    }
    return next(callbackError);
  }
});

app.post("/api/auth/yandex/link/start", requireAuth, async (req, res, next) => {
  try {
    const appOrigin = getSafeAppOrigin(req.body?.origin || req.headers.origin);
    if (!config.yandexClientId || !config.yandexClientSecret || !config.yandexRedirectUri) {
      return res.status(503).json({ error: "yandex auth is not configured" });
    }
    if (!appOrigin) {
      return res.status(400).json({ error: "invalid app origin" });
    }

    const state = createOauthState(
      {
        provider: "yandex-link",
        origin: appOrigin,
        userId: req.authUser.id,
        nonce: crypto.randomBytes(12).toString("hex"),
        ts: Date.now()
      },
      config.yandexClientSecret
    );

    const authorizeUrl = new URL(YANDEX_OAUTH_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", config.yandexClientId);
    authorizeUrl.searchParams.set("redirect_uri", config.yandexRedirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("force_confirm", "true");

    return res.json({ authorizeUrl: authorizeUrl.toString() });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/auth/me", requireAuth, async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rowCount } = await client.query("DELETE FROM users WHERE id = $1", [req.authUser.id]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "user not found" });
    }

    await client.query("COMMIT");
    return res.status(204).end();
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

app.get("/api/wishlists", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, celebration_type, custom_celebration, event_date, theme, share_token, created_at
       FROM wishlists
       WHERE owner_id = $1
       ORDER BY created_at DESC;`,
      [req.authUser.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/wishlists", requireAuth, async (req, res, next) => {
  try {
    const title = normalizeName(req.body?.title);
    const celebrationType = normalizeName(req.body?.celebration_type) || "birthday";
    const customCelebration = normalizeName(req.body?.custom_celebration) || null;
    const eventDate = req.body?.event_date || null;
    const theme = normalizeWishlistTheme(req.body?.theme);
    const shareToken = normalizeName(req.body?.share_token) || createShareToken();

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!theme) {
      return res.status(400).json({ error: "invalid wishlist theme" });
    }

    const { rows } = await pool.query(
      `INSERT INTO wishlists (owner_id, title, celebration_type, custom_celebration, event_date, theme, share_token, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, title, celebration_type, custom_celebration, event_date, theme, share_token, created_at;`,
      [req.authUser.id, title, celebrationType, customCelebration, eventDate, theme, shareToken]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "share token already exists" });
    }
    next(error);
  }
});

app.patch("/api/wishlists/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [id, req.authUser.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "wishlist not found" });
    }

    const title = req.body?.title;
    const celebrationType = req.body?.celebration_type;
    const customCelebration = req.body?.custom_celebration;
    const eventDate = req.body?.event_date;
    const theme = normalizeWishlistTheme(req.body?.theme, { allowMissing: true });
    const shareToken = req.body?.share_token;

    if (req.body?.theme !== undefined && !theme) {
      return res.status(400).json({ error: "invalid wishlist theme" });
    }

    const { rows } = await pool.query(
      `UPDATE wishlists SET
         title = COALESCE($3, title),
         celebration_type = COALESCE($4, celebration_type),
         custom_celebration = COALESCE($5, custom_celebration),
         event_date = COALESCE($6, event_date),
         theme = COALESCE($7, theme),
         share_token = COALESCE($8, share_token)
       WHERE id = $1 AND owner_id = $2
       RETURNING id, title, celebration_type, custom_celebration, event_date, theme, share_token, created_at;`,
      [id, req.authUser.id, title, celebrationType, customCelebration, eventDate, theme, shareToken]
    );

    res.json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "share token already exists" });
    }
    next(error);
  }
});

app.delete("/api/wishlists/:id", requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM wishlists WHERE id = $1 AND owner_id = $2", [
      req.params.id,
      req.authUser.id
    ]);
    if (!rowCount) {
      return res.status(404).json({ error: "wishlist not found" });
    }
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/wishlists/:wishlistId/wishes", requireAuth, async (req, res, next) => {
  try {
    const { wishlistId } = req.params;
    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(404).json({ error: "wishlist not found" });
    }

    const wishSelect = await getWishSelectFragment();
    const { rows } = await pool.query(
      `SELECT ${wishSelect}
       FROM wishes
       WHERE wishlist_id = $1
       ORDER BY created_at DESC;`,
      [wishlistId]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/wishlists/:wishlistId/rules", requireAuth, async (req, res, next) => {
  try {
    const { wishlistId } = req.params;
    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(404).json({ error: "wishlist not found" });
    }

    const { rows } = await pool.query("SELECT rules FROM wishlist_rules WHERE wishlist_id = $1 LIMIT 1", [wishlistId]);
    return res.json({ rules: rows[0]?.rules || [] });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/wishlists/:wishlistId/rules", requireAuth, async (req, res, next) => {
  try {
    const { wishlistId } = req.params;
    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(404).json({ error: "wishlist not found" });
    }

    const rules = normalizeRulesList(req.body?.rules);
    const { rows } = await pool.query(
      `INSERT INTO wishlist_rules (wishlist_id, rules)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id)
       DO UPDATE SET rules = EXCLUDED.rules
       RETURNING rules;`,
      [wishlistId, rules]
    );

    return res.json({ rules: rows[0]?.rules || [] });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/wishes", requireAuth, async (req, res, next) => {
  try {
    const wishlistId = req.body?.wishlist_id;
    const title = normalizeName(req.body?.title);
    const note = normalizeName(String(req.body?.note || ""));
    const tag = normalizeName(req.body?.tag) || "Без категории";
    const price = String(req.body?.price || "").trim();
    const url = String(req.body?.url || "").trim();
    const imageUrlFromBody = typeof req.body?.image_url === "string" ? req.body.image_url : null;
    const imageUrl = imageUrlFromBody !== null ? imageUrlFromBody : (url ? await fetchWishPreviewImageUrl(url) : "");

    if (!wishlistId || !title) {
      return res.status(400).json({ error: "wishlist_id and title are required" });
    }

    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(403).json({ error: "forbidden" });
    }

    const wishSelect = await getWishSelectFragment();
    const hasImageCol = await hasWishImageColumn();
    const { rows } = await (hasImageCol
      ? pool.query(
          `INSERT INTO wishes (wishlist_id, title, note, tag, price, url, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING ${wishSelect};`,
          [wishlistId, title, note, tag, price, url, imageUrl]
        )
      : pool.query(
          `INSERT INTO wishes (wishlist_id, title, note, tag, price, url)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${wishSelect};`,
          [wishlistId, title, note, tag, price, url]
        ));

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/wishes/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      `SELECT w.id
       FROM wishes w
       JOIN wishlists wl ON wl.id = w.wishlist_id
       WHERE w.id = $1 AND wl.owner_id = $2`,
      [id, req.authUser.id]
    );

    if (!check.rows[0]) {
      return res.status(404).json({ error: "wish not found" });
    }

    const title = normalizeName(req.body?.title);
    const note = normalizeName(req.body?.note);
    const tag = normalizeName(req.body?.tag) || "Без категории";
    const price = String(req.body?.price || "").trim();
    const url = String(req.body?.url || "").trim();
    const imageUrlFromBody = typeof req.body?.image_url === "string" ? req.body.image_url : null;
    const imageUrl = imageUrlFromBody !== null ? imageUrlFromBody : (url ? await fetchWishPreviewImageUrl(url) : "");

    const wishSelect = await getWishSelectFragment();
    const hasImageCol = await hasWishImageColumn();
    const { rows } = await (hasImageCol
      ? pool.query(
          `UPDATE wishes
           SET title = $2, note = $3, tag = $4, price = $5, url = $6, image_url = $7
           WHERE id = $1
           RETURNING ${wishSelect};`,
          [id, title, note, tag, price, url, imageUrl]
        )
      : pool.query(
          `UPDATE wishes
           SET title = $2, note = $3, tag = $4, price = $5, url = $6
           WHERE id = $1
           RETURNING ${wishSelect};`,
          [id, title, note, tag, price, url]
        ));

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/wishes/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM wishes
       WHERE id = $1
         AND wishlist_id IN (SELECT id FROM wishlists WHERE owner_id = $2);`,
      [id, req.authUser.id]
    );

    if (!rowCount) {
      return res.status(404).json({ error: "wish not found" });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/wishlists/:wishlistId/reservations", requireAuth, async (req, res, next) => {
  try {
    const { wishlistId } = req.params;
    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(404).json({ error: "wishlist not found" });
    }

    const { rows } = await pool.query(
      `SELECT id, wish_id, wishlist_id, contributor_name, contributor_contact, contributor_user_id, guest_session_id, amount::float8 AS amount, created_at
       FROM wish_reservations
       WHERE wishlist_id = $1
       ORDER BY created_at ASC;`,
      [wishlistId]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/wishes/:wishId/my-reservations", async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    const authUser = await getAuthUserFromToken(token);
    const guestSessionId = getGuestSessionId(req);

    if (authUser) {
      await pool.query("DELETE FROM wish_reservations WHERE wish_id = $1 AND contributor_user_id = $2", [
        req.params.wishId,
        authUser.id
      ]);
      return res.status(204).end();
    }

    if (!guestSessionId) {
      return res.status(400).json({ error: "guest_session_id is required for anonymous delete" });
    }

    await pool.query("DELETE FROM wish_reservations WHERE wish_id = $1 AND guest_session_id = $2", [
      req.params.wishId,
      guestSessionId
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/reservations", async (req, res, next) => {
  try {
    const wishId = req.body?.wish_id;
    const wishlistId = req.body?.wishlist_id;
    const contributorName = normalizeName(req.body?.contributor_name);
    const contributorContact = normalizeName(req.body?.contributor_contact) || null;
    const contributorUserId = req.body?.contributor_user_id || null;
    const amount = Number(req.body?.amount);
    const guestSessionId = getGuestSessionId(req);

    if (!wishId || !wishlistId || !contributorName || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "invalid payload" });
    }

    const { rows: checkRows } = await pool.query(
      `SELECT wl.id, wl.is_public, w.price
       FROM wishlists wl
       JOIN wishes w ON w.wishlist_id = wl.id
       WHERE wl.id = $1 AND w.id = $2`,
      [wishlistId, wishId]
    );

    if (!checkRows[0]) {
      return res.status(404).json({ error: "wishlist or wish not found" });
    }

    const token = getBearerToken(req);
    const authUser = await getAuthUserFromToken(token);

    if (!checkRows[0].is_public && !authUser) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!authUser && !guestSessionId) {
      return res.status(400).json({ error: "guest_session_id is required for anonymous contribution" });
    }

    const safeContributorUserId = authUser?.id || contributorUserId;
    const safeGuestSessionId = authUser ? null : guestSessionId;
    const { rows: existingRows } = await pool.query(
      `SELECT id
       FROM wish_reservations
       WHERE wish_id = $1
       ORDER BY created_at ASC
       LIMIT 1;`,
      [wishId]
    );

    const wishTarget = parseTargetFromPrice(checkRows[0].price);
    const isFullFirstContribution = !existingRows[0] && Number.isFinite(wishTarget) && amount >= wishTarget;

    if (!existingRows[0] && !contributorContact && !isFullFirstContribution) {
      return res.status(400).json({ error: "contributor_contact is required for first contribution" });
    }

    const { rows } = await pool.query(
      `INSERT INTO wish_reservations (wish_id, wishlist_id, contributor_name, contributor_contact, contributor_user_id, guest_session_id, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, wish_id, wishlist_id, contributor_name, contributor_contact, contributor_user_id, guest_session_id, amount::float8 AS amount, created_at;`,
      [wishId, wishlistId, contributorName, contributorContact, safeContributorUserId, safeGuestSessionId, amount]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get("/api/shared/:token/wishes", async (req, res, next) => {
  try {
    const wishSelect = await getWishSelectFragment("w");
    const { rows } = await pool.query(
      `SELECT ${wishSelect}
       FROM wishes w
       JOIN wishlists wl ON wl.id = w.wishlist_id
       WHERE wl.share_token = $1 AND wl.is_public = true
       ORDER BY w.created_at DESC;`,
      [req.params.token]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/link-preview-image", async (req, res, next) => {
  try {
    const url = String(req.query?.url || "").trim();
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const imageUrl = await fetchWishPreviewImageUrl(url);
    return res.json({ image_url: imageUrl || "" });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/shared/:token/meta", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wl.id, wl.title, wl.celebration_type, wl.custom_celebration, wl.event_date, wl.theme, wl.created_at,
              u.first_name AS owner_first_name, u.birthday AS owner_birthday
       FROM wishlists wl
       JOIN users u ON u.id = wl.owner_id
       WHERE wl.share_token = $1 AND wl.is_public = true
       LIMIT 1;`,
      [req.params.token]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "shared wishlist not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get("/api/shared/:token/reservations", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wr.id, wr.wish_id, wr.wishlist_id, wr.contributor_name, wr.contributor_contact, wr.contributor_user_id, wr.guest_session_id, wr.amount::float8 AS amount, wr.created_at
       FROM wish_reservations wr
       JOIN wishlists wl ON wl.id = wr.wishlist_id
       WHERE wl.share_token = $1 AND wl.is_public = true
       ORDER BY wr.created_at ASC;`,
      [req.params.token]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/shared/:token/rules", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wr.rules
       FROM wishlists wl
       LEFT JOIN wishlist_rules wr ON wr.wishlist_id = wl.id
       WHERE wl.share_token = $1 AND wl.is_public = true
       LIMIT 1;`,
      [req.params.token]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "shared wishlist not found" });
    }

    return res.json({ rules: rows[0].rules || [] });
  } catch (error) {
    return next(error);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (!res.headersSent) {
    res.status(500).json({ error: "internal server error" });
  }
});

export default app;
