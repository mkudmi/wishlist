import { emptyProfileForm } from "../config/constants";

export function sanitizeWishes(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item.title === "string" && typeof item.note === "string")
    .map((item) => ({
      id: item.id || `wish-${Date.now()}-${Math.random()}`,
      title: item.title,
      note: item.note,
      tag: typeof item.tag === "string" ? item.tag : "Без категории",
      price:
        typeof item.price === "string"
          ? item.price
          : typeof item.accent === "string"
            ? item.accent
            : "",
      url: typeof item.url === "string" ? item.url : ""
    }));
}

export function readStoredContributions(storageKey) {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [wishId, value]) => {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        acc[wishId] = [{ name: "Инкогнито", amount: value, at: new Date().toISOString() }];
        return acc;
      }

      if (!Array.isArray(value)) {
        return acc;
      }

      const entries = value.filter(
        (entry) =>
          entry &&
          typeof entry.name === "string" &&
          typeof entry.amount === "number" &&
          Number.isFinite(entry.amount) &&
          entry.amount > 0
      );

      if (entries.length > 0) {
        acc[wishId] = entries;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function createWish(form) {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `wish-${Date.now()}`,
    title: form.title.trim(),
    note: form.note.trim(),
    tag: form.tag.trim() || "Без категории",
    price: form.price.trim(),
    url: form.url.trim()
  };
}

export function mapWishToForm(wish) {
  return {
    title: wish.title || "",
    note: wish.note || "",
    tag: wish.tag || "",
    price: wish.price || "",
    url: wish.url || ""
  };
}

export function parseTargetFromPrice(price) {
  if (!price) {
    return null;
  }
  const matches = [...price.matchAll(/\d[\d\s]*/g)];
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

export function getWishDonated(contributions, wishId) {
  const entries = contributions[wishId] || [];
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function getWishParticipants(contributions, wishId) {
  const entries = contributions[wishId] || [];
  const totalsByPerson = entries.reduce((acc, entry) => {
    const key = entry.userId ? `id:${entry.userId}` : `name:${entry.name}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        name: entry.name,
        userId: entry.userId || null,
        total: 0
      };
    }
    acc[key].total += entry.amount;
    return acc;
  }, {});

  return Object.values(totalsByPerson).sort((a, b) => b.total - a.total);
}

export function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

export function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseDonationAmount(value) {
  return Number(value.replace(/[^\d.,]/g, "").replace(",", "."));
}

export function getUserDisplayName(user) {
  if (!user) {
    return "";
  }
  return user.isIncognito ? "Инкогнито" : user.name;
}

export function formatDateToDdMmYyyy(storageDate) {
  if (!storageDate || !/^\d{4}-\d{2}-\d{2}$/.test(storageDate)) {
    return "";
  }
  const [year, month, day] = storageDate.split("-");
  return `${day}-${month}-${year}`;
}

export function parseDdMmYyyyToStorageDate(displayDate) {
  if (!displayDate || typeof displayDate !== "string") {
    return null;
  }
  const normalized = displayDate.trim().replace(/\./g, "-").replace(/\//g, "-");
  const match = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toGenitiveFirstName(name) {
  const value = String(name || "").trim();
  if (!value) {
    return "";
  }
  const lower = value.toLowerCase();
  const last = lower.slice(-1);
  const preLast = lower.slice(-2, -1);
  const hushing = "гкхжчшщц";
  if (last === "й" || last === "ь") {
    return `${value.slice(0, -1)}я`;
  }
  if (last === "я") {
    return `${value.slice(0, -1)}и`;
  }
  if (last === "а") {
    const suffix = hushing.includes(preLast) ? "и" : "ы";
    return `${value.slice(0, -1)}${suffix}`;
  }
  if ("бвгджзйклмнпрстфхцчшщ".includes(last)) {
    return `${value}а`;
  }
  return value;
}

export function getProfileFormFromUser(user) {
  if (!user) {
    return emptyProfileForm;
  }
  if (user.firstName || user.lastName) {
    return {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      birthday: formatDateToDdMmYyyy(user.birthday || "")
    };
  }
  const parts = String(user.name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
    birthday: formatDateToDdMmYyyy(user.birthday || "")
  };
}

export function getEventCountdownInfo(dateValue, options = {}) {
  const recurring = options.recurring !== false;
  const storageDate = /^\d{2}-\d{2}-\d{4}$/.test(dateValue || "") ? parseDdMmYyyyToStorageDate(dateValue) : dateValue;

  if (!storageDate || !/^\d{4}-\d{2}-\d{2}$/.test(storageDate)) {
    return { label: "ДД-ММ", remaining: "Осталось --д" };
  }

  const [yearString, monthString, dayString] = storageDate.split("-");
  const month = Number(monthString);
  const day = Number(dayString);
  const year = Number(yearString);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return { label: "ДД-ММ", remaining: "Осталось --д" };
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let nextDate = new Date(year, month - 1, day);

  if (recurring) {
    nextDate = new Date(todayStart.getFullYear(), month - 1, day);
    if (nextDate < todayStart) {
      nextDate = new Date(todayStart.getFullYear() + 1, month - 1, day);
    }
  }

  const diffDays = Math.ceil((nextDate - todayStart) / (1000 * 60 * 60 * 24));
  const label = recurring
    ? new Date(2000, month - 1, day).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })
    : new Date(year, month - 1, day).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  if (!recurring && diffDays < 0) {
    return { label, remaining: "Событие прошло" };
  }

  const safeDays = diffDays < 0 ? 0 : diffDays;
  const mod10 = safeDays % 10;
  const mod100 = safeDays % 100;
  let suffix = "дней";
  if (mod10 === 1 && mod100 !== 11) {
    suffix = "день";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    suffix = "дня";
  }
  const verb = suffix === "день" ? "Остался" : "Осталось";
  return { label, remaining: `${verb} ${safeDays} ${suffix}` };
}

export function getRouteFromHash() {
  if (typeof window === "undefined") {
    return { page: "dashboard", shareToken: null };
  }

  const raw = window.location.hash || "#/";
  if (raw === "#/dashboard" || raw === "#/") {
    return { page: "dashboard", shareToken: null };
  }
  if (raw === "#/wishlist") {
    return { page: "wishlist", shareToken: null };
  }
  const sharedMatch = raw.match(/^#\/shared\/([a-zA-Z0-9_-]+)$/);
  if (sharedMatch) {
    return { page: "shared", shareToken: sharedMatch[1] };
  }
  return { page: "dashboard", shareToken: null };
}

export function createShareToken() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`;
}

export function buildSharedWishlistUrl(shareToken) {
  if (!shareToken || typeof window === "undefined") {
    return "";
  }

  const url = new URL(window.location.href);
  url.hash = `/shared/${shareToken}`;
  return url.toString();
}

export async function copyTextToClipboard(value) {
  if (!value || typeof window === "undefined") {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back to execCommand on non-secure origins like plain HTTP.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}
