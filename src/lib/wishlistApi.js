const GUEST_COOKIE_NAME = "wishlist_guest";
const CSRF_COOKIE_NAME = "wishlist_csrf";
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl) {
    if (typeof window !== "undefined") {
      const currentOrigin = window.location.origin;
      const isSecurePage = window.location.protocol === "https:";
      const normalizedEnvUrl = envUrl.replace(/\/$/, "");
      const isLocalDevApi =
        normalizedEnvUrl.includes("127.0.0.1") ||
        normalizedEnvUrl.includes("localhost");
      const isInsecureApi = normalizedEnvUrl.startsWith("http://");

      // Never ship a production HTTPS page that talks to localhost or plain HTTP.
      if (isSecurePage && (isLocalDevApi || isInsecureApi)) {
        return currentOrigin;
      }
    }

    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://127.0.0.1:8080";
}

const API_BASE = getApiBaseUrl();

function getCookieValue(name) {
  if (typeof document === "undefined") {
    return "";
  }

  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function setClientCookie(name, value, maxAgeSeconds) {
  if (typeof document === "undefined") {
    return;
  }

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}

function makeGuestSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateGuestSessionId() {
  if (typeof window === "undefined") {
    return null;
  }
  const cookieGuestSessionId = getCookieValue(GUEST_COOKIE_NAME);
  if (cookieGuestSessionId) {
    return cookieGuestSessionId;
  }
  const created = makeGuestSessionId();
  setClientCookie(GUEST_COOKIE_NAME, created, 365 * 24 * 60 * 60);
  return created;
}

export function resetGuestSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const next = makeGuestSessionId();
  setClientCookie(GUEST_COOKIE_NAME, next, 365 * 24 * 60 * 60);
  return next;
}

async function ensureSessionContext() {
  const response = await fetch(`${API_BASE}/api/session/context`, {
    method: "GET",
    credentials: "include"
  });
  if (!response.ok) {
    return null;
  }

  return response.json();
}

function toApiError(message, extra = {}) {
  return {
    message: message || "API request failed",
    ...extra
  };
}

async function request(path, options = {}) {
  const method = options.method || "GET";
  const isSafeMethod = CSRF_SAFE_METHODS.has(method.toUpperCase());
  if (!isSafeMethod && !getCookieValue(CSRF_COOKIE_NAME)) {
    await ensureSessionContext();
  }

  const guestSessionId = getCookieValue(GUEST_COOKIE_NAME) || getOrCreateGuestSessionId();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  if (guestSessionId) {
    headers["X-Guest-Session-Id"] = guestSessionId;
  }
  if (!isSafeMethod) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const errorCode = payload?.error || null;

      return {
        data: null,
        error: toApiError(payload?.error || `${response.status} ${response.statusText}`, {
          status: response.status,
          code: errorCode
        })
      };
    }

    return {
      data: payload,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: toApiError(error?.message || "Network error")
    };
  }
}

export async function registerUser(payload) {
  const result = await request("/api/auth/register", {
    method: "POST",
    body: payload
  });
  return {
    data: result.data?.user || null,
    error: result.error
  };
}

export async function loginUser(payload) {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: payload
  });
  return {
    data: result.data?.user || null,
    error: result.error
  };
}

export async function changeUserPassword(payload) {
  const result = await request("/api/auth/change-password", {
    method: "POST",
    body: payload
  });

  return {
    data: result.data || null,
    error: result.error
  };
}

export async function verifyUserPassword(payload) {
  const result = await request("/api/auth/verify-password", {
    method: "POST",
    body: payload
  });

  return {
    data: result.data || null,
    error: result.error
  };
}

export async function startYandexIdentityLink(origin) {
  const result = await request("/api/auth/yandex/link/start", {
    method: "POST",
    body: { origin }
  });

  return {
    data: result.data?.authorizeUrl || "",
    error: result.error
  };
}

export async function logoutUser() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function deleteCurrentUserAccount() {
  return request("/api/auth/me", { method: "DELETE" });
}

export function getApiBase() {
  return API_BASE;
}

export async function fetchCurrentUser() {
  return request("/api/auth/me");
}

export async function fetchCurrentUserIdentities() {
  const result = await request("/api/auth/identities");
  return {
    data: result.data?.identities || [],
    error: result.error
  };
}

export async function unlinkIdentity(provider) {
  const result = await request(`/api/auth/identities/${provider}`, {
    method: "DELETE"
  });

  return {
    data: result.data?.identities || [],
    error: result.error
  };
}

export function fetchWishlistsByOwner() {
  return request("/api/wishlists");
}

export function fetchWishesByWishlist(wishlistId) {
  return request(`/api/wishlists/${wishlistId}/wishes`);
}

export function fetchSharedWishesByToken(token) {
  return request(`/api/shared/${token}/wishes`);
}

export async function fetchWishPreviewImage(url) {
  const encodedUrl = encodeURIComponent(String(url || "").trim());
  if (!encodedUrl) {
    return { data: "", error: null };
  }

  const result = await request(`/api/link-preview-image?url=${encodedUrl}`);
  return {
    data: result.data?.image_url || "",
    error: result.error
  };
}

export async function fetchSharedWishlistMetaByToken(token) {
  const result = await request(`/api/shared/${token}/meta`);
  return result;
}

export function fetchReservationsByWishlist(wishlistId) {
  return request(`/api/wishlists/${wishlistId}/reservations`);
}

export function fetchSharedReservationsByToken(token) {
  return request(`/api/shared/${token}/reservations`);
}

export async function fetchRulesByWishlist(wishlistId) {
  const result = await request(`/api/wishlists/${wishlistId}/rules`);
  return {
    data: result.data?.rules || [],
    error: result.error
  };
}

export async function fetchSharedRulesByToken(token) {
  const result = await request(`/api/shared/${token}/rules`);
  return {
    data: result.data?.rules || [],
    error: result.error
  };
}

export async function updateRulesByWishlist(wishlistId, rules) {
  const result = await request(`/api/wishlists/${wishlistId}/rules`, {
    method: "PUT",
    body: { rules }
  });
  return {
    data: result.data?.rules || [],
    error: result.error
  };
}

export function createWishlistRecord(payload) {
  return request("/api/wishlists", {
    method: "POST",
    body: payload
  });
}

export function deleteWishlistRecord(wishlistId) {
  return request(`/api/wishlists/${wishlistId}`, {
    method: "DELETE"
  });
}

export function updateWishlistRecord(wishlistId, payload) {
  return request(`/api/wishlists/${wishlistId}`, {
    method: "PATCH",
    body: payload
  });
}

export function copyUnreservedWishesToWishlist(sourceWishlistId, targetWishlistId) {
  return request(`/api/wishlists/${sourceWishlistId}/copy-unreserved-wishes`, {
    method: "POST",
    body: { target_wishlist_id: targetWishlistId }
  });
}

export function createWishReservationRecord(payload) {
  return request("/api/reservations", {
    method: "POST",
    body: payload
  });
}

export function deleteMyWishReservations(wishId) {
  return request(`/api/wishes/${wishId}/my-reservations`, {
    method: "DELETE"
  });
}

export function createWishRecord(payload) {
  return request("/api/wishes", {
    method: "POST",
    body: payload
  });
}

export function updateWishRecord(wishId, payload) {
  return request(`/api/wishes/${wishId}`, {
    method: "PATCH",
    body: payload
  });
}

export function deleteWishRecord(wishId) {
  return request(`/api/wishes/${wishId}`, {
    method: "DELETE"
  });
}

export function updateProfileRecord(payload) {
  return request("/api/auth/me", {
    method: "PATCH",
    body: payload
  });
}
