export function AuthPage({
  mode,
  form,
  error,
  submitting,
  onModeChange,
  onInputChange,
  onSubmit
}) {
  const isLogin = mode === "login";
  const proofItems = [
    { value: "1 ссылка", label: "чтобы отправить всем гостям один понятный список" },
    { value: "0 неловких вопросов", label: "больше не нужно отвечать каждому по отдельности" },
    { value: "Совместные подарки", label: "друзья могут закрывать дорогие желания вместе" }
  ];
  const featureCards = [
    {
      eyebrow: "Ясно",
      title: "Понятный список вместо хаоса в чате",
      text: "Желания, категории, цены и ссылки собраны в одном аккуратном экране."
    },
    {
      eyebrow: "Гибко",
      title: "Можно собираться на один крупный подарок",
      text: "Каждый участник видит прогресс и понимает, сколько уже собрано."
    },
    {
      eyebrow: "Спокойно",
      title: "Пожелания и правила сразу на виду",
      text: "Укажи цвета, формат подарка и любые нюансы, чтобы друзья не гадали."
    }
  ];
  const workflowSteps = [
    {
      number: "01",
      title: "Создаешь событие",
      text: "День рождения, свадьба, новоселье или свой формат за пару кликов."
    },
    {
      number: "02",
      title: "Добавляешь желания",
      text: "От конкретных товаров до вкладов в крупную цель или мечту."
    },
    {
      number: "03",
      title: "Делишься ссылкой",
      text: "Гости сразу видят, что уместно подарить и во что можно скинуться."
    }
  ];
  const eventCards = [
    {
      title: "День рождения",
      text: "Список на каждый год, без повторяющихся вопросов от друзей и коллег."
    },
    {
      title: "Свадьба",
      text: "Удобно собирать подарки, сертификаты и вклады в более крупные цели."
    },
    {
      title: "Новоселье",
      text: "Легко разложить желания по комнатам, бюджету и степени необходимости."
    }
  ];
  const authBenefits = [
    "Сразу после входа можно создать первый вишлист.",
    "Для каждого события создается отдельная ссылка.",
    "Заполнить список и поделиться им можно без лишних шагов."
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

  function focusAuth(nextMode) {
    onModeChange(nextMode);
    scrollToSection("landing-auth");
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
            <button type="button" className="button-primary landing-nav-cta" onClick={() => focusAuth("register")}>
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
              <button type="button" className="button-primary" onClick={() => focusAuth("register")}>
                Начать бесплатно
              </button>
              <button
                type="button"
                className="button-secondary landing-secondary-action"
                onClick={() => scrollToSection("landing-flow")}
              >
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
            <p>
              Один аккуратный вишлист помогает сразу показать, что хочется, на что можно скинуться вместе и какой
              подарок точно будет уместен.
            </p>
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
            <p>
              Зарегистрируйся, добавь желания и получи аккуратную страницу, которую можно сразу отправить друзьям и
              близким.
            </p>

            <div className="landing-auth-benefits">
              {authBenefits.map((benefit) => (
                <div className="landing-auth-benefit" key={benefit}>
                  <span>+</span>
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="auth-card landing-auth-card">
            <p className="landing-auth-kicker">{isLogin ? "Вход" : "Регистрация"}</p>
            <h3 className="landing-auth-title">{isLogin ? "Вернуться к своим спискам" : "Запустить первый вишлист"}</h3>
            <p className="auth-subtitle landing-auth-subtitle">
              {isLogin
                ? "Открой свои вишлисты и продолжай делиться ими с друзьями."
                : "Создай аккаунт, чтобы собрать желания и получить персональную ссылку."}
            </p>

            <div className="auth-switch landing-auth-switch">
              <button type="button" className={isLogin ? "button-primary" : "button-secondary"} onClick={() => onModeChange("login")}>
                Вход
              </button>
              <button type="button" className={!isLogin ? "button-primary" : "button-secondary"} onClick={() => onModeChange("register")}>
                Регистрация
              </button>
            </div>

            <form className="donation-form auth-form" onSubmit={onSubmit}>
              {!isLogin ? (
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

                  <label>
                    Дата рождения
                    <input
                      type="text"
                      name="birthday"
                      value={form.birthday}
                      onChange={onInputChange}
                      placeholder="ДД-ММ-ГГГГ"
                      autoComplete="bday"
                    />
                  </label>
                </>
              ) : null}

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
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </label>

              {!isLogin ? (
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
              ) : null}

              {error ? <p className="donation-error">{error}</p> : null}

              <div className="donation-actions">
                <button type="submit" className="button-primary" disabled={submitting}>
                  {submitting ? "Подождите..." : isLogin ? "Войти" : "Создать аккаунт"}
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}
