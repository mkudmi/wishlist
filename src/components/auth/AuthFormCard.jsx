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
  const isLogin = mode === "login";
  const [registerStep, setRegisterStep] = useState(1);
  const [isBirthdayPickerOpen, setIsBirthdayPickerOpen] = useState(false);
  const [showRegisterErrors, setShowRegisterErrors] = useState(false);
  const [registerValidationError, setRegisterValidationError] = useState("");

  useEffect(() => {
    if (isLogin || registerStep !== 3 || showRegisterErrors || !error) {
      return;
    }

    onErrorReset?.();
  }, [error, isLogin, onErrorReset, registerStep, showRegisterErrors]);

  useEffect(() => {
    if (isOpen) {
      setRegisterStep(1);
      setShowRegisterErrors(false);
      setRegisterValidationError("");
      return;
    }

    if (mode === "login") {
      setRegisterStep(1);
    }
  }, [mode, isOpen]);

  function switchMode(nextMode) {
    onModeChange(nextMode);
    setRegisterStep(1);
    setShowRegisterErrors(false);
    setRegisterValidationError("");
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

  const showOauthBlock = yandexClientId || googleClientId;

  return (
    <>
      <section className="auth-card snap-auth-card">
        <p className="snap-auth-kicker">{isLogin ? "Вход" : "Регистрация"}</p>
        <h3 className="snap-auth-title">{isLogin ? "Вернуться к своим спискам" : "Создать аккаунт"}</h3>
        <p className="auth-subtitle snap-auth-subtitle">
          {isLogin
            ? "Открой свои вишлисты и продолжай делиться ими с друзьями."
            : "Создай аккаунт, чтобы собирать желания и получать отдельные ссылки на события."}
        </p>

        <div className="auth-switch snap-auth-switch">
          <button type="button" className={isLogin ? "button-primary" : "button-secondary"} onClick={() => switchMode("login")}>
            Вход
          </button>
          <button type="button" className={!isLogin ? "button-primary" : "button-secondary"} onClick={() => switchMode("register")}>
            Регистрация
          </button>
        </div>

        <form className="donation-form auth-form" onSubmit={isLogin ? handleAuthSubmit : undefined}>
          {!isLogin ? (
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

          {!isLogin && registerValidationError ? <p className="donation-error">{registerValidationError}</p> : null}
          {isLogin && error ? <p className="donation-error">{error}</p> : null}
          {!isLogin && registerStep === 3 && showRegisterErrors && (registerValidationError || error)
            ? registerValidationError
              ? null
              : <p className="donation-error">{error}</p>
            : null}

          <div className={`donation-actions${isLogin ? " auth-login-actions" : " auth-register-actions"}`}>
            {!isLogin && registerStep > 1 ? (
              <button type="button" className="button-secondary auth-register-nav-button" onClick={goToPreviousRegisterStep} disabled={submitting}>
                Назад
              </button>
            ) : null}

            {isLogin ? (
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
                  <button type="button" className="button-secondary auth-oauth-button auth-yandex-button" onClick={onOpenYandexAuth}>
                    <span className="auth-yandex-logo" aria-hidden="true">
                      Я
                    </span>
                    <span>Войти через Яндекс ID</span>
                  </button>
                ) : null}

                {googleClientId ? <div className="auth-google-button-host" ref={googleButtonRef} aria-label="Войти через Google" /> : null}
              </div>
            </>
          ) : null}

          <button type="button" className="auth-dismiss-button" onClick={onClose} disabled={submitting}>
            Не сейчас
          </button>
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
