import { useState } from "react";

const COOKIE_NOTICE_NAME = "wishlist_cookie_notice";
const COOKIE_NOTICE_MAX_AGE = 180 * 24 * 60 * 60;

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

function setCookieNoticeAccepted() {
  if (typeof document === "undefined") {
    return;
  }

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NOTICE_NAME}=accepted; Path=/; Max-Age=${COOKIE_NOTICE_MAX_AGE}; SameSite=Lax${secureFlag}`;
}

export function CookieNotice({ surface = "landing" }) {
  const [isVisible, setIsVisible] = useState(() => getCookieValue(COOKIE_NOTICE_NAME) !== "accepted");

  if (!isVisible) {
    return null;
  }

  const isShared = surface === "shared";
  const title = isShared ? "Печенька к вашему вишлисту 🍪" : "Тут живут только полезные cookie 🍪";
  const text = isShared
    ? "Только технические cookie: чтобы открыть ссылку, запомнить ваше участие в подарках и не терять прогресс. Без слежки и рекламных трекеров."
    : "Только то, без чего сайт не работает: вход, безопасность и техническая сессия. Никакой рекламы и слежки — честное слово.";

  function acceptNotice() {
    setCookieNoticeAccepted();
    setIsVisible(false);
  }

  return (
    <section className={`cookie-notice cookie-notice-${surface}`} role="region" aria-label="Уведомление о cookie">
      <div className="cookie-notice-copy">
        <strong>{title}</strong>
        <p>{text}</p>
        <p className="cookie-notice-meta">
          Подробности есть в{" "}
          <a href="/privacy-policy" target="_blank" rel="noreferrer">
            политике конфиденциальности
          </a>
          {" "}и{" "}
          <a href="/terms" target="_blank" rel="noreferrer">
            пользовательском соглашении
          </a>
          .
        </p>
      </div>

      <button type="button" className="cookie-notice-button" onClick={acceptNotice}>
        Согласен на печеньки
      </button>
    </section>
  );
}
