export const AUTH_TOKEN_KEY = "wishlist-auth-token-v1";
export const AUTH_EXPIRED_EVENT = "wishlist:auth-expired";
const GUEST_SESSION_KEY = "wishlist-guest-session-v1";

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

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === "undefined") {
    return;
  }
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
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
  const existing = localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) {
    return existing;
  }
  const created = makeGuestSessionId();
  localStorage.setItem(GUEST_SESSION_KEY, created);
  return created;
}

export function resetGuestSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const next = makeGuestSessionId();
  localStorage.setItem(GUEST_SESSION_KEY, next);
  return next;
}

function toApiError(message, extra = {}) {
  return {
    message: message || "API request failed",
    ...extra
  };
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const guestSessionId = getOrCreateGuestSessionId();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!token && guestSessionId) {
    headers["X-Guest-Session-Id"] = guestSessionId;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
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

      if (response.status === 401 && token) {
        setAuthToken(null);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
        }
      }

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
  if (result.data?.token) {
    setAuthToken(result.data.token);
  }
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
  if (result.data?.token) {
    setAuthToken(result.data.token);
  }
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

export async function loginWithGoogleCredential(credential) {
  const result = await request("/api/auth/google", {
    method: "POST",
    body: { credential }
  });
  if (result.data?.token) {
    setAuthToken(result.data.token);
  }
  return {
    data: result.data?.user || null,
    error: result.error
  };
}

export async function linkGoogleIdentity(credential) {
  const result = await request("/api/auth/google/link", {
    method: "POST",
    body: { credential }
  });
  return {
    data: result.data?.identities || [],
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
  const result = await request("/api/auth/logout", { method: "POST" });
  setAuthToken(null);
  return result;
}

export async function deleteCurrentUserAccount() {
  const result = await request("/api/auth/me", { method: "DELETE" });
  if (!result.error) {
    setAuthToken(null);
  }
  return result;
}

export function getApiBase() {
  return API_BASE;
}

export function fetchCurrentUser() {
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
