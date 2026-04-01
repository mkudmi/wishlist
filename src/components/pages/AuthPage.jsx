import { useEffect, useRef, useState } from "react";
import { seoLandingPages } from "../../config/seoPages";
import { getApiBase, setAuthToken } from "../../lib/wishlistApi";
import { BirthdayPickerModal } from "../BirthdayPickerModal";

const featureList = [
  "Не стесняйся добавлять в вишлист дорогой подарок.",
  "Друзья могут участвовать не поровну, а на комфортную для себя сумму.",
  "Избавь друзей от нервотрепки и бесконечных чатов."
];

const flowSteps = [
  { number: "01", text: "Создай вишлист с самыми желанными подарками" },
  { number: "02", text: "Отправь ссылку своим самым близким людям" },
  { number: "03", text: "Получи то, что действительно хочешь" }
];

const legalLinks = [
  { href: "/privacy-policy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Пользовательское соглашение" }
];

export function AuthPage({
  mode,
  form,
  error,
  submitting,
  currentUser = null,
  onModeChange,
  onErrorReset,
  onInputChange,
  onSubmit,
  onGoogleAuth,
  onYandexAuth,
  onContinueAuthenticated,
  seoPage = seoLandingPages[0]
}) {
  const isLogin = mode === "login";
  const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
  const yandexClientId = import.meta.env?.VITE_YANDEX_CLIENT_ID || "";
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [isBirthdayPickerOpen, setIsBirthdayPickerOpen] = useState(false);
  const [hasTriedRegisterSubmit, setHasTriedRegisterSubmit] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isPrimaryCtaLoading, setIsPrimaryCtaLoading] = useState(false);
  const googleCallbackRef = useRef(onGoogleAuth);
  const googleInitializedClientIdRef = useRef("");
  const scrollRef = useRef(null);
  const snapLockRef = useRef(false);
  const heroSectionRef = useRef(null);
  const giftCardRef = useRef(null);

  useEffect(() => {
    googleCallbackRef.current = onGoogleAuth;
  }, [onGoogleAuth]);

  function scrollToSection(sectionId) {
    if (typeof document === "undefined") {
      return;
    }

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    async function handleMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (payload?.type !== "wishlist:yandex-auth-result") {
        return;
      }

      if (payload.token) {
        setAuthToken(payload.token);
        await onYandexAuth(payload.token);
        return;
      }

      if (payload.error) {
        onModeChange("login");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onModeChange, onYandexAuth]);

  useEffect(() => {
    if (mode === "login") {
      setRegisterStep(1);
    }
  }, [mode, isAuthModalOpen]);

  useEffect(() => {
    if (typeof document === "undefined" || !isAuthModalOpen) {
      return undefined;
    }

    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (!googleClientId || typeof window === "undefined") {
      return undefined;
    }

    function initializeGoogle() {
      if (!window.google?.accounts?.id) {
        return;
      }

      if (googleInitializedClientIdRef.current === googleClientId) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            if (response?.credential) {
              await googleCallbackRef.current(response.credential);
            }
          } finally {
            setIsGoogleSubmitting(false);
          }
        }
      });

      googleInitializedClientIdRef.current = googleClientId;
    }

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return undefined;
    }

    const existingScript = document.querySelector('script[data-google-gsi="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.addEventListener("load", initializeGoogle, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener("load", initializeGoogle);
  }, [googleClientId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const sections = Array.from(container.querySelectorAll("[data-snap-section]"));
    if (sections.length === 0) {
      return undefined;
    }

    function handleWheel(event) {
      if (snapLockRef.current || isAuthModalOpen) {
        event.preventDefault();
        return;
      }

      const threshold = 18;
      if (Math.abs(event.deltaY) < threshold) {
        return;
      }

      event.preventDefault();

      const currentIndex = sections.reduce(
        (bestMatch, section, index) => {
          const distance = Math.abs(section.offsetTop - container.scrollTop);
          if (distance < bestMatch.distance) {
            return { index, distance };
          }
          return bestMatch;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY }
      ).index;
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));

      if (nextIndex === currentIndex) {
        return;
      }

      snapLockRef.current = true;
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        snapLockRef.current = false;
      }, 700);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isAuthModalOpen]);

  useEffect(() => {
    const container = scrollRef.current;
    const heroSection = heroSectionRef.current;
    if (!container || !heroSection || typeof window === "undefined") {
      return undefined;
    }

    let animationFrame = 0;

    function updateGiftMotion() {
      animationFrame = 0;
      const giftCard = giftCardRef.current;
      if (!giftCard) {
        return;
      }

      const heroHeight = Math.max(heroSection.offsetHeight, 1);
      const rawProgress = Math.min(Math.max(container.scrollTop / heroHeight, 0), 3);
      const phaseOneProgress = Math.min(rawProgress, 1);
      const phaseTwoProgress = Math.min(Math.max(rawProgress - 1, 0), 1);
      const phaseThreeProgress = Math.min(Math.max(rawProgress - 2, 0), 1);
      const easedPhaseOne = phaseOneProgress * phaseOneProgress * (3 - 2 * phaseOneProgress);
      const easedPhaseTwo = phaseTwoProgress * phaseTwoProgress * (3 - 2 * phaseTwoProgress);
      const easedPhaseThree = phaseThreeProgress * phaseThreeProgress * (3 - 2 * phaseThreeProgress);
      const shiftX =
        container.clientWidth *
        (0.11 * easedPhaseOne - 0.54 * easedPhaseTwo + 0.5 * easedPhaseThree);
      const requestedShiftY =
        -container.clientHeight * (0.015 * easedPhaseOne + 0.06 * easedPhaseOne * easedPhaseOne) +
        container.clientHeight * (0.035 * easedPhaseTwo + 0.16 * easedPhaseTwo * easedPhaseTwo) -
        container.clientHeight * 0.03 * easedPhaseThree;
      const rotation = 10 * easedPhaseOne - 8 * easedPhaseTwo + 6 * easedPhaseThree;
      const scale = 1 + 0.05 * easedPhaseOne + 0.08 * easedPhaseTwo - 0.03 * easedPhaseThree;
      const computedStyles = window.getComputedStyle(giftCard);
      const fixedTop = Number.parseFloat(computedStyles.top) || 0;
      const translatePercent = Number.parseFloat(
        computedStyles.getPropertyValue("--gift-base-translate-y")
      ) || 0;
      const baseTranslatePx = (translatePercent / 100) * giftCard.offsetHeight;
      const headerElement = document.querySelector(".snap-fixed-header");
      const safeTop = (headerElement?.getBoundingClientRect().bottom || 0) + 20;
      const minShiftY = safeTop - (fixedTop + baseTranslatePx);
      const shiftY = requestedShiftY < 0 ? Math.max(requestedShiftY, minShiftY) : requestedShiftY;

      container.style.setProperty("--gift-shift-x", `${shiftX.toFixed(1)}px`);
      container.style.setProperty("--gift-shift-y", `${shiftY.toFixed(1)}px`);
      container.style.setProperty("--gift-rotate", `${rotation.toFixed(2)}deg`);
      container.style.setProperty("--gift-scale", scale.toFixed(3));
    }

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateGiftMotion);
    }

    updateGiftMotion();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  function openYandexAuth() {
    const apiBase = getApiBase();
    const popupUrl = `${apiBase}/api/auth/yandex/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(popupUrl, "wishlist-yandex-auth", "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes");
  }

  function openGoogleAuth() {
    if (!window.google?.accounts?.id) {
      return;
    }

    setIsGoogleSubmitting(true);
    window.google.accounts.id.prompt((notification) => {
      const noPromptShown =
        notification.isNotDisplayed?.() || notification.isSkippedMoment?.() || notification.isDismissedMoment?.();

      if (noPromptShown) {
        setIsGoogleSubmitting(false);
      }
    });
  }

  function switchMode(nextMode) {
    onModeChange(nextMode);
    setRegisterStep(1);
    setHasTriedRegisterSubmit(false);
  }

  function openAuthModal(nextMode) {
    switchMode(nextMode);
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    if (submitting) {
      return;
    }
    setIsAuthModalOpen(false);
  }

  async function handlePrimaryCta(nextMode = "login") {
    if (isPrimaryCtaLoading) {
      return;
    }

    setIsPrimaryCtaLoading(true);

    try {
      const shouldContinue = await onContinueAuthenticated?.();
      if (shouldContinue) {
        return;
      }

      openAuthModal(nextMode);
    } finally {
      setIsPrimaryCtaLoading(false);
    }
  }

  function goToNextRegisterStep() {
    setHasTriedRegisterSubmit(false);
    if (registerStep === 1) {
      if (!String(form.firstName || "").trim() || !String(form.lastName || "").trim()) {
        return;
      }
      setRegisterStep(2);
      return;
    }

    if (registerStep === 2) {
      if (!String(form.birthday || "").trim()) {
        return;
      }
      setRegisterStep(3);
    }
  }

  function goToPreviousRegisterStep() {
    setHasTriedRegisterSubmit(false);
    setRegisterStep((prev) => Math.max(1, prev - 1));
  }

  function handleAuthSubmit(event) {
    if (!isLogin && registerStep < 3) {
      event.preventDefault();
      goToNextRegisterStep();
      return;
    }

    if (!isLogin) {
      setHasTriedRegisterSubmit(true);
    }

    onSubmit(event);
  }

  function updateBirthday(nextValue) {
    onInputChange({ target: { name: "birthday", value: nextValue } });
  }

  function renderRegisterFields() {
    if (registerStep === 1) {
      return (
        <>
          <label>
            Имя
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={onInputChange}
              placeholder="Имя"
              autoComplete="given-name"
            />
          </label>

          <label>
            Фамилия
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={onInputChange}
              placeholder="Фамилия"
              autoComplete="family-name"
            />
          </label>
        </>
      );
    }

    if (registerStep === 2) {
      return (
        <label>
          Дата рождения
          <input
            type="text"
            name="birthday"
            value={form.birthday}
            onClick={() => {
              onErrorReset?.();
              setIsBirthdayPickerOpen(true);
            }}
            onFocus={() => {
              onErrorReset?.();
              setIsBirthdayPickerOpen(true);
            }}
            placeholder="ДД-ММ-ГГГГ"
            autoComplete="bday"
            readOnly
            className="birthday-picker-trigger"
          />
        </label>
      );
    }

    return (
      <>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onInputChange}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onInputChange}
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
          />
        </label>

        <label>
          Подтверждение пароля
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={onInputChange}
            placeholder="Повтори пароль"
            autoComplete="new-password"
          />
        </label>
      </>
    );
  }

  function renderAuthCard(cardMode = mode) {
    const cardIsLogin = cardMode === "login";
    const showOauthBlock = cardIsLogin && (yandexClientId || googleClientId);

    return (
      <section className="auth-card snap-auth-card">
        <p className="snap-auth-kicker">{cardIsLogin ? "Вход" : "Регистрация"}</p>
        <h3 className="snap-auth-title">{cardIsLogin ? "Вернуться к своим спискам" : "Создать аккаунт"}</h3>
        <p className="auth-subtitle snap-auth-subtitle">
          {cardIsLogin
            ? "Открой свои вишлисты и продолжай делиться ими с друзьями."
            : "Создай аккаунт, чтобы собирать желания и получать отдельные ссылки на события."}
        </p>

        <div className="auth-switch snap-auth-switch">
          <button type="button" className={cardIsLogin ? "button-primary" : "button-secondary"} onClick={() => switchMode("login")}>
            Вход
          </button>
          <button type="button" className={!cardIsLogin ? "button-primary" : "button-secondary"} onClick={() => switchMode("register")}>
            Регистрация
          </button>
        </div>

        <form className="donation-form auth-form" onSubmit={handleAuthSubmit}>
          {!cardIsLogin ? (
            <>
              <div className="auth-register-progress" aria-label={`Шаг ${registerStep} из 3`}>
                <span className={registerStep >= 1 ? "is-active" : ""} />
                <span className={registerStep >= 2 ? "is-active" : ""} />
                <span className={registerStep >= 3 ? "is-active" : ""} />
              </div>

              <p className="auth-register-step-label">Шаг {registerStep} из 3</p>
              {renderRegisterFields()}
            </>
          ) : (
            <>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onInputChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Пароль
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onInputChange}
                  placeholder="Минимум 6 символов"
                  autoComplete="current-password"
                />
              </label>
            </>
          )}

          {error && (cardIsLogin || hasTriedRegisterSubmit) ? <p className="donation-error">{error}</p> : null}

          <div className={`donation-actions${cardIsLogin ? " auth-login-actions" : " auth-register-actions"}`}>
            {!cardIsLogin && registerStep > 1 ? (
              <button type="button" className="button-secondary auth-register-nav-button" onClick={goToPreviousRegisterStep} disabled={submitting}>
                Назад
              </button>
            ) : null}

            {cardIsLogin ? (
              <button type="submit" className="button-primary" disabled={submitting}>
                {submitting ? "Подождите..." : "Войти"}
              </button>
            ) : registerStep < 3 ? (
              <button type="button" className="button-primary" onClick={goToNextRegisterStep} disabled={submitting}>
                Далее
              </button>
            ) : (
              <button type="submit" className="button-primary" disabled={submitting}>
                {submitting ? "Подождите..." : "Создать аккаунт"}
              </button>
            )}
          </div>

          {showOauthBlock ? (
            <>
              <div className="auth-divider auth-divider-after-submit" aria-hidden="true" />

              <p className="auth-oauth-label">Быстрый вход</p>
              <div className="auth-oauth-row">
                {yandexClientId ? (
                  <button type="button" className="button-secondary auth-oauth-button auth-yandex-button" onClick={openYandexAuth}>
                    <span className="auth-yandex-logo" aria-hidden="true">
                      Я
                    </span>
                    <span>Яндекс</span>
                  </button>
                ) : null}

                {googleClientId ? (
                  <button
                    type="button"
                    className="button-secondary auth-oauth-button auth-google-custom-button"
                    onClick={openGoogleAuth}
                    disabled={isGoogleSubmitting}
                    aria-label={isGoogleSubmitting ? "Google авторизация загружается" : "Войти через Google"}
                  >
                    {isGoogleSubmitting ? (
                      <span className="auth-button-spinner" aria-hidden="true" />
                    ) : (
                      <svg className="auth-google-logo" viewBox="0 0 18 18" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2087 1.125-.8427 2.0782-1.796 2.7164v2.2582h2.9087c1.7018-1.5668 2.6837-3.8741 2.6837-6.6155z"
                        />
                        <path
                          fill="#34A853"
                          d="M9 18c2.43 0 4.4673-.8059 5.9563-2.1791l-2.9087-2.2582c-.806.54-1.8369.8591-3.0476.8591-2.3441 0-4.3282-1.5832-5.0364-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M3.9636 10.7105C3.7832 10.1705 3.6818 9.5932 3.6818 9s.1014-1.1705.2818-1.7105V4.9577H.9573C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9573 4.0423l3.0063-2.3318z"
                        />
                        <path
                          fill="#EA4335"
                          d="M9 3.5782c1.3214 0 2.5077.4541 3.4405 1.3459l2.5809-2.5809C13.4632.8918 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9577l3.0063 2.3318C4.6718 5.1614 6.6559 3.5782 9 3.5782z"
                        />
                      </svg>
                    )}
                    {isGoogleSubmitting ? null : <span>Google</span>}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </form>
      </section>
    );
  }

  function renderLegalPage() {
    return (
      <div className="page-shell auth-shell snap-landing-shell snap-legal-shell">
        <div className="snap-landing-bg snap-landing-bg-left" />
        <div className="snap-landing-bg snap-landing-bg-right" />

        <header className="snap-fixed-header">
          <div className="snap-fixed-header-inner">
            <a className="snap-brand" href="/">
              <div>
                <strong>Список желаний</strong>
              </div>
            </a>

            <div className="snap-nav snap-nav-desktop">
              <a className="snap-nav-link" href="/">
                На главную
              </a>
              <a className="snap-nav-link snap-nav-link-accent" href="/">
                Создать вишлист
              </a>
            </div>
          </div>
        </header>

        <main className="snap-legal-main">
          <section className="snap-legal-card">
            <p className="snap-legal-kicker">{seoPage.navLabel}</p>
            <h1 className="snap-legal-title">{seoPage.documentTitle || seoPage.title}</h1>
            {seoPage.documentUpdatedAt ? <p className="snap-legal-updated">{seoPage.documentUpdatedAt}</p> : null}
            {seoPage.documentLead ? <p className="snap-legal-lead">{seoPage.documentLead}</p> : null}

            <div className="snap-legal-sections">
              {(seoPage.documentSections || []).map((section) => (
                <section className="snap-legal-section" key={section.title}>
                  <h2>{section.title}</h2>
                  {(section.paragraphs || []).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.list?.length ? (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (seoPage.layout === "legal") {
    return renderLegalPage();
  }

  return (
      <div className="page-shell auth-shell snap-landing-shell">
      <div className="snap-landing-bg snap-landing-bg-left" />
      <div className="snap-landing-bg snap-landing-bg-right" />

      <header className="snap-fixed-header">
        <div className="snap-fixed-header-inner">
          <button type="button" className="snap-brand" onClick={() => scrollToSection("landing-hero")}>
            <div>
              <strong>Список желаний</strong>
            </div>
          </button>

          <div className="snap-nav">
            <div className="snap-nav-desktop">
              <button type="button" className="snap-nav-link" onClick={() => openAuthModal("login")}>
                Вход
              </button>
              <button type="button" className="snap-nav-link snap-nav-link-accent" onClick={() => openAuthModal("register")}>
                Регистрация
              </button>
            </div>

            <div className="snap-mobile-nav">
              <button
                type="button"
                className="snap-mobile-nav-toggle"
                aria-label="Open login modal"
                onClick={() => openAuthModal("login")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Zm0 2.25c-4.07 0-7.5 2.08-7.5 4.55 0 .52.43.95.95.95h13.1c.52 0 .95-.43.95-.95 0-2.47-3.43-4.55-7.5-4.55Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="snap-landing-scroll" ref={scrollRef}>
        <section className="snap-panel snap-panel-hero" id="landing-hero" data-snap-section ref={heroSectionRef}>
          <div className="snap-panel-inner snap-hero-simple">
            <div className="snap-copy">
              <h1 className="snap-title">Если ты сюда зашел, значит у тебя скоро праздник!</h1>

              <div className="snap-actions">
                <button
                  type="button"
                  className={`button-primary${isPrimaryCtaLoading ? " landing-cta-loading" : ""}`}
                  onClick={() => handlePrimaryCta("login")}
                  disabled={isPrimaryCtaLoading}
                >
                  Создать вишлист
                </button>
              </div>
            </div>

            <div className="snap-hero-image-card" aria-hidden="true" ref={giftCardRef}>
              <img
                className="snap-hero-gift-image"
                src="/branding/gift-box.png"
                alt=""
              />
            </div>
            <p className="snap-hero-side-note">А мы поможем тебе ответить на вопрос "Что подарить?"</p>
          </div>
        </section>

        <section className="snap-panel snap-panel-benefits" id="landing-benefits" data-snap-section>
          <div className="snap-panel-inner snap-panel-grid snap-panel-grid-gift-safe">
            <div className="snap-heading">
              <h2>
                Дорогой подарок можно собрать <span className="snap-accent-word">вместе</span>
              </h2>
            </div>

            <div className="snap-feature-list">
              {featureList.map((item, index) => (
                <article className="snap-feature-card" key={item}>
                  <strong>0{index + 1}</strong>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="snap-panel snap-panel-flow" id="landing-flow" data-snap-section>
          <div className="snap-panel-inner snap-panel-grid snap-panel-grid-gift-safe snap-panel-grid-gift-safe-mirror">
            <div className="snap-step-list">
              {flowSteps.map((step) => (
                <article className="snap-step-card" key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="snap-flow-side">
              <h2 className="snap-flow-gift-title">
                Твой путь от <span className="snap-accent-word">желания</span> до подарка
              </h2>
            </div>
          </div>
        </section>

        <section className="snap-panel snap-panel-auth" id="landing-auth" data-snap-section>
          <div className="snap-panel-inner snap-auth-panel">
            <div className="snap-auth-stage">
              <div className="snap-heading snap-auth-copy">
                <h2>{seoPage.authTitle}</h2>

                <div className="snap-actions">
                  <button
                    type="button"
                    className={`button-primary${isPrimaryCtaLoading ? " landing-cta-loading" : ""}`}
                    onClick={() => handlePrimaryCta("register")}
                    disabled={isPrimaryCtaLoading}
                  >
                    {seoPage.authText || "Создать вишлист"}
                  </button>
                </div>
              </div>
            </div>

            <footer className="snap-legal-footer" aria-label="Юридическая информация">
              <div className="snap-legal-footer-brand">
                <strong>Список желаний</strong>
              </div>
              <nav className="snap-legal-footer-links">
                {legalLinks.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </footer>
          </div>
        </section>
      </div>

      {isAuthModalOpen ? (
        <div className="donation-modal-backdrop auth-modal-backdrop snap-auth-backdrop" onClick={closeAuthModal}>
          <div className="donation-modal snap-auth-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-modal-close snap-auth-close" aria-label="Закрыть окно входа" onClick={closeAuthModal} disabled={submitting}>
              x
            </button>
            {renderAuthCard(mode)}
          </div>
        </div>
      ) : null}

      <BirthdayPickerModal
        isOpen={isBirthdayPickerOpen}
        value={form.birthday}
        onClose={() => setIsBirthdayPickerOpen(false)}
        onConfirm={(nextValue) => {
          onErrorReset?.();
          updateBirthday(nextValue);
          setIsBirthdayPickerOpen(false);
        }}
      />
    </div>
  );
}
