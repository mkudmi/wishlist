export function DeleteWishlistModal({ wishlist, isSubmitting, onClose, onConfirm }) {
  if (!wishlist) {
    return null;
  }

  return (
    <div className="donation-modal-backdrop" onClick={onClose}>
      <div className="donation-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Удалить вишлист?</h3>
        <p className="donation-modal-title">
          {`Удалить вишлист "${wishlist.title}"? Это удалит и все подарки внутри.`}
        </p>

        <div className="donation-actions">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
          <button type="button" className="delete-button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}
