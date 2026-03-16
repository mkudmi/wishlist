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

app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

const SESSION_TTL_DAYS = 30;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
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
    `SELECT u.id, u.email, u.first_name, u.last_name, u.birthday, u.created_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1;`,
    [tokenHash]
  );
  return rows[0] || null;
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

app.get("/api/auth/yandex/link/start", async (req, res, next) => {
  try {
    const token = getBearerToken(req) || String(req.query?.authToken || "").trim();
    const authUser = await getAuthUserFromToken(token);

    if (!authUser) {
      return res.status(401).send("unauthorized");
    }

    const appOrigin = getSafeAppOrigin(req.query?.origin || req.headers.origin);
    if (!config.yandexClientId || !config.yandexClientSecret || !config.yandexRedirectUri) {
      return res.status(503).send("Yandex auth is not configured");
    }
    if (!appOrigin) {
      return res.status(400).send("Invalid app origin");
    }

    const state = createOauthState(
      {
        provider: "yandex-link",
        origin: appOrigin,
        userId: authUser.id,
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
      `SELECT id, title, celebration_type, custom_celebration, event_date, share_token, created_at
       FROM wishlists
       WHERE owner_id = $1
       ORDER BY created_at ASC;`,
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
    const shareToken = normalizeName(req.body?.share_token) || createShareToken();

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO wishlists (owner_id, title, celebration_type, custom_celebration, event_date, share_token, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, title, celebration_type, custom_celebration, event_date, share_token, created_at;`,
      [req.authUser.id, title, celebrationType, customCelebration, eventDate, shareToken]
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
    const shareToken = req.body?.share_token;

    const { rows } = await pool.query(
      `UPDATE wishlists SET
         title = COALESCE($3, title),
         celebration_type = COALESCE($4, celebration_type),
         custom_celebration = COALESCE($5, custom_celebration),
         event_date = COALESCE($6, event_date),
         share_token = COALESCE($7, share_token)
       WHERE id = $1 AND owner_id = $2
       RETURNING id, title, celebration_type, custom_celebration, event_date, share_token, created_at;`,
      [id, req.authUser.id, title, celebrationType, customCelebration, eventDate, shareToken]
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

    const { rows } = await pool.query(
      `SELECT id, wishlist_id, title, note, tag, price, url, created_at
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
    const note = normalizeName(req.body?.note);
    const tag = normalizeName(req.body?.tag) || "Без категории";
    const price = String(req.body?.price || "").trim();
    const url = String(req.body?.url || "").trim();

    if (!wishlistId || !title || !note) {
      return res.status(400).json({ error: "wishlist_id, title and note are required" });
    }

    const access = await pool.query("SELECT id FROM wishlists WHERE id = $1 AND owner_id = $2", [wishlistId, req.authUser.id]);
    if (!access.rows[0]) {
      return res.status(403).json({ error: "forbidden" });
    }

    const { rows } = await pool.query(
      `INSERT INTO wishes (wishlist_id, title, note, tag, price, url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, wishlist_id, title, note, tag, price, url, created_at;`,
      [wishlistId, title, note, tag, price, url]
    );

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

    const { rows } = await pool.query(
      `UPDATE wishes
       SET title = $2, note = $3, tag = $4, price = $5, url = $6
       WHERE id = $1
       RETURNING id, wishlist_id, title, note, tag, price, url, created_at;`,
      [id, title, note, tag, price, url]
    );

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
      `SELECT id, wish_id, wishlist_id, contributor_name, contributor_user_id, guest_session_id, amount::float8 AS amount, created_at
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
    const contributorUserId = req.body?.contributor_user_id || null;
    const amount = Number(req.body?.amount);
    const guestSessionId = getGuestSessionId(req);

    if (!wishId || !wishlistId || !contributorName || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "invalid payload" });
    }

    const { rows: checkRows } = await pool.query(
      `SELECT wl.id, wl.is_public
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

    const { rows } = await pool.query(
      `INSERT INTO wish_reservations (wish_id, wishlist_id, contributor_name, contributor_user_id, guest_session_id, amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, wish_id, wishlist_id, contributor_name, contributor_user_id, guest_session_id, amount::float8 AS amount, created_at;`,
      [wishId, wishlistId, contributorName, safeContributorUserId, safeGuestSessionId, amount]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get("/api/shared/:token/wishes", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.wishlist_id, w.title, w.note, w.tag, w.price, w.url, w.created_at
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

app.get("/api/shared/:token/meta", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wl.id, wl.title, wl.celebration_type, wl.custom_celebration, wl.event_date,
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
      `SELECT wr.id, wr.wish_id, wr.wishlist_id, wr.contributor_name, wr.contributor_user_id, wr.guest_session_id, wr.amount::float8 AS amount, wr.created_at
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
