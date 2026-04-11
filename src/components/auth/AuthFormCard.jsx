import { useEffect, useState } from "react";
import { BirthdayPickerModal } from "../BirthdayPickerModal";

export function AuthFormCard({
  mode,
  form,
  error,
  submitting,
  isOpen,
  googleClientId,
  yandexClientId,
  googleButtonRef,
  onModeChange,
  onErrorReset,
  onInputChange,
  onSubmit,
  onOpenYandexAuth,
  onClose
}) {
  const googleIconSrc = "/branding/auth-icons/google.ico";
  const yandexIconSrc = "/branding/auth-icons/yandex.ico";
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isPasswordChange = mode === "password-change";
  const [registerStep, setRegisterStep] = useState(1);
  const [isBirthdayPickerOpen, setIsBirthdayPickerOpen] = useState(false);
  const [showRegisterErrors, setShowRegisterErrors] = useState(false);
  const [registerValidationError, setRegisterValidationError] = useState("");

  useEffect(() => {
    if (!isRegister || registerStep !== 3 || showRegisterErrors || !error) {
      return;
    }

    onErrorReset?.();
  }, [error, isRegister, onErrorReset, registerStep, showRegisterErrors]);

  useEffect(() => {
    if (isOpen) {
      setRegisterStep(1);
      setShowRegisterErrors(false);
      setRegisterValidationError("");
      return;
    }

    if (!isRegister) {
      setRegisterStep(1);
    }
  }, [isOpen, isRegister]);

  function resetRegisterValidation() {
    setShowRegisterErrors(false);
    setRegisterValidationError("");
  }

  function switchMode(nextMode) {
    onModeChange(nextMode);
    setRegisterStep(1);
    resetRegisterValidation();
  }

  function handleAuthInputChange(event) {
    if (isRegister) {
      resetRegisterValidation();
    }

    onInputChange(event);
  }

  function updateBirthday(nextValue) {
    resetRegisterValidation();
    onInputChange({ target: { name: "birthday", value: nextValue } });
  }

  function goToNextRegisterStep() {
    resetRegisterValidation();

    if (registerStep === 1) {
      if (!String(form.firstName || "").trim()) {
        setRegisterValidationError("Укажи имя.");
        return;
      }

      setRegisterStep(2);
      return;
    }

    if (!String(form.birthday || "").trim()) {
      setRegisterValidationError("Укажи дату рождения.");
      return;
    }

    setRegisterStep(3);
  }

  function goToPreviousRegisterStep() {
    resetRegisterValidation();
    setRegisterStep((prev) => Math.max(1, prev - 1));
  }

  function handleAuthSubmit(event) {
    event?.preventDefault?.();

    if (isRegister && registerStep < 3) {
      goToNextRegisterStep();
      return;
    }

    if (isRegister) {
      setShowRegisterErrors(true);
      setRegisterValidationError("");

      const email = String(form.email || "").trim();
      const password = String(form.password || "");
      if (!email || !password) {
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

  function renderLoginFields() {
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
            autoComplete="current-password"
          />
        </label>
      </>
    );
  }

  function renderPasswordChangeFields() {
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
          Старый пароль
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword || ""}
            onChange={handleAuthInputChange}
            placeholder="Текущий пароль"
            autoComplete="current-password"
          />
        </label>

        <label>
          Новый пароль
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
          Повтори новый пароль
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleAuthInputChange}
            placeholder="Повтори новый пароль"
            autoComplete="new-password"
          />
        </label>
      </>
    );
  }

  const showOauthBlock = Boolean(yandexClientId || googleClientId);
  const kicker = isLogin ? "Вход" : isPasswordChange ? "Восстановить пароль" : "Регистрация";
  const title = isLogin
    ? "Вернуться к своим спискам"
    : isPasswordChange
      ? "Обновить пароль"
      : "Создать аккаунт";
  const subtitle = isLogin
    ? "Открой свои вишлисты и продолжай делиться ими с друзьями."
    : isPasswordChange
      ? "Укажи email, текущий пароль и дважды введи новый пароль."
      : "Создай аккаунт, чтобы собирать желания и получать отдельные ссылки на события.";

  return (
    <>
      <section className="auth-card snap-auth-card">
        <p className="snap-auth-kicker">{kicker}</p>
        <h3 className="snap-auth-title">{title}</h3>
        <p className="auth-subtitle snap-auth-subtitle">{subtitle}</p>

        {isPasswordChange ? (
          <div className="auth-inline-actions">
            <button type="button" className="button-secondary auth-inline-button" onClick={() => switchMode("login")} disabled={submitting}>
              Назад ко входу
            </button>
          </div>
        ) : (
          <div className="auth-switch snap-auth-switch">
            <button type="button" className={isLogin ? "button-primary" : "button-secondary"} onClick={() => switchMode("login")}>
              Вход
            </button>
            <button type="button" className={isRegister ? "button-primary" : "button-secondary"} onClick={() => switchMode("register")}>
              Регистрация
            </button>
          </div>
        )}

        <form className="donation-form auth-form" onSubmit={isRegister ? undefined : handleAuthSubmit}>
          {isRegister ? (
            <>
              <div className="auth-register-progress" aria-label={`Шаг ${registerStep} из 3`}>
                <span className={registerStep >= 1 ? "is-active" : ""} />
                <span className={registerStep >= 2 ? "is-active" : ""} />
                <span className={registerStep >= 3 ? "is-active" : ""} />
              </div>

              <p className="auth-register-step-label">Шаг {registerStep} из 3</p>
              {renderRegisterFields()}
            </>
          ) : isPasswordChange ? (
            renderPasswordChangeFields()
          ) : (
            renderLoginFields()
          )}

          {isRegister && registerValidationError ? <p className="donation-error">{registerValidationError}</p> : null}
          {!isRegister && error ? <p className="donation-error">{error}</p> : null}
          {isRegister && registerStep === 3 && showRegisterErrors && !registerValidationError && error ? (
            <p className="donation-error">{error}</p>
          ) : null}

          <div className={`donation-actions${isRegister ? " auth-register-actions" : " auth-login-actions"}`}>
            {isRegister && registerStep > 1 ? (
              <button type="button" className="button-secondary auth-register-nav-button" onClick={goToPreviousRegisterStep} disabled={submitting}>
                Назад
              </button>
            ) : null}

            {isLogin ? (
              <button type="submit" className="button-primary" disabled={submitting}>
                {submitting ? "Подождите..." : "Войти"}
              </button>
            ) : isRegister ? (
              registerStep < 3 ? (
                <button type="button" className="button-primary" onClick={goToNextRegisterStep} disabled={submitting}>
                  Далее
                </button>
              ) : (
                <button type="button" className="button-primary" onClick={handleRegisterFinalSubmit} disabled={submitting}>
                  {submitting ? "Подождите..." : "Создать аккаунт"}
                </button>
              )
            ) : (
              <button type="submit" className="button-primary" disabled={submitting}>
                {submitting ? "Подождите..." : "Обновить пароль"}
              </button>
            )}
          </div>

          {showOauthBlock ? (
            <div className={`auth-oauth-block${isLogin ? "" : " auth-oauth-block-hidden"}`} aria-hidden={!isLogin}>
              <div className="auth-divider auth-divider-after-submit" aria-hidden="true" />

              <p className="auth-oauth-label">Быстрый вход</p>
              <div className="auth-oauth-row">
                {yandexClientId ? (
                  <button
                    type="button"
                    className="button-secondary auth-oauth-button auth-yandex-button"
                    onClick={onOpenYandexAuth}
                    disabled={!isLogin}
                    tabIndex={isLogin ? 0 : -1}
                    aria-label="Войти через Яндекс ID"
                  >
                    <img className="auth-provider-logo auth-yandex-logo" src={yandexIconSrc} alt="" aria-hidden="true" />
                    <span className="auth-oauth-button-text">Войти через Яндекс ID</span>
                  </button>
                ) : null}

                {googleClientId ? (
                  <div className="auth-google-button-shell">
                    <div className="auth-google-button-visual" aria-hidden="true">
                      <img className="auth-provider-logo auth-google-logo" src={googleIconSrc} alt="" />
                    </div>
                    <div className="auth-google-button-host" ref={googleButtonRef} aria-label="Войти через Google" />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="auth-dismiss-actions">
            {isLogin ? (
              <button type="button" className="auth-dismiss-button" onClick={() => switchMode("password-change")} disabled={submitting}>
                Восстановить пароль
              </button>
            ) : null}

            <button type="button" className="auth-dismiss-button" onClick={onClose} disabled={submitting}>
              Не сейчас
            </button>
          </div>
        </form>
      </section>

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
    </>
  );
}
