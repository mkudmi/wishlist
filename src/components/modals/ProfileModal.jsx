import { useEffect, useRef, useState } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setIsMenuOpen(false);
      return undefined;
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="profile-modal-head">
          <div className="profile-modal-head-row">
            <h3>Профиль</h3>

            <div className="wishlist-tile-menu profile-modal-menu" ref={menuRef}>
              <button
                type="button"
                className="wishlist-tile-menu-trigger"
                aria-label="Открыть меню профиля"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                disabled={isProfileSubmitting || isAccountDeleting}
              >
                <span />
                <span />
                <span />
              </button>

              {isMenuOpen ? (
                <div className="wishlist-tile-menu-dropdown profile-modal-menu-dropdown">
                  <button
                    type="button"
                    className="wishlist-tile-menu-item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenIdentityModal();
                    }}
                    disabled={isProfileSubmitting || isAccountDeleting}
                  >
                    Способы входа
                  </button>
                  <button
                    type="button"
                    className="wishlist-tile-menu-item wishlist-tile-menu-item-danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleDeleteConfirm();
                    }}
                    disabled={isProfileSubmitting || isAccountDeleting}
                  >
                    Удалить аккаунт
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <p className="donation-modal-title">Редактирование данных аккаунта</p>
        </div>

        <form className="donation-form profile-form" onSubmit={onSubmit}>
          <label>
            <span className="profile-form-label-text">Имя</span>
            <input
              type="text"
              name="firstName"
              value={profileForm.firstName}
              onChange={onInputChange}
              placeholder="Имя"
            />
          </label>

          <label>
            <span className="profile-form-label-text">Фамилия</span>
            <input
              type="text"
              name="lastName"
              value={profileForm.lastName}
              onChange={onInputChange}
              placeholder="Фамилия"
            />
          </label>

          <label>
            <span className="profile-form-label-text">Дата рождения</span>
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

          {isDeleteAccountConfirmOpen ? (
            <div className="account-danger-zone">
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
            </div>
          ) : null}

          {profileError ? <p className="donation-error">{profileError}</p> : null}

          <div className="donation-actions">
            <button type="submit" className="button-primary" disabled={isProfileSubmitting || isAccountDeleting}>
              {isProfileSubmitting ? "Сохраняем..." : "Сохранить"}
            </button>
            <button type="button" className="button-secondary" onClick={onClose} disabled={isProfileSubmitting || isAccountDeleting}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
