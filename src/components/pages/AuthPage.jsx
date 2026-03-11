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

  return (
    <div className="page-shell auth-shell">
      <div className="glow glow-left" />
      <div className="glow glow-right" />

      <main className="layout auth-layout">
        <section className="auth-card">
          <h1 className="auth-title">{isLogin ? "Вход в аккаунт" : "Регистрация"}</h1>
          <p className="auth-subtitle">Для доступа к списку подарков авторизуйтесь.</p>

          <div className="auth-switch">
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
      </main>
    </div>
  );
}
