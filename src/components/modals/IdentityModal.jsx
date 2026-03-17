export function IdentityModal({
  isOpen,
  currentUser,
  profileError,
  isProfileSubmitting,
  isAccountDeleting,
  isIdentitySubmitting,
  canUnlinkIdentity,
  onClose,
  onStartGoogleLink,
  onStartYandexLink,
  onUnlinkGoogle,
  onUnlinkYandex
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal identity-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Способы входа</h3>
        <p className="donation-modal-title">Подключение удобных способов авторизации</p>

        <div className="account-identity-section">
          <div className="account-identity-row">
            <div>
              <strong>Пароль</strong>
              <p>Обычный вход по email и паролю.</p>
            </div>
            <span className="account-identity-badge">
              {currentUser?.identities?.some((identity) => identity.provider === "password") ? "Подключен" : "Не подключен"}
            </span>
          </div>

          <div className="account-identity-row">
            <div>
              <strong>Google</strong>
              <p>Можно входить через Google без создания нового профиля.</p>
            </div>
            {currentUser?.identities?.some((identity) => identity.provider === "google") ? (
              <button
                type="button"
                className="delete-button account-identity-action account-identity-action-danger"
                onClick={onUnlinkGoogle}
                disabled={isProfileSubmitting || isAccountDeleting || isIdentitySubmitting || !canUnlinkIdentity("google")}
              >
                {isIdentitySubmitting ? "..." : "Отвязать"}
              </button>
            ) : (
              <button
                type="button"
                className="button-secondary account-identity-action"
                onClick={onStartGoogleLink}
                disabled={isProfileSubmitting || isAccountDeleting || isIdentitySubmitting}
              >
                {isIdentitySubmitting ? "Подключаем..." : "Привязать"}
              </button>
            )}
          </div>

          <div className="account-identity-row">
            <div>
              <strong>Яндекс</strong>
              <p>Можно привязать даже если у Яндекса другой email.</p>
            </div>
            {currentUser?.identities?.some((identity) => identity.provider === "yandex") ? (
              <button
                type="button"
                className="delete-button account-identity-action account-identity-action-danger"
                onClick={onUnlinkYandex}
                disabled={isProfileSubmitting || isAccountDeleting || isIdentitySubmitting || !canUnlinkIdentity("yandex")}
              >
                {isIdentitySubmitting ? "..." : "Отвязать"}
              </button>
            ) : (
              <button
                type="button"
                className="button-secondary account-identity-action"
                onClick={onStartYandexLink}
                disabled={isProfileSubmitting || isAccountDeleting || isIdentitySubmitting}
              >
                {isIdentitySubmitting ? "Подключаем..." : "Привязать"}
              </button>
            )}
          </div>
        </div>

        {profileError ? <p className="donation-error">{profileError}</p> : null}

        <div className="donation-actions">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isIdentitySubmitting}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
