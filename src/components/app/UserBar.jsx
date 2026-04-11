import { useEffect, useRef } from "react";

export function UserBar({
  canManage,
  showDashboardLink,
  currentUserName,
  isHeaderMenuOpen,
  onOpenLanding,
  onOpenProfile,
  onToggleHeaderMenu,
  onOpenDashboard,
  onCopyShareLink,
  onOpenWishCreate,
  onLogout
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isHeaderMenuOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      const menuNode = menuRef.current;
      if (!menuNode || menuNode.contains(event.target)) {
        return;
      }
      onToggleHeaderMenu();
    }

    document.addEventListener("pointerdown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
    };
  }, [isHeaderMenuOpen, onToggleHeaderMenu]);

  const backLabel = canManage ? "Вернуться к списку вишлистов" : "Вернуться на главную страницу";
  const handleBack = canManage ? onOpenDashboard : onOpenLanding;

  const isDashboardView = !canManage && !showDashboardLink;
  const userBarClassName = `auth-userbar${canManage ? " auth-userbar-manage" : ""}${isDashboardView ? " auth-userbar-dashboard" : ""}`;

  return (
    <div className={userBarClassName}>
      <div className="auth-userbar-left">
        <button
          type="button"
          className="header-back-button"
          aria-label={backLabel}
          onClick={handleBack}
        >
          <svg
            className="header-back-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M11 5L4 12L11 19" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M5 12H20" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          </svg>
        </button>

        <button type="button" className="app-header-brand" onClick={onOpenLanding} aria-label="Перейти на главную страницу">
          <strong>Список желаний</strong>
        </button>
      </div>

      <div className="auth-userbar-right">
        <div className="header-menu" ref={menuRef}>
          <button type="button" className="burger-button" aria-label="Открыть меню" onClick={onToggleHeaderMenu}>
            <span className="burger-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {isHeaderMenuOpen ? (
            <div className="header-menu-dropdown">
              <button type="button" className="header-menu-item header-menu-item-mobile-home" onClick={onOpenLanding}>
                На главную
              </button>
              <button type="button" className="header-menu-item" onClick={onOpenProfile}>
                Профиль
              </button>
              {canManage ? (
                <button type="button" className="header-menu-item" onClick={onCopyShareLink}>
                  Поделиться ссылкой
                </button>
              ) : null}
              {showDashboardLink ? (
                <button type="button" className="header-menu-item" onClick={onOpenDashboard}>
                  Мои вишлисты
                </button>
              ) : null}
              {canManage ? (
                <button type="button" className="header-menu-item" onClick={onOpenWishCreate}>
                  Добавить подарок
                </button>
              ) : null}
              <button type="button" className="header-menu-item" onClick={onLogout}>
                Выйти
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
