export function AuthModal({ isOpen, submitting, modalRef, onClose, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop auth-modal-backdrop snap-auth-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="donation-modal snap-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Вход и регистрация"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-modal-close snap-auth-close" aria-label="Закрыть окно входа" onClick={onClose} disabled={submitting}>
          x
        </button>
        {children}
      </div>
    </div>
  );
}
