export function UserBar({
  canManage,
  showDashboardLink,
  currentUserName,
  isHeaderMenuOpen,
  onOpenProfile,
  onToggleHeaderMenu,
  onOpenDashboard,
  onCopyShareLink,
  onOpenWishCreate,
  onLogout
}) {
  return (
    <div className="auth-userbar">
      {canManage ? (
        <button
          type="button"
          className="header-back-button"
          aria-label="Назад к вишлистам"
          onClick={onOpenDashboard}
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
      ) : null}

      <button type="button" className="auth-userbar-name auth-userbar-name-button" onClick={onOpenProfile}>
        {currentUserName}
      </button>

      <div className="header-menu">
        <button
          type="button"
          className="burger-button"
          aria-label="Открыть меню"
          onClick={onToggleHeaderMenu}
        >
          <span className="burger-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        {isHeaderMenuOpen ? (
          <div className="header-menu-dropdown">
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
  );
}
