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
  { href: "/faq", label: "FAQ" },
  { href: "/privacy-policy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Пользовательское соглашение" }
];

export function AuthPage({
  mode,
  form,
  error,
  submitting,
  currentUser,
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
  const [showRegisterErrors, setShowRegisterErrors] = useState(false);
  const [registerValidationError, setRegisterValidationError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isPrimaryCtaLoading, setIsPrimaryCtaLoading] = useState(false);
  const [giftScene, setGiftScene] = useState({ scrollTop: 0, width: 0, height: 0, offsets: [] });
  const googleCallbackRef = useRef(onGoogleAuth);
  const googleInitializedClientIdRef = useRef("");
  const scrollRef = useRef(null);
  const snapScrollLockRef = useRef(false);
  const snapScrollTimeoutRef = useRef(null);
  const authModalRef = useRef(null);
  const authModalReturnFocusRef = useRef(null);
  const googleSdkPromiseRef = useRef(null);

  useEffect(() => {
    googleCallbackRef.current = onGoogleAuth;
  }, [onGoogleAuth]);

  useEffect(() => {
    if (isLogin || registerStep !== 3 || showRegisterErrors || !error) {
      return;
    }

    onErrorReset?.();
  }, [error, isLogin, onErrorReset, registerStep, showRegisterErrors]);

  function scrollToSection(sectionId) {
    if (typeof document === "undefined") {
      return;
    }

    const section = document.getElementById(sectionId);
    const container = scrollRef.current;
    if (section && container) {
      container.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    }
  }

  function clampValue(min, value, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  function smoothstep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function getGiftBaseMetrics(width, height) {
    const containerWidth = Math.min(1180, width - 40);
    const containerLeft = (width - containerWidth) / 2;

    if (width >= 1440) {
      return {
        containerWidth,
        containerLeft,
        giftWidth: clampValue(460, width * 0.35, 720),
        baseRight: Math.max(0, (width - Math.min(1180, width - 40)) / 2 - 10),
        baseCenterY: height * 0.4
      };
    }

    if (width >= 721 && width <= 1024) {
      return {
        containerWidth,
        containerLeft,
        giftWidth: clampValue(340, width * 0.41, 480),
        baseRight: clampValue(-4, width * 0.008, 8),
        baseCenterY: height * 0.42
      };
    }

    return {
      containerWidth,
      containerLeft,
      giftWidth: clampValue(400, width * 0.39, 650),
      baseRight: Math.max(-10, (width - Math.min(1180, width - 40)) / 2 - 10),
      baseCenterY: height * 0.41
    };
  }

  function getGiftTarget(section, width, height) {
    if (width > 720 && (section === 1 || section === 2)) {
      const { containerWidth, containerLeft, giftWidth, baseRight, baseCenterY } = getGiftBaseMetrics(width, height);
      const safeWidth = clampValue(180, width * 0.2, 320);
      const scale = 1;
      const visualGiftWidth = giftWidth * scale;
      const desiredCenterX =
        section === 1
          ? containerLeft + containerWidth - safeWidth / 2
          : containerLeft + safeWidth / 2 - clampValue(24, width * 0.035, 56);

      return {
        shiftX: desiredCenterX - (width - baseRight - visualGiftWidth / 2),
        shiftY: height / 2 - baseCenterY,
        rotate: 0,
        scale
      };
    }

    if (width > 720 && section === 3) {
      const { containerWidth, containerLeft, giftWidth, baseRight, baseCenterY } = getGiftBaseMetrics(width, height);
      const scale = 1.38;
      const visualGiftWidth = giftWidth * scale;
      const textColumnWidth = Math.min(464, containerWidth * 0.48);
      const gap = clampValue(20, width * 0.03, 48);
      const rightColumnWidth = Math.max(containerWidth - textColumnWidth - gap, 280);
      const opticalOffsetX = Math.min(rightColumnWidth * 0.08, 40);
      const opticalOffsetY = Math.min(giftWidth * (scale - 1) * 0.08, 22);
      const desiredCenterX = containerLeft + textColumnWidth + gap + rightColumnWidth / 2 - opticalOffsetX;

      return {
        shiftX: desiredCenterX - (width - baseRight - visualGiftWidth / 2),
        shiftY: height / 2 - baseCenterY - opticalOffsetY,
        rotate: 0,
        scale
      };
    }

    switch (section) {
      case 1:
        return {
          shiftX: width * 0.11,
          shiftY: -height * 0.075,
          rotate: 0,
          scale: 1
        };
      case 2:
        return {
          shiftX: width * -0.43,
          shiftY: height * 0.12,
          rotate: 0,
          scale: 1
        };
      case 3:
        return {
          shiftX: width * 0.07,
          shiftY: height * 0.09,
          rotate: 0,
          scale: 1.5
        };
      default:
        return {
          shiftX: 0,
          shiftY: 0,
          rotate: 0,
          scale: 1
        };
    }
  }

  function getGiftMotion(scrollTop, width, height, offsets) {
    if (!offsets?.length) {
      return getGiftTarget(0, width, height);
    }

    const lastIndex = offsets.length - 1;
    let currentIndex = lastIndex;

    for (let index = 0; index < lastIndex; index += 1) {
      if (scrollTop < offsets[index + 1]) {
        currentIndex = index;
        break;
      }
    }

    if (currentIndex === lastIndex) {
      return getGiftTarget(lastIndex, width, height);
    }

    const startOffset = offsets[currentIndex];
    const endOffset = offsets[currentIndex + 1];
    const rawProgress = (scrollTop - startOffset) / Math.max(endOffset - startOffset, 1);
    const progress = smoothstep(clampValue(0, rawProgress, 1));
    const from = getGiftTarget(currentIndex, width, height);
    const to = getGiftTarget(currentIndex + 1, width, height);

    return {
      shiftX: lerp(from.shiftX, to.shiftX, progress),
      shiftY: lerp(from.shiftY, to.shiftY, progress),
      rotate: lerp(from.rotate, to.rotate, progress),
      scale: lerp(from.scale, to.scale, progress)
    };
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

  function ensureGoogleSdkLoaded() {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Google SDK недоступен."));
    }

    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    if (googleSdkPromiseRef.current) {
      return googleSdkPromiseRef.current;
    }

    googleSdkPromiseRef.current = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-gsi="true"]');

      function cleanup(script) {
        script?.removeEventListener("load", handleLoad);
        script?.removeEventListener("error", handleError);
      }

      function handleLoad() {
        cleanup(existingScript || script);
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        reject(new Error("Google SDK недоступен."));
      }

      function handleError() {
        cleanup(existingScript || script);
        reject(new Error("Не удалось загрузить Google SDK."));
      }

      const script = existingScript || document.createElement("script");
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (!existingScript) {
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleGsi = "true";
        document.head.appendChild(script);
      }
    }).catch((error) => {
      googleSdkPromiseRef.current = null;
      throw error;
    });

    return googleSdkPromiseRef.current;
  }

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

    ensureGoogleSdkLoaded().then(initializeGoogle).catch(() => {});
    return undefined;
  }, [googleClientId]);

  useEffect(() => {
    if (!isAuthModalOpen || typeof window === "undefined") {
      return undefined;
    }

    authModalReturnFocusRef.current = document.activeElement;

    const focusTarget =
      authModalRef.current?.querySelector('input, button:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])') || null;

    if (focusTarget instanceof HTMLElement) {
      window.setTimeout(() => focusTarget.focus(), 0);
    }

    function handleKeydown(event) {
      if (event.key === "Tab" && authModalRef.current) {
        const focusable = Array.from(
          authModalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
          return;
        }
      }

      if (event.key === "Escape" && !submitting) {
        closeAuthModal();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);

      if (authModalReturnFocusRef.current instanceof HTMLElement) {
        authModalReturnFocusRef.current.focus();
      }
    };
  }, [isAuthModalOpen, submitting]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const sections = Array.from(container.querySelectorAll("[data-snap-section]"));
    if (sections.length === 0) {
      return undefined;
    }

    function updateGiftScene() {
      const scrollTop = container.scrollTop;
      const offsets = sections.map((section) => section.offsetTop);
      setGiftScene((prev) => {
        if (
          prev.scrollTop === scrollTop &&
          prev.width === container.clientWidth &&
          prev.height === container.clientHeight &&
          prev.offsets.length === offsets.length &&
          prev.offsets.every((offset, index) => offset === offsets[index])
        ) {
          return prev;
        }

        return {
          scrollTop,
          width: container.clientWidth,
          height: container.clientHeight,
          offsets
        };
      });
    }

    updateGiftScene();
    container.addEventListener("scroll", updateGiftScene, { passive: true });
    window.addEventListener("resize", updateGiftScene);

    return () => {
      container.removeEventListener("scroll", updateGiftScene);
      window.removeEventListener("resize", updateGiftScene);
    };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function clearSnapScrollLock() {
      if (snapScrollTimeoutRef.current) {
        window.clearTimeout(snapScrollTimeoutRef.current);
      }

      snapScrollLockRef.current = false;
      snapScrollTimeoutRef.current = null;
    }

    function getSectionOffsets() {
      return Array.from(container.querySelectorAll("[data-snap-section]")).map((section) => section.offsetTop);
    }

    function handleWheel(event) {
      if (mediaQuery.matches || reducedMotionQuery.matches) {
        return;
      }

      if (Math.abs(event.deltaY) < 24 || snapScrollLockRef.current) {
        return;
      }

      const offsets = getSectionOffsets();
      if (offsets.length < 2) {
        return;
      }

      const currentTop = container.scrollTop;
      const direction = Math.sign(event.deltaY);
      const threshold = container.clientHeight * 0.18;
      const currentIndex = offsets.findIndex((offset, index) => {
        const nextOffset = offsets[index + 1] ?? Number.POSITIVE_INFINITY;
        return currentTop >= offset - threshold && currentTop < nextOffset - threshold;
      });
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const targetIndex = Math.max(0, Math.min(offsets.length - 1, safeIndex + direction));
      const targetTop = offsets[targetIndex];

      if (targetTop === undefined || Math.abs(targetTop - currentTop) < 8) {
        return;
      }

      event.preventDefault();
      snapScrollLockRef.current = true;
      container.scrollTo({ top: targetTop, behavior: "smooth" });
      snapScrollTimeoutRef.current = window.setTimeout(clearSnapScrollLock, 820);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      clearSnapScrollLock();
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const giftMotion = getGiftMotion(giftScene.scrollTop, giftScene.width, giftScene.height, giftScene.offsets);

  function openYandexAuth() {
    const apiBase = getApiBase();
    const popupUrl = `${apiBase}/api/auth/yandex/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(popupUrl, "wishlist-yandex-auth", "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes");
  }

  async function openGoogleAuth() {
    if (isGoogleSubmitting) {
      return;
    }

    setIsGoogleSubmitting(true);

    try {
      await ensureGoogleSdkLoaded();

      if (!window.google?.accounts?.id) {
        throw new Error("Google SDK недоступен.");
      }

      let isSettled = false;
      const releaseSubmitting = () => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        setIsGoogleSubmitting(false);
      };

      const guardTimeout = window.setTimeout(releaseSubmitting, 12000);

      window.google.accounts.id.prompt((notification) => {
        const noPromptShown =
          notification.isNotDisplayed?.() || notification.isSkippedMoment?.() || notification.isDismissedMoment?.();

        if (noPromptShown) {
          window.clearTimeout(guardTimeout);
          releaseSubmitting();
        }
      });
    } catch {
      setIsGoogleSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    onModeChange(nextMode);
    setRegisterStep(1);
    setShowRegisterErrors(false);
    setRegisterValidationError("");
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

    if (!currentUser) {
      openAuthModal(nextMode);
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
    setShowRegisterErrors(false);
    setRegisterValidationError("");
    if (registerStep === 1) {
      if (!String(form.firstName || "").trim()) {
        setRegisterValidationError("Укажи имя.");
        return;
      }
      setRegisterStep(2);
      return;
    }

    if (registerStep === 2) {
      if (!String(form.birthday || "").trim()) {
        setRegisterValidationError("Укажи дату рождения.");
        return;
      }
      setRegisterStep(3);
    }
  }

  function goToPreviousRegisterStep() {
    setShowRegisterErrors(false);
    setRegisterValidationError("");
    setRegisterStep((prev) => Math.max(1, prev - 1));
  }

  function handleAuthSubmit(event) {
    event?.preventDefault?.();

    if (!isLogin && registerStep < 3) {
      goToNextRegisterStep();
      return;
    }

    if (!isLogin) {
      setShowRegisterErrors(true);
      setRegisterValidationError("");

      const email = String(form.email || "").trim();
      const password = String(form.password || "");
      if (!email || !password) {
        event.preventDefault();
        setRegisterValidationError("Укажи email и пароль.");
        return;
      }
    }

    onSubmit(event);
  }

  function handleRegisterFinalSubmit() {
    setShowRegisterErrors(true);
    setRegisterValidationError("");

    const email = String(form.email || "").trim();
    const password = String(form.password || "");
    if (!email || !password) {
      setRegisterValidationError("Укажи email и пароль.");
      return;
    }

    handleAuthSubmit({ preventDefault() {} });
  }

  function handleAuthInputChange(event) {
    if (!isLogin) {
      setShowRegisterErrors(false);
      setRegisterValidationError("");
    }

    onInputChange(event);
  }

  function updateBirthday(nextValue) {
    setShowRegisterErrors(false);
    setRegisterValidationError("");
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
              onChange={handleAuthInputChange}
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
              onChange={handleAuthInputChange}
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
              onChange={handleAuthInputChange}
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
              onChange={handleAuthInputChange}
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
              onChange={handleAuthInputChange}
            placeholder="Повтори пароль"
            autoComplete="new-password"
          />
        </label>
      </>
    );
  }

  function renderAuthCard(cardMode = mode) {
    const cardIsLogin = cardMode === "login";
    const showOauthBlock = yandexClientId || googleClientId;

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

        <form className="donation-form auth-form" onSubmit={cardIsLogin ? handleAuthSubmit : undefined}>
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
                  onChange={handleAuthInputChange}
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
                  onChange={handleAuthInputChange}
                  placeholder="Минимум 6 символов"
                  autoComplete="current-password"
                />
              </label>
            </>
          )}

          {!cardIsLogin && registerValidationError ? <p className="donation-error">{registerValidationError}</p> : null}
          {cardIsLogin && error ? <p className="donation-error">{error}</p> : null}
          {!cardIsLogin && registerStep === 3 && showRegisterErrors && (registerValidationError || error) ? (
            registerValidationError ? null : <p className="donation-error">{error}</p>
          ) : null}

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
              <button type="button" className="button-primary" onClick={handleRegisterFinalSubmit} disabled={submitting}>
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

          <button type="button" className="auth-dismiss-button" onClick={closeAuthModal} disabled={submitting}>
            Не сейчас
          </button>
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

            <footer className="snap-legal-footer" aria-label="Навигация по служебным страницам">
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
              <button type="button" className="snap-nav-link" onClick={() => handlePrimaryCta("login")}>
                Вход
              </button>
              <button type="button" className="snap-nav-link snap-nav-link-accent" onClick={() => handlePrimaryCta("register")}>
                Регистрация
              </button>
            </div>

            <div className="snap-mobile-nav">
              <button
                type="button"
                className="snap-mobile-nav-toggle"
                aria-label="Вход или переход в аккаунт"
                onClick={() => handlePrimaryCta("login")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Zm0 2.25c-4.07 0-7.5 2.08-7.5 4.55 0 .52.43.95.95.95h13.1c.52 0 .95-.43.95-.95 0-2.47-3.43-4.55-7.5-4.55Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className="snap-hero-image-card"
        aria-hidden="true"
        style={{
          "--gift-shift-x": `${giftMotion.shiftX.toFixed(1)}px`,
          "--gift-shift-y": `${giftMotion.shiftY.toFixed(1)}px`,
          "--gift-rotate": `${giftMotion.rotate.toFixed(2)}deg`,
          "--gift-scale": `${giftMotion.scale.toFixed(3)}`
        }}
      >
        <img
          className="snap-hero-gift-image"
          src="/branding/gift-box.png"
          alt=""
        />
      </div>

      <div className="snap-landing-scroll" ref={scrollRef}>
        <section className="snap-panel snap-panel-hero" id="landing-hero" data-snap-section>
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
              <div className="snap-auth-layout">
                <div className="snap-heading snap-auth-copy">
                  <h2>
                    {seoPage.authTitle === "Желания сбываются чаще, когда ими делятся" ? (
                      <>
                        Желания <span className="snap-accent-word">сбываются</span> чаще, когда ими делятся
                      </>
                    ) : (
                      seoPage.authTitle
                    )}
                  </h2>

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
                <div className="snap-auth-gift-slot" aria-hidden="true" />
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
          <div
            ref={authModalRef}
            className="donation-modal snap-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Вход и регистрация"
            onClick={(event) => event.stopPropagation()}
          >
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
