import { useEffect, useRef, useState } from "react";
import { getApiBase, setAuthToken } from "../../lib/wishlistApi";
import { BirthdayPickerModal } from "../BirthdayPickerModal";

export function AuthPage({
  mode,
  form,
  error,
  submitting,
  onModeChange,
  onErrorReset,
  onInputChange,
  onSubmit,
  onGoogleAuth,
  onYandexAuth
}) {
  const isLogin = mode === "login";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const yandexClientId = import.meta.env.VITE_YANDEX_CLIENT_ID || "";
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [isBirthdayPickerOpen, setIsBirthdayPickerOpen] = useState(false);
  const [hasTriedRegisterSubmit, setHasTriedRegisterSubmit] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleCallbackRef = useRef(onGoogleAuth);
  const googleInitializedClientIdRef = useRef("");

  useEffect(() => {
    googleCallbackRef.current = onGoogleAuth;
  }, [onGoogleAuth]);

  const proofItems = [
    { value: "1 ссылка", label: "чтобы отправить гостям один понятный список" },
    { value: "0 неловких вопросов", label: "не нужно объяснять каждому, что действительно хочется" },
    { value: "Совместные подарки", label: "друзья могут собираться на одну крупную цель" }
  ];

  const featureCards = [
    {
      eyebrow: "Ясно",
      title: "Один аккуратный список вместо хаоса в чате",
      text: "Желания, ссылки, цены и пояснения собраны в одной странице."
    },
    {
      eyebrow: "Гибко",
      title: "Можно собираться на один дорогой подарок",
      text: "Каждый видит прогресс и понимает, сколько уже собрано."
    },
    {
      eyebrow: "Спокойно",
      title: "Правила и нюансы сразу на виду",
      text: "Цвета, форматы, ограничения и другие пожелания не теряются."
    }
  ];

  const workflowSteps = [
    { number: "01", title: "Создаешь событие", text: "День рождения, свадьба, новоселье или свой формат." },
    { number: "02", title: "Добавляешь желания", text: "От конкретных товаров до совместного сбора на одну цель." },
    { number: "03", title: "Делишься ссылкой", text: "Гости сразу понимают, что дарить и во что можно скинуться." }
  ];

  const eventCards = [
    { title: "День рождения", text: "Удобно обновлять список каждый год и не повторяться в чатах." },
    { title: "Свадьба", text: "Можно собирать подарки, сертификаты и вклады в общую цель." },
    { title: "Новоселье", text: "Легко разложить желания по комнатам, бюджету и приоритету." }
  ];

  const authBenefits = [
    "Сразу после входа можно создать первый вишлист.",
    "Для каждого события формируется отдельная ссылка.",
    "Гостям не нужен аккаунт, чтобы открыть публичную страницу."
  ];

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

    const scrollY = window.scrollY;
    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
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
      <section className="auth-card landing-auth-card">
        <p className="landing-auth-kicker">{cardIsLogin ? "Вход" : "Регистрация"}</p>
        <h3 className="landing-auth-title">
          {cardIsLogin ? "Вернуться к своим спискам" : "Создать аккаунт"}
        </h3>
        <p className="auth-subtitle landing-auth-subtitle">
          {cardIsLogin
            ? "Открой свои вишлисты и продолжай делиться ими с друзьями."
            : "Создай аккаунт, чтобы собрать желания и получить персональную ссылку."}
        </p>

        <div className="auth-switch landing-auth-switch">
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

          {error && (isLogin || hasTriedRegisterSubmit) ? <p className="donation-error">{error}</p> : null}

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

              <p className="auth-oauth-label">Войти с помощью</p>
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
                    {isGoogleSubmitting ? null : <span>Войти через Google</span>}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </form>
      </section>
    );
  }

  return (
    <div className="page-shell auth-shell landing-shell">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout landing-layout">
        <header className="landing-nav">
          <div className="landing-brand">
            <span className="landing-brand-mark">W</span>
            <div>
              <strong>Wishlist</strong>
              <span>умный вишлист для событий</span>
            </div>
          </div>

          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection("landing-benefits")}>
              Преимущества
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection("landing-flow")}>
              Как это работает
            </button>
            <button type="button" className="button-primary landing-nav-cta" onClick={() => openAuthModal("login")}>
              Создать вишлист
            </button>
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1 className="landing-title">Подарки без догадок. Вишлист, которым удобно делиться.</h1>
            <p className="landing-subtitle">
              Собери желания в красивой странице, отправь гостям одну ссылку и закрой вопрос с подарками без хаоса,
              переписок и случайных покупок.
            </p>

            <div className="landing-hero-actions">
              <button type="button" className="button-primary" onClick={() => openAuthModal("login")}>
                Начать бесплатно
              </button>
              <button type="button" className="button-secondary landing-secondary-action" onClick={() => scrollToSection("landing-flow")}>
                Посмотреть сценарий
              </button>
            </div>

            <div className="landing-proof-grid">
              {proofItems.map((item) => (
                <article className="landing-proof-card" key={item.value}>
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-showcase">
              <div className="landing-showcase-top">
                <span className="landing-showcase-chip">wishlist</span>
                <span className="landing-showcase-status">ссылка готова к отправке</span>
              </div>

              <div className="landing-showcase-grid">
                <div className="landing-showcase-main">
                  <div className="landing-showcase-heading">
                    <span>Wishlist</span>
                    <strong>День рождения 2026</strong>
                    <p>Аккуратный список желаний с возможностью собрать подарок вместе.</p>
                  </div>

                  <div className="landing-showcase-list">
                    <article className="landing-wish-preview">
                      <div className="landing-wish-preview-top">
                        <span>Техника</span>
                        <span>29 900 руб.</span>
                      </div>
                      <strong>Наушники Sony XM5</strong>
                      <p>Можно скинуться компанией, чтобы закрыть один сильный подарок.</p>
                      <div className="landing-preview-progress">
                        <span style={{ width: "64%" }} />
                      </div>
                    </article>

                    <article className="landing-wish-preview landing-wish-preview-soft">
                      <div className="landing-wish-preview-top">
                        <span>Дом</span>
                        <span>6 500 руб.</span>
                      </div>
                      <strong>Настольная лампа</strong>
                      <p>Конкретная вещь со ссылкой, чтобы никто не покупал похожее наугад.</p>
                      <div className="landing-preview-progress">
                        <span style={{ width: "34%" }} />
                      </div>
                    </article>
                  </div>
                </div>

                <div className="landing-showcase-side">
                  <article className="landing-side-card">
                    <span>Совместный сбор</span>
                    <strong>7 друзей уже участвуют</strong>
                    <p>Каждый видит прогресс и понимает, что еще актуально.</p>
                  </article>

                  <article className="landing-side-card landing-side-card-accent">
                    <span>Пожелания</span>
                    <strong>Цвета, форматы, нюансы</strong>
                    <p>Никаких лишних вопросов. Контекст уже встроен в страницу.</p>
                  </article>
                </div>
              </div>
            </div>

            <div className="landing-floating-card landing-floating-card-top">
              <span>Что подарить?</span>
              <strong>Теперь ответ всегда один: открой ссылку</strong>
            </div>

            <div className="landing-floating-card landing-floating-card-bottom">
              <span>Гости не теряются</span>
              <strong>Видят список, бюджет и приоритет прямо с первого экрана</strong>
            </div>
          </div>
        </section>

        <section className="landing-section" id="landing-benefits">
          <div className="section-head landing-section-head">
            <p className="section-label">Преимущества</p>
            <h2>Все, что нужно для подарков без неловких переписок</h2>
            <p>Один аккуратный вишлист помогает сразу показать, что хочется и как лучше подарить.</p>
          </div>

          <div className="landing-feature-grid">
            {featureCards.map((card) => (
              <article className="landing-feature-card" key={card.title}>
                <span className="landing-feature-eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-flow" id="landing-flow">
          <div className="landing-flow-card">
            <div className="section-head compact landing-section-head">
              <p className="section-label">Как это работает</p>
              <h2>Простой путь от идеи до готовой ссылки</h2>
            </div>

            <div className="landing-step-list">
              {workflowSteps.map((step) => (
                <article className="landing-step-card" key={step.number}>
                  <span className="landing-step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="landing-events-card">
            <p className="section-label">Сценарии</p>
            <h2>Подходит не только для дня рождения</h2>

            <div className="landing-event-list">
              {eventCards.map((card) => (
                <article className="landing-event-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="landing-auth-section" id="landing-auth">
          <div className="landing-auth-copy">
            <p className="section-label">Запуск за минуту</p>
            <h2>Создай первый вишлист и сразу отправь его гостям</h2>
            <p>Регистрация короткая, а публичная страница готова сразу после первого списка.</p>

            <div className="landing-auth-benefits">
              {authBenefits.map((benefit) => (
                <div className="landing-auth-benefit" key={benefit}>
                  <span>+</span>
                  <p>{benefit}</p>
                </div>
              ))}
            </div>

            <div className="landing-auth-cta-row">
              <button type="button" className="button-primary" onClick={() => openAuthModal("login")}>
                Создать аккаунт
              </button>
              <button type="button" className="button-secondary landing-auth-cta-secondary" onClick={() => openAuthModal("login")}>
                Уже есть аккаунт
              </button>
            </div>
          </div>
        </section>
      </main>

      {isAuthModalOpen ? (
        <div className="donation-modal-backdrop auth-modal-backdrop" onClick={closeAuthModal}>
          <div className="donation-modal auth-landing-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-modal-close" aria-label="Закрыть окно входа" onClick={closeAuthModal} disabled={submitting}>
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
