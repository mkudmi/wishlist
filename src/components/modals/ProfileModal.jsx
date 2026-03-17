export function ProfileModal({
  isOpen,
  profileForm,
  profileError,
  isProfileSubmitting,
  isAccountDeleting,
  isDeleteAccountConfirmOpen,
  deleteAccountConfirmation,
  onClose,
  onSubmit,
  onInputChange,
  onOpenBirthdayPicker,
  onOpenIdentityModal,
  onToggleDeleteConfirm,
  onDeleteAccountConfirmationChange,
  onDeleteAccount
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal profile-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Профиль</h3>
        <p className="donation-modal-title">Редактирование данных аккаунта</p>

        <form className="donation-form profile-form" onSubmit={onSubmit}>
          <label>
            Имя
            <input
              type="text"
              name="firstName"
              value={profileForm.firstName}
              onChange={onInputChange}
              placeholder="Имя"
            />
          </label>

          <label>
            Фамилия
            <input
              type="text"
              name="lastName"
              value={profileForm.lastName}
              onChange={onInputChange}
              placeholder="Фамилия"
            />
          </label>

          <label>
            Дата рождения
            <input
              type="text"
              name="birthday"
              value={profileForm.birthday}
              onClick={onOpenBirthdayPicker}
              onFocus={onOpenBirthdayPicker}
              placeholder="ДД-ММ-ГГГГ"
              readOnly
              className="birthday-picker-trigger"
            />
          </label>

          <button
            type="button"
            className="button-secondary profile-identities-button"
            onClick={onOpenIdentityModal}
            disabled={isProfileSubmitting || isAccountDeleting}
          >
            Способы входа
          </button>

          <div className="account-danger-zone">
            <button
              type="button"
              className="delete-button"
              onClick={onToggleDeleteConfirm}
              disabled={isProfileSubmitting || isAccountDeleting}
            >
              Удалить аккаунт
            </button>

            {isDeleteAccountConfirmOpen ? (
              <div className="account-danger-confirm">
                <p className="account-danger-text">
                  Аккаунт будет удален полностью вместе с вишлистами, подарками и связанными данными. Для подтверждения введи{" "}
                  <strong>УДАЛИТЬ</strong>.
                </p>
                <input
                  type="text"
                  value={deleteAccountConfirmation}
                  onChange={onDeleteAccountConfirmationChange}
                  placeholder="УДАЛИТЬ"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="delete-button"
                  onClick={onDeleteAccount}
                  disabled={isProfileSubmitting || isAccountDeleting || deleteAccountConfirmation.trim().toUpperCase() !== "УДАЛИТЬ"}
                >
                  {isAccountDeleting ? "Удаляем..." : "Подтвердить удаление"}
                </button>
              </div>
            ) : null}
          </div>

          {profileError ? <p className="donation-error">{profileError}</p> : null}

          <div className="donation-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={isProfileSubmitting || isAccountDeleting}>
              Отмена
            </button>
            <button type="submit" className="button-primary" disabled={isProfileSubmitting || isAccountDeleting}>
              {isProfileSubmitting ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
